const sql = require("mssql");
const config = require("../config/dbConfig");

// const get_km_projection = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool.request().query(`
//         EXEC dbo.ObtenirKilometrageContrat `);

//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };







// Get KM Projection data with filtering, sorting, and pagination
const get_km_projection = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;
    
    // Define column mapping between frontend and database
    const columnMapping = {
      Nom_Client: "P.F050NOMPRE",
      Matricule: "P.Matricule",
      DERNIER_KM: "CAST(F.F090KM AS DECIMAL(10, 0))",
      KM_AFFECTE: "CAST(L.F470KMAFF AS DECIMAL(10, 0))",
      DATE_DEPART: "L.F470DTDEP",
      DATE_FIN: "L.F470DTARRP",
      JOURS_DEP_DEP: "DATEDIFF(DAY, L.F470DTDEP, GETDATE())",
      JOURS_RESTANTS: "CASE WHEN L.F470DTARRP IS NOT NULL THEN DATEDIFF(DAY, GETDATE(), L.F470DTARRP) ELSE NULL END",
      KM_PAR_JOUR: "CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0))",
      KMS_RESTANT: "DATEDIFF(DAY, F.F090KM, L.F470KMAFF)",
      KMS_FIN_CONTRAT: "DATEDIFF(DAY, L.F470DTDEP, L.F470DTARRP) * CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0))",
      Depassement: `CASE
        WHEN DATEDIFF(DAY, L.F470DTDEP, L.F470DTARRP) * 
          CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0)) > CAST(L.F470KMAFF AS DECIMAL(10, 0))
        THEN 'Dépasse'
        ELSE 'Non Dépasse'
      END`
    };

    // Get the sort field from the frontend query, or use the default if it's invalid
    const sortField = req.query.sortField && columnMapping[req.query.sortField] 
      ? columnMapping[req.query.sortField] 
      : "P.F050NOMPRE";
    const sortOrder = req.query.sortOrder || "asc";
    
    // Get search parameters
    const clientSearch = req.query.clientSearch || '';
    const matriculeSearch = req.query.matriculeSearch || '';
    const depassementFilter = req.query.depassementFilter || '';

    // Build the WHERE clause for filtering
    let whereClause = "";
    const whereConditions = [];

    // Add search conditions
    if (clientSearch) {
      whereConditions.push(`P.F050NOMPRE LIKE '%${clientSearch}%'`);
    }
    if (matriculeSearch) {
      whereConditions.push(`P.Matricule LIKE '%${matriculeSearch}%'`);
    }
    if (depassementFilter) {
      whereConditions.push(`
        CASE
          WHEN DATEDIFF(DAY, L.F470DTDEP, L.F470DTARRP) * 
            CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0)) > CAST(L.F470KMAFF AS DECIMAL(10, 0))
          THEN 'Dépasse'
          ELSE 'Non Dépasse'
        END = '${depassementFilter}'
      `);
    }

    // Process DataGrid filters
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          const filterConditions = filters.map((filter) => {
            const { field, operator, value } = filter;
            
            // Skip empty values
            if (!value && value !== 0) return null;
            
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
                return `${dbField} > ${value}`;
              case "<":
                return `${dbField} < ${value}`;
              case ">=":
                return `${dbField} >= ${value}`;
              case "<=":
                return `${dbField} <= ${value}`;
              case "!=":
                return `${dbField} != '${value}'`;
              default:
                return `${dbField} = '${value}'`;
            }
          }).filter(Boolean); // Remove null values

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

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM F090PARC F
      INNER JOIN PARC_CLIENT P ON F.F090KY = P.Contrat
      INNER JOIN F470LD L ON P.Contrat = L.F470CONTRAT
      ${whereClause}
    `;
    
    const countResult = await pool.request().query(countQuery);

    // Main query with pagination, sorting, and filtering
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT
          P.F050NOMPRE as Nom_Client,
          P.Matricule,
          CAST(F.F090KM AS DECIMAL(10, 0)) AS DERNIER_KM,
          CAST(L.F470KMAFF AS DECIMAL(10, 0)) AS KM_AFFECTE,
          L.F470DTDEP AS DATE_DEPART,
          L.F470DTARRP AS DATE_FIN,
          DATEDIFF(DAY, L.F470DTDEP, GETDATE()) AS JOURS_DEP_DEP,
          CASE 
            WHEN L.F470DTARRP IS NOT NULL 
            THEN DATEDIFF(DAY, GETDATE(), L.F470DTARRP) 
            ELSE NULL 
          END AS JOURS_RESTANTS,
          CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0)) AS KM_PAR_JOUR,
          DATEDIFF(DAY, F.F090KM, L.F470KMAFF) AS KMS_RESTANT,
          DATEDIFF(DAY, L.F470DTDEP, L.F470DTARRP) * 
            CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0)) AS KMS_FIN_CONTRAT,
          CASE
            WHEN DATEDIFF(DAY, L.F470DTDEP, L.F470DTARRP) * 
              CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, L.F470DTDEP, GETDATE()), 0) AS DECIMAL(10, 0)) > CAST(L.F470KMAFF AS DECIMAL(10, 0))
            THEN 'Dépasse'
            ELSE 'Non Dépasse'
          END AS Depassement,
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) AS RowNum
        FROM F090PARC F
        INNER JOIN PARC_CLIENT P ON F.F090KY = P.Contrat
        INNER JOIN F470LD L ON P.Contrat = L.F470CONTRAT
        ${whereClause}
      )
      SELECT * FROM PaginatedData
      WHERE RowNum > ${offset} AND RowNum <= ${offset + pageSize}
    `;
    
    const result = await pool.request().query(dataQuery);
    
    res.json({
      items: result.recordset,
      total: countResult.recordset[0].total
    });
  } catch (error) {
    console.error("SQL Error:", error);
    res.status(500).send(error.message);
  }
};





