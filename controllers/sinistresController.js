const sql = require("mssql");
const config = require("../config/dbConfig");

const getSinistre = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT COUNT([Num_Sinistre]) AS TOTAL FROM [AlocproProd].[dbo].[Sinistre]   where YEAR(Date_Sinistre) = YEAR(GETDATE())  and MONTH(Date_Sinistre)= MONTH(GETDATE())"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getSinistre_lastmonth = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT COUNT([Num_Sinistre]) AS TOTAL FROM [AlocproProd].[dbo].[Sinistre] WHERE   (YEAR(Date_Sinistre) = YEAR(GETDATE()) AND MONTH(Date_Sinistre) = MONTH(GETDATE()) - 1)  OR   (MONTH(GETDATE()) = 1 AND YEAR(Date_Sinistre) = YEAR(GETDATE()) - 1 AND MONTH(Date_Sinistre) = 12);"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};





const get_charge_sinistre = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;
    const includeStats = req.query.includeStats === 'true';

    // Define column mapping between frontend and database
    const columnMapping = {
      Num_Sinistre: "Sinistre.[Num_Sinistre]",
      Date_Sinistre: "Sinistre.[Date_Sinistre]",
      Sinistre_DT_Saisie: "Sinistre.[Sinistre_DT_Saisie]",
      Matricule: "Sinistre.[Matricule]",
      Marque: "Sinistre.[Marque_Modele]",
      Client: "Sinistre.[Client]",
      Expert: "Sinistre.[Expert]",
      Ville: "Sinistre.[Ville]",
      Nature_op: "Sinistre.[Nature_op]",
      Type_Acc: "Sinistre.[Type_Acc]",
      Nm_Fact: "Sinistre.[Nm_Fact]",
      Valeur_Devis: "Sinistre.[Valeur_Devis]",
      Type: "Sinistre.[Type]"
    };

    // Get the sort field from the frontend query, or use the default
    const sortField = req.query.sortField && columnMapping[req.query.sortField] 
      ? columnMapping[req.query.sortField] 
      : "Sinistre.[Date_Sinistre]";
    const sortOrder = req.query.sortOrder || "desc";

    // Get search parameters
    const clientSearch = req.query.clientSearch || "";
    const dateAfter = req.query.dateAfter;
    const dateBefore = req.query.dateBefore;
    const typeFilter = req.query.typeFilter;

    // Initialize the whereConditions array
    let whereConditions = ["1=1"]; // Always true condition as a starter

    if (clientSearch) {
      whereConditions.push(`Sinistre.[Client] LIKE '%${clientSearch}%'`);
    }

    if (dateAfter) {
      whereConditions.push(`Sinistre.[Date_Sinistre] >= '${dateAfter}'`);
    }

    if (dateBefore) {
      whereConditions.push(`Sinistre.[Date_Sinistre] <= '${dateBefore}'`);
    }

    if (typeFilter) {
      whereConditions.push(`Sinistre.[Type_Acc] = '${typeFilter}'`);
    }

    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          const filterConditions = filters.map((filter) => {
            const { field, operator, value } = filter;
            const dbField = columnMapping[field] || field;
            
            switch (operator) {
              case "contains":
                return `${dbField} LIKE '%${value}%'`;
              case "equals":
                return `${dbField} = '${value}'`;
              case "startsWith":
                return `${dbField} LIKE '${value}%'`;
              case "endsWith":
                return `${dbField} LIKE '%${value}'`;
              case ">":
                return `${dbField} > '${value}'`;
              case "<":
                return `${dbField} < '${value}'`;
              case ">=":
                return `${dbField} >= '${value}'`;
              case "<=":
                return `${dbField} <= '${value}'`;
              default:
                return `${dbField} = '${value}'`;
            }
          });
          whereConditions.push(...filterConditions);
        }
      } catch (e) {
        console.error("Error parsing filters:", e);
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}` 
      : "";

    // Queries to execute
    const queries = [
      // Get paginated data
      `WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) as id,
          [Num_Sinistre],
          [Date_Sinistre],
          [Sinistre_DT_Saisie],
          [Matricule],
          [Marque_Modele] as Marque,
          [Client],
          [Expert],
          [Ville],
          [Nature_op],
          [Type_Acc],
          [Nm_Fact],
          [Valeur_Devis],
          [Type]
        FROM [AlocproProd].[dbo].[Sinistre] WITH (NOLOCK)
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}`,

      // Get total count
      `SELECT COUNT(*) as total
      FROM [AlocproProd].[dbo].[Sinistre] WITH (NOLOCK)
      ${whereClause}`
    ];

    // Add statistics queries if requested
    if (includeStats) {
      // Add Type_Acc statistics query
      queries.push(`
        SELECT Type_Acc, COUNT(*) as count
        FROM [AlocproProd].[dbo].[Sinistre] WITH (NOLOCK)
        ${whereClause}
        GROUP BY Type_Acc
        ORDER BY count DESC
      `);

      // Add Nature_op statistics query
      queries.push(`
        SELECT Nature_op, COUNT(*) as count
        FROM [AlocproProd].[dbo].[Sinistre] WITH (NOLOCK)
        ${whereClause}
        GROUP BY Nature_op
        ORDER BY count DESC
      `);
    }

    // Execute all queries in parallel
    const results = await Promise.all(
      queries.map(query => pool.request().query(query))
    );

    // Prepare response
    const response = {
      items: results[0].recordset,
      total: results[1].recordset[0].total
    };

    // Add statistics if they were requested
    if (includeStats) {
      response.stats = {
        typeAccStats: results[2].recordset,
        natureStats: results[3].recordset
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};






// For Type_Acc distribution with filters
const get_sinistres_by_type_acc = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get filter parameters
    const clientSearch = req.query.clientSearch;
    const typeFilter = req.query.typeFilter;
    const dateAfter = req.query.dateAfter;
    const dateBefore = req.query.dateBefore;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : [];

    // Build WHERE clause
    let whereConditions = ["1=1"];

    if (clientSearch) {
      whereConditions.push(`Client LIKE '%${clientSearch}%'`);
    }

    if (typeFilter) {
      whereConditions.push(`Type_Acc = '${typeFilter}'`);
    }

    if (dateAfter) {
      whereConditions.push(`Date_Sinistre >= '${dateAfter}'`);
    }

    if (dateBefore) {
      whereConditions.push(`Date_Sinistre <= '${dateBefore}'`);
    }

    // Add any additional filters
    if (filters.length > 0) {
      filters.forEach((filter) => {
        const { field, operator, value } = filter;
        switch (operator) {
          case "contains":
            whereConditions.push(`${field} LIKE '%${value}%'`);
            break;
          case "equals":
            whereConditions.push(`${field} = '${value}'`);
            break;
          // Add other operators as needed
        }
      });
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      SELECT 
        Type_Acc,
        COUNT(*) as count
      FROM [AlocproProd].[dbo].[Sinistre]
      WHERE ${whereClause}
      GROUP BY Type_Acc
      ORDER BY count DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

// For Nature_op distribution with filters
const get_sinistres_by_nature = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get filter parameters
    const clientSearch = req.query.clientSearch;
    const typeFilter = req.query.typeFilter;
    const dateAfter = req.query.dateAfter;
    const dateBefore = req.query.dateBefore;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : [];

    // Build WHERE clause
    let whereConditions = ["1=1"];

    if (clientSearch) {
      whereConditions.push(`Client LIKE '%${clientSearch}%'`);
    }

    if (typeFilter) {
      whereConditions.push(`Type_Acc = '${typeFilter}'`);
    }

    if (dateAfter) {
      whereConditions.push(`Date_Sinistre >= '${dateAfter}'`);
    }

    if (dateBefore) {
      whereConditions.push(`Date_Sinistre <= '${dateBefore}'`);
    }

    // Add any additional filters
    if (filters.length > 0) {
      filters.forEach((filter) => {
        const { field, operator, value } = filter;
        switch (operator) {
          case "contains":
            whereConditions.push(`${field} LIKE '%${value}%'`);
            break;
          case "equals":
            whereConditions.push(`${field} = '${value}'`);
            break;
          // Add other operators as needed
        }
      });
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      SELECT 
        Nature_op,
        COUNT(*) as count
      FROM [AlocproProd].[dbo].[Sinistre]
      WHERE ${whereClause}
      GROUP BY Nature_op
      ORDER BY count DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

// const get_charge_sinistre = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         " SELECT [Num_Sinistre],[Date_Sinistre],[Sinistre_DT_Saisie],[DTCLOT],[Nr_Unite],[Matricule],[Marque_Modele],[Client],[Nature_op],[Type_Acc],[Prestataire],[Expert],[Ville],[DECL],[K250030AGE],[Statut],[Nm_Fact],[F25ULIB],[Valeur_Devis],[Regl_compagnie],[Facture_Repar],[Type]  FROM [AlocproProd].[dbo].[Sinistre]"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

module.exports = {
  getSinistre,
  getSinistre_lastmonth,
  get_charge_sinistre,
  get_sinistres_by_nature,
  get_sinistres_by_type_acc,
};
