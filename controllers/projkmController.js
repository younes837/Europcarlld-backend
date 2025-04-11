const sql = require("mssql");
const config = require("../config/dbConfig");

const get_km_projection = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        EXEC dbo.ObtenirKilometrageContrat `);

    res.json(result.recordset);
  } catch (error) {
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
      'dernier_vidange': 'l.F410VISDT',
      'km_dernier_vidange': 'l.F410VISKM',
      'F050NOMPRE': 'P.F050NOMPRE',
      'Matricule': 'P.Matricule',
      'DATE_DEPART': 'P.DD',
      'DATE_FIN': 'P.DF',
      'DERNIER_KM': 'F.F090KM',
      'KM_AFFECTE': 'P.KM_AFFECT',
      'MOYENNE_KM_PAR_JOUR': 'MOYENNE_KM_PAR_JOUR',
      'NEXT_VIDANGE_KM': 'NEXT_VIDANGE_KM',
      'NEXT_VIDANGE_DATE': 'NEXT_VIDANGE_DATE',
      'JOURS_RESTANTS': 'JOURS_RESTANTS'
    };
    
    // Default sort field if not provided or not in the map
    const defaultSortField = 'l.F410VISDT';
    const sortField = sortFieldMap[req.query.sortField] || defaultSortField;
    const sortOrder = req.query.sortOrder || 'DESC';
    
    // Get search parameters
    const clientSearch = req.query.clientSearch || '';
    const matriculeSearch = req.query.matriculeSearch || '';
    
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
      pageSize: pageSize
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