const get_vidange_projection = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Get sorting parameters
    // Map the frontend field names to the actual column names in the query
    const sortFieldMap = {
      dernier_vidange: "l.F410VISDT",
      km_dernier_vidange: "l.F410VISKM",
      F050NOMPRE: "P.F050NOMPRE",
      Matricule: "P.Matricule",
      DATE_DEPART: "P.DD",
      DATE_FIN: "P.DF",
      DERNIER_KM: "F.F090KM",
      KM_AFFECTE: "P.KM_AFFECT",
      MOYENNE_KM_PAR_JOUR: "MOYENNE_KM_PAR_JOUR",
      NEXT_VIDANGE_KM: "NEXT_VIDANGE_KM",
      NEXT_VIDANGE_DATE: "NEXT_VIDANGE_DATE",
      JOURS_RESTANTS: "JOURS_RESTANTS",
    };

    // Default sort field if not provided or not in the map
    const defaultSortField = "l.F410VISDT";
    const sortField = sortFieldMap[req.query.sortField] || defaultSortField;
    const sortOrder = req.query.sortOrder || "DESC";

    // Get search parameters
    const clientSearch = req.query.clientSearch || "";
    const matriculeSearch = req.query.matriculeSearch || "";

    // Build the WHERE clause for filtering
    let whereClause = "WHERE l.K410100pro = 'ENT001'";

    if (clientSearch) {
      whereClause += ` AND P.F050NOMPRE LIKE '%${clientSearch}%'`;
    }

    if (matriculeSearch) {
      whereClause += ` AND P.Matricule LIKE '%${matriculeSearch}%'`;
    }

    // Get the last vidange date for each vehicle
    const lastVidangeSubquery = `
      AND l.F410VISDT = (
        SELECT MAX(F410VISDT) 
        FROM F410LIG l2 
        WHERE l2.K410090UNI = p.F090KY 
        AND l2.K410100pro = 'ENT001'
      )
    `;

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parc_client p
      LEFT JOIN F410LIG l ON p.F090KY = l.K410090UNI
      INNER JOIN F090PARC F ON P.F090KY = F.F090KY
      ${whereClause}
      ${lastVidangeSubquery}
    `;

    const countResult = await pool.request().query(countQuery);
    const totalRecords = countResult.recordset[0].total;

    // Main query with pagination, sorting, and filtering
    // Using ROW_NUMBER() for pagination instead of OFFSET/FETCH
    const query = `
      WITH PaginatedData AS (
        SELECT 
          P.F050NOMPRE,
          P.Matricule,
          CAST(F.F090KM AS DECIMAL(10, 0)) AS DERNIER_KM,
          CAST(P.KM_AFFECT AS DECIMAL(10, 0)) AS KM_AFFECTE,
          CAST(P.DD AS DATE) AS DATE_DEPART,
          CAST(P.DF AS DATE) AS DATE_FIN,
          l.F410VISKM AS km_dernier_vidange, 
          l.F410VISDT AS dernier_vidange, 
          CASE 
            WHEN DATEDIFF(DAY, P.DD, P.DF) > 0 
            THEN CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, P.DD, GETDATE()), 0) AS DECIMAL(10, 0))
            ELSE NULL 
          END AS MOYENNE_KM_PAR_JOUR,
          l.F410VISKM + 15000 AS NEXT_VIDANGE_KM,
          CASE 
            WHEN (l.F410VISKM + 15000 - F.F090KM) > 0 
                 AND (DATEDIFF(DAY, P.DD, P.DF) > 0) 
                 AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
            THEN cast((l.F410VISKM + 15000 - F.F090KM) / 
                 (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0))  as decimal(10,0))
            ELSE NULL 
          END AS JOURS_RESTANTS,
          CASE 
            WHEN (l.F410VISKM + 15000 - F.F090KM) > 0 
                 AND (DATEDIFF(DAY, P.DD, P.DF) > 0) 
                 AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
                 AND ( (l.F410VISKM + 15000 - F.F090KM) / (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) ) < 10000  
            THEN DATEADD(DAY, 
                (l.F410VISKM + 15000 - F.F090KM) / 
                (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)), 
                l.F410VISDT
            )
            ELSE NULL 
          END AS NEXT_VIDANGE_DATE,
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) AS RowNum
        FROM parc_client p
        LEFT JOIN F410LIG l ON p.F090KY = l.K410090UNI
        INNER JOIN F090PARC F ON P.F090KY = F.F090KY
        ${whereClause}
        ${lastVidangeSubquery}
      )
      SELECT * FROM PaginatedData
      WHERE RowNum > ${offset} AND RowNum <= ${offset + pageSize}
    `;

    const result = await pool.request().query(query);

    // Return paginated data with total count
    res.json({
      items: result.recordset,
      total: totalRecords,
      page: page,
      pageSize: pageSize,
    });
  } catch (error) {
    console.error("Error in get_vidange_projection:", error);
    res.status(500).json({ error: error.message });
  }
};

// const get_vidange_projection = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool.request().query(`
//        SELECT
//     P.F050NOMPRE,
//     P.Matricule,
//     CAST(F.F090KM AS DECIMAL(10, 0)) AS DERNIER_KM,
//     CAST(P.KM_AFFECT AS DECIMAL(10, 0)) AS KM_AFFECTE,
//     CAST(P.DD AS DATE) AS DATE_DEPART,
//     CAST(P.DF AS DATE) AS DATE_FIN,
//     l.F410VISKM AS km_dernier_vidange,
//     l.F410VISDT AS dernier_vidange,
//    CASE
//   WHEN DATEDIFF(DAY, P.DD, P.DF) > 0
//   THEN CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, P.DD, GETDATE()), 0) AS DECIMAL(10, 0))
//   ELSE NULL
// END AS MOYENNE_KM_PAR_JOUR,
//     l.F410VISKM + 15000 AS NEXT_VIDANGE_KM,

