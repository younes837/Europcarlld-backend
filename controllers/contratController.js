const sql = require("mssql");
const { connectToDatabase } = require("../config/dbConfig");
const config = require("../config/dbConfig");
// const getContratLongueDuree = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT [client], [CONTRAT], [ETAT], [DUREE], [KM], [loyer ht], [loyer ttc], [loyer_global], [marque modele], [IMMA], [VR HT], [ACH_PX_HT], [ACH_PX_TTC], [Date_Debut], [DT ARR Prevue], [F470DTFINPROL] FROM [AlocproProd].[dbo].[Contrat longue duree]"
//       );

//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

const getContratLongueDuree = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;

    // Get sorting parameters
    const sortField = req.query.sortField || "Date_Debut";
    const sortOrder = req.query.sortOrder || "desc";

    // Get client search parameter
    const clientSearch = req.query.clientSearch || "";

    // Build the WHERE clause for filtering
    let whereClause = "";
    const whereConditions = [];

    // Add client search condition if provided
    if (clientSearch) {
      whereConditions.push(`[client] LIKE '%${clientSearch}%'`);
    }

    // Add other filter conditions if available
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          const filterConditions = filters.map((filter) => {
            const { field, operator, value } = filter;
            // Handle different operators
            switch (operator) {
              case "contains":
                return `[${field}] LIKE '%${value}%'`;
              case "equals":
                return `[${field}] = '${value}'`;
              case "startsWith":
                return `[${field}] LIKE '${value}%'`;
              case "endsWith":
                return `[${field}] LIKE '%${value}'`;
              case ">":
                return `[${field}] > '${value}'`;
              case "<":
                return `[${field}] < '${value}'`;
              case ">=":
                return `[${field}] >= '${value}'`;
              case "<=":
                return `[${field}] <= '${value}'`;
              default:
                return `[${field}] = '${value}'`;
            }
          });

          whereConditions.push(...filterConditions);
        }
      } catch (e) {
        console.error("Error parsing filters:", e);
      }
    }

    // Combine all conditions
    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    }

    // First, get the total count with filters applied
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM [AlocproProd].[dbo].[Contrat longue duree]
      ${whereClause}
    `;

    const countResult = await pool.request().query(countQuery);

    // Then, get the paginated and sorted data
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY [${sortField}] ${sortOrder}) as id,
          [client], [CONTRAT], [ETAT], [DUREE], [KM], [loyer ht], [loyer ttc], 
          [loyer_global], [marque modele], [IMMA], [VR HT], [ACH_PX_HT], 
          [ACH_PX_TTC], [Date_Debut], [DT ARR Prevue], [F470DTFINPROL]
        FROM [AlocproProd].[dbo].[Contrat longue duree]
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `;

    const result = await pool.request().query(dataQuery);

    res.json({
      items: result.recordset,
      total: countResult.recordset[0].total,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

const getRevenue = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT CAST(YEAR([Date_Debut]) AS VARCHAR(4)) + '-' + RIGHT('0' + CAST(MONTH([Date_Debut]) AS VARCHAR(2)), 2) AS Periode, SUM([loyer_global]) AS RevenusTotaux FROM [AlocproProd].[dbo].[Contrat longue duree] GROUP BY YEAR([Date_Debut]), MONTH([Date_Debut]) ORDER BY Periode"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const gettop_marque = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 10 LEFT([marque modele], CHARINDEX(' ', [marque modele] + ' ') - 1) AS [Marque],    COUNT(CONTRAT) AS Nombre_Contrats FROM       [AlocproProd].[dbo].[Contrat longue duree] GROUP BY LEFT([marque modele], CHARINDEX(' ', [marque modele] + ' ') - 1) ORDER BY     Nombre_Contrats DESC;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const gettotal_contrat = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT  YEAR(F470DTDEP) AS Annee, DATEPART(QUARTER, F470DTDEP) AS Trimestre,COUNT(F470CONTRAT) AS NombreContrats FROM  [AlocproProd].[dbo].[Contrat_LLD] WHERE F470DTDEP >= '2016-01-01'GROUP BY YEAR(F470DTDEP), DATEPART(QUARTER, F470DTDEP)ORDER BY Annee, Trimestre;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
const get_total_restitution = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT  YEAR(F470DTARR) AS Annee, DATEPART(QUARTER, F470DTARR) AS Trimestre,COUNT(F470CONTRAT) AS NombreContrats FROM  [AlocproProd].[dbo].[Contrat_LLD] WHERE F470DTARR >= '2016-01-01'GROUP BY YEAR(F470DTARR), DATEPART(QUARTER, F470DTARR)ORDER BY Annee, Trimestre;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_contrat_actuelle = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT Count(*) as total_count FROM PARC_CLIENT");

    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_production_contrat = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT  YEAR(F470DTDEP) AS Annee ,COUNT(F470CONTRAT) AS NombreContrats FROM  [AlocproProd].[dbo].[Contrat_LLD] WHERE F470DTDEP >= '2016-01-01'GROUP BY YEAR(F470DTDEP)ORDER BY Annee ;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
const get_restitution_contrat = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT  YEAR(F470DTARR) AS Annee ,COUNT(F470CONTRAT) AS NombreContrats FROM  [AlocproProd].[dbo].[Contrat_LLD] WHERE F470DTARR >= '2016-01-01'GROUP BY YEAR(F470DTARR)ORDER BY Annee ;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_all_productions = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required." });
    }

    // Vérifier si les dates sont bien au format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const pool = await sql.connect(config);
    const query = `
      SELECT F470CONTRAT, F091IMMA, F090LIB, F470DUREE, F470DTDEP, F470DTARRP, F050NOM
      FROM [Contrat_LLD]
      WHERE F470DTDEP BETWEEN @startDate AND @endDate
    `;

    const result = await pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      .query(query);

    res.json(result.recordset);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_all_restitutions = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required." });
    }

    // Vérifier si les dates sont bien au format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const pool = await sql.connect(config);
    const query = `
      SELECT F470CONTRAT, F091IMMA, F090LIB, F470DUREE, F470DTDEP, F470DTARRP, F050NOM
      FROM [Contrat_LLD]
      WHERE F470DTARR BETWEEN @startDate AND @endDate
    `;

    const result = await pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      .query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getContratLongueDuree,
  getRevenue,
  gettop_marque,
  gettotal_contrat,
  get_contrat_actuelle,
  get_total_restitution,
  get_production_contrat,
  get_restitution_contrat,
  get_all_productions,
  get_all_restitutions,
};
