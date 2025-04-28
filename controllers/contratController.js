const sql = require("mssql");
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
          [client], 
          [CONTRAT], 
          [ETAT], 
          [DUREE], 
          [KM], 
          [loyer ht], 
          [loyer ttc], 
          [loyer_global], 
          [marque modele], 
          [IMMA], 
          [VR HT], 
          [ACH_PX_HT], 
          [ACH_PX_TTC], 
          CONVERT(VARCHAR, [Date_Debut],   105) AS [Date_Debut], 
          CONVERT(VARCHAR, [DT ARR Prevue],   105) AS [DT ARR Prevue], 
          CONVERT(VARCHAR, [F470DTFINPROL],   105) AS [F470DTFINPROL]
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

const getMostUsedModels = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query`
      SELECT [marque modele], COUNT(*) as total 
      FROM [AlocproProd].[dbo].[Contrat longue duree] 
      GROUP BY [marque modele] 
      ORDER BY total DESC
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch most used models data" });
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
      .query("SELECT count(*) as totalContrat  FROM PARC_CLIENT");

    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_production_contrat = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(
      `SELECT     TOP (100) PERCENT year(f470dtdep) as Annee, count(f470contrat) as nombreContrats 
        FROM        
          dbo.F570MVT RIGHT OUTER JOIN
          dbo.F470LD LEFT OUTER JOIN
          dbo.client INNER JOIN
          dbo.F050TIERS ON dbo.client.F050KY = dbo.F050TIERS.F050KY ON dbo.F470LD.K470050TIE = dbo.F050TIERS.F050KY ON dbo.F570MVT.F570KY = dbo.F470LD.K470570MVT LEFT OUTER JOIN
          dbo.F091IMMAT INNER JOIN
          dbo.F090PARC ON dbo.F091IMMAT.F091KY = dbo.F090PARC.K090091IMM ON dbo.F570MVT.K570090UNI = dbo.F090PARC.F090KY
      WHERE     (dbo.F470LD.K470T37ETA IN ('9', '3')) AND (dbo.F470LD.K470T05TYP = '1')and (F090PARC.K090T58POS = 'LLD') and F470DTDEP >= '2016-01-01'
      group by year(f470dtdep)
      order by Annee`
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
        `SELECT     TOP (100) PERCENT year(f470dtarr) as Annee, count(f470contrat) as nombreContrats 
        FROM         
          dbo.F570MVT RIGHT OUTER JOIN
          dbo.F470LD LEFT OUTER JOIN
          dbo.client INNER JOIN
          dbo.F050TIERS ON dbo.client.F050KY = dbo.F050TIERS.F050KY ON dbo.F470LD.K470050TIE = dbo.F050TIERS.F050KY ON dbo.F570MVT.F570KY = dbo.F470LD.K470570MVT LEFT OUTER JOIN
          dbo.F091IMMAT INNER JOIN
          dbo.F090PARC ON dbo.F091IMMAT.F091KY = dbo.F090PARC.K090091IMM ON dbo.F570MVT.K570090UNI = dbo.F090PARC.F090KY
        WHERE     (dbo.F470LD.K470T37ETA IN ('9', '3')) AND (dbo.F470LD.K470T05TYP = '1')and (F090PARC.K090T58POS = 'LLD') and F470DTarr >= '2016-01-01'
        group by year(f470dtarr)
        order by Annee`
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

const get_lld_vr = async (req, res) => {
  try {
    // Get query parameters for server-side operations
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const sortField = req.query.sortField || "Date_Debut";
    const sortDirection = req.query.sortDirection || "desc";
    const searchQuery = req.query.searchQuery || "";
    const fromDate = req.query.fromDate || "";
    const toDate = req.query.toDate || "";
    const matricule = req.query.matricule || "";

    // Log received parameters for debugging

    // Calculate offset for pagination
    const offset = page * pageSize;

    // Start building the SQL query
    let baseQuery = `
      WITH VenteVO AS (
        SELECT 
            F091IMMA,
            F400TT AS prix_vente
        FROM 
            F400EVT
        JOIN 
            F091IMMAT ON F400EVT.F400LIB = 'Vente VO - ' + F091IMMAT.F091IMMA
      )
    `;

    // Build WHERE clause - fixed to start with WHERE keyword and valid condition
    let whereClause = `
      WHERE 1=1  -- Base condition that's always true
    `;

    // Add client search condition if search query is provided
    if (searchQuery && searchQuery.trim() !== "") {
      whereClause += `
        AND (TIE.F050NOM + ' ' + TIE.F050PRENOM LIKE '%${searchQuery}%')
      `;
    }
    if (matricule && matricule.trim() !== "") {
      whereClause += `
        AND (F091IMMAT.F091IMMA LIKE '%${matricule}%')
      `;
    }

    // Add date range filter for Date_Debut
    if (fromDate && fromDate.trim() !== "") {
      whereClause += `
        AND F470LD.F470DTDEP >= CONVERT(DATE, '${fromDate.trim()}', 120)
      `;
    }

    if (toDate && toDate.trim() !== "") {
      whereClause += `
        AND F470LD.F470DTDEP <= CONVERT(DATE, '${toDate.trim()}', 120)
      `;
    }

    // Build the main query with ROW_NUMBER for pagination
    let mainQuery = `
      SELECT 
        ROW_NUMBER() OVER(ORDER BY ${sanitizeField(sortField)} ${
      sortDirection === "desc" ? "DESC" : "ASC"
    }) AS RowNum,
        TIE.F050NOM + ' ' + TIE.F050PRENOM AS client,
        F470LD.F470CONTRAT AS CONTRAT,
        CASE WHEN F470LD.K470T37ETA = '3' THEN 'contrat' ELSE 'clos' END AS ETAT,
        F470LD.F470DUREE AS DUREE,
        F470LD.F470KMAFF AS KM,
        F400EVT.F400HT AS [loyer ht],
        F400EVT.F400TT AS [loyer ttc],
        F400EVT.F400HT * F470LD.F470DUREE AS loyer_global,
        F090PARC.F090LIB AS [marque modele],
        F091IMMAT.F091IMMA AS IMMA,
        F470LD.F470VR AS [VR HT],
        F470LD.F470VR * 1.2 AS [VR TTC],
        F090PARC.F090ACHPXHT AS ACH_PX_HT,
        F090PARC.F090ACHPXHT + F090PARC.F090ACHTVA AS ACH_PX_TTC,
        CASE 
            WHEN F090PARC.F090ACHTVA = 0 THEN NULL 
            ELSE (F470LD.F470VR * 1.2) / (F090PARC.F090ACHPXHT + F090PARC.F090ACHTVA)
        END AS [%],

        CONVERT(VARCHAR, F470LD.F470DTDEP,   105) AS Date_Debut, 
        CONVERT(VARCHAR, F470LD.F470DTARRP,   105) AS date_fin,
        CONVERT(VARCHAR, F470LD.F470DTARR,   105) AS fin_reelle,
        vo.prix_vente,
        vo.prix_vente - (F470LD.F470VR * 1.2) AS sessio
      FROM
        F050TIERS AS TIE
        INNER JOIN F470LD ON TIE.F050KY = F470LD.K470050TIE
        INNER JOIN VT37ETA ON F470LD.K470T37ETA = VT37ETA.FT37KY AND VT37ETA.F901LNG = '001'
        INNER JOIN VT46TYP ON F470LD.K470T46TYP = VT46TYP.FT46KY AND VT46TYP.F901LNG = '001'
        INNER JOIN F400EVT ON F470LD.K470400EVTTIE = F400EVT.F400KY
        INNER JOIN F020ADR ON TIE.K050020ADR = F020ADR.F020KY
        LEFT JOIN F090PARC ON F400EVT.K400090UNI = F090PARC.F090KY
        LEFT JOIN F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY
        LEFT JOIN VenteVO vo ON F091IMMAT.F091IMMA = vo.F091IMMA
        LEFT JOIN F050TIERS AS COM ON COM.F050KY = F470LD.K470050COM
        LEFT JOIN F050TIERS AS CON ON CON.F050KY = F470LD.K470050CON
      ${whereClause}
    `;

    // Connect to database
    const pool = await sql.connect(config);

    // Get total count for pagination - USING THE SAME WHERE CLAUSE as data query
    const countQuery = `
      ${baseQuery}
      SELECT COUNT(*) AS totalCount 
      FROM
        F050TIERS AS TIE
        INNER JOIN F470LD ON TIE.F050KY = F470LD.K470050TIE
        INNER JOIN VT37ETA ON F470LD.K470T37ETA = VT37ETA.FT37KY AND VT37ETA.F901LNG = '001'
        INNER JOIN VT46TYP ON F470LD.K470T46TYP = VT46TYP.FT46KY AND VT46TYP.F901LNG = '001'
        INNER JOIN F400EVT ON F470LD.K470400EVTTIE = F400EVT.F400KY
        INNER JOIN F020ADR ON TIE.K050020ADR = F020ADR.F020KY
        LEFT JOIN F090PARC ON F400EVT.K400090UNI = F090PARC.F090KY
        LEFT JOIN F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY
        LEFT JOIN VenteVO vo ON F091IMMAT.F091IMMA = vo.F091IMMA
        LEFT JOIN F050TIERS AS COM ON COM.F050KY = F470LD.K470050COM
        LEFT JOIN F050TIERS AS CON ON CON.F050KY = F470LD.K470050CON
      ${whereClause}
    `;

    const countResult = await pool.request().query(countQuery);
    const totalCount = countResult.recordset[0].totalCount;

    // Add pagination to the query using a nested query approach
    const dataQuery = `
      ${baseQuery}
      SELECT * FROM (
        ${mainQuery}
      ) AS ResultSet
      WHERE RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
    `;

    // Get paginated data
    const result = await pool.request().query(dataQuery);

    // Return the data in the expected format
    res.header("Access-Control-Allow-Origin", "*");
    res.json({
      rows: result.recordset,
      totalCount: totalCount,
    });
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send({ error: err.message });
  }
};

// Helper function to sanitize field names
function sanitizeField(field) {
  // Map frontend field names to actual SQL column names
  const fieldMap = {
    client: "TIE.F050NOM + ' ' + TIE.F050PRENOM",
    CONTRAT: "F470LD.F470CONTRAT",
    ETAT: "CASE WHEN F470LD.K470T37ETA = '3' THEN 'contrat' ELSE 'clos' END",
    DUREE: "F470LD.F470DUREE",
    KM: "F470LD.F470KMAFF",
    "loyer ht": "F400EVT.F400HT",
    "loyer ttc": "F400EVT.F400TT",
    loyer_global: "F400EVT.F400HT * F470LD.F470DUREE",
    "marque modele": "F090PARC.F090LIB",
    IMMA: "F091IMMAT.F091IMMA",
    "VR HT": "F470LD.F470VR",
    "VR TTC": "F470LD.F470VR * 1.2",
    ACH_PX_HT: "F090PARC.F090ACHPXHT",
    ACH_PX_TTC: "F090PARC.F090ACHPXHT + F090PARC.F090ACHTVA",
    "%": "CASE WHEN F090PARC.F090ACHTVA = 0 THEN NULL ELSE (F470LD.F470VR * 1.2) / (F090PARC.F090ACHPXHT + F090PARC.F090ACHTVA) END",
    Date_Debut: "F470LD.F470DTDEP",
    date_fin: "F470LD.F470DTARRP",
    fin_reelle: "F470LD.F470DTARR",
    prix_vente: "vo.prix_vente",
    sessio: "vo.prix_vente - (F470LD.F470VR * 1.2)",
  };

  return fieldMap[field] || field;
}

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
  get_lld_vr,
  getMostUsedModels,
};