//     CASE
//         WHEN (l.F410VISKM + 15000 - F.F090KM) > 0
//              AND (DATEDIFF(DAY, P.DD, P.DF) > 0)
//              AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
//         THEN cast((l.F410VISKM + 15000 - F.F090KM) /
//              (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0))  as decimal(10,0))
//         ELSE NULL
//     END AS JOURS_RESTANTS,

//     CASE
//         WHEN (l.F410VISKM + 15000 - F.F090KM) > 0
//              AND (DATEDIFF(DAY, P.DD, P.DF) > 0)
//              AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
//              AND ( (l.F410VISKM + 15000 - F.F090KM) / (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) ) < 10000
//         THEN DATEADD(DAY,
//             (l.F410VISKM + 15000 - F.F090KM) /
//             (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)),
//             l.F410VISDT
//         )
//         ELSE NULL
//     END AS NEXT_VIDANGE_DATE

// FROM parc_client p
// LEFT JOIN F410LIG l ON p.F090KY = l.K410090UNI
// INNER JOIN F090PARC F ON P.F090KY = F.F090KY
// WHERE l.K410100pro = 'ENT001'
// AND l.F410VISDT = (
//     SELECT MAX(F410VISDT)
//     FROM F410LIG l2
//     WHERE l2.K410090UNI = p.F090KY
//     AND l2.K410100pro = 'ENT001'
// )
// ORDER BY l.F410VISDT DESC;
//  `);

//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

module.exports = {
  get_km_projection,
  get_vidange_projection,
};
