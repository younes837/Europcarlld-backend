const sql = require("mssql");
const config = require("../config/dbConfig");

const getTopClientOriginal = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT [Parc] ,[Nom client] ,[LOYER] ,[MARGE] ,CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]  order by MARGE desc"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };

const getTopClient = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Get sorting parameters
    const sortField = req.query.sortField || "MARGE";
    const sortOrder = req.query.sortOrder || "desc";

    // Get client search parameter
    const clientSearch = req.query.clientSearch || "";

    // Build the WHERE clause for filtering
    let whereClause = "";
    const whereConditions = [];

    // Add client search condition if provided
    if (clientSearch) {
      whereConditions.push(`[Nom client] LIKE '%${clientSearch}%'`);
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
      FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
      ${whereClause}
    `;

    const countResult = await pool.request().query(countQuery);

    // Then, get the paginated and sorted data
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY [${sortField}] ${sortOrder}) as id,
          [Parc], [Nom client], [LOYER], [MARGE], CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL
        FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
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

module.exports = {
  getTopClient,
  getTopClientOriginal,
};
