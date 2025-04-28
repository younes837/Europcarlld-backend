const sql = require("mssql");
const config = require("../config/dbConfig");

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT F090PARC.F090KY as Unite, F061MODINF.K061T03MARQ AS MARQUE, F090PARC.F090LIB as modele,F090PARC.F090SERIE, F090PARC.F090KM, F090PARC.F090DTMISC as DMC, F090INDT AS [DATE ENTREE],K090T07TYP, K090T58POS, F090PARC.F090CGPROP AS ORGANISME, F090PARC.F090ACHPXHT AS achat_prix_ht FROM F090PARC   INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY  INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY   AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)  WHERE F090ACTIF = 1 AND AlocproProd.dbo.F090PARC.K090050CGPRO = 'Marloc'   AND AlocproProd.dbo.F090PARC.K090T27POO = 1  AND AlocproProd.dbo.F091IMMAT.F091IMMA NOT LIKE 'C%'"
//       );
//     res.json({
//       total: result.recordset.length,
//       items: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// In your controller file
const getPositions = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT DISTINCT RTRIM(LTRIM(K090T58POS)) as position_value
      FROM F090PARC
      WHERE F090ACTIF = 1 
        AND K090050CGPRO = 'Marloc'
        AND K090T27POO = 1
        AND K090T58POS IS NOT NULL
        AND RTRIM(LTRIM(K090T58POS)) <> ''
      ORDER BY position_value
    `);
    
    res.json({
      items: result.recordset.map(item => ({
        value: item.position_value,
        label: item.position_value
      }))
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: error.message });
  }
};

// Fix the main query for the vehicules endpoint
const getachat = async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 50, 
      sortField, 
      sortOrder, 
      filters,
      dateDebut,
      dateFin,
      marqueSearch,
      position
    } = req.query;

    // Parse page and pageSize to integers
    const pageInt = parseInt(page);
    const pageSizeInt = parseInt(pageSize);
    
    // Parse filters if they exist
    let filterConditions = [];
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        parsedFilters.forEach(filter => {
          if (filter.field && filter.operator && filter.value !== undefined) {
            // Map frontend field names to database field names
            let fieldName;
            
            switch (filter.field) {
              case "Unite": fieldName = "F090PARC.F090KY"; break;
              case "MARQUE": fieldName = "F061MODINF.K061T03MARQ"; break;
              case "modele": fieldName = "F090PARC.F090LIB"; break;
              case "F090SERIE": fieldName = "F090PARC.F090SERIE"; break;
              case "F090KM": fieldName = "F090PARC.F090KM"; break;
              case "DMC": fieldName = "F090PARC.F090DTMISC"; break;
              case "DATE ENTREE": fieldName = "F090INDT"; break;
              case "K090T07TYP": fieldName = "K090T07TYP"; break;
              case "Position": fieldName = "K090T58POS"; break;
              case "ORGANISME": fieldName = "F090PARC.F090CGPROP"; break;
              case "achat_prix_ht": fieldName = "F090PARC.F090ACHPXHT"; break;
              default: fieldName = filter.field;
            }
            
            let value = filter.value;
            
            // Map operators to SQL syntax
            let sqlOperator = '=';
            switch (filter.operator) {
              case 'equals': sqlOperator = '='; break;
              case 'contains': 
                sqlOperator = 'LIKE'; 
                value = `%${value}%`; 
                break;
              case 'startsWith': 
                sqlOperator = 'LIKE'; 
                value = `${value}%`; 
                break;
              case 'endsWith': 
                sqlOperator = 'LIKE'; 
                value = `%${value}`; 
                break;
              case '>': case '<': case '>=': case '<=':
                sqlOperator = filter.operator;
                break;
            }
            
            // Format value based on data type
            if (fieldName === "F090INDT" || fieldName === "F090PARC.F090DTMISC") {
              // For date fields
              filterConditions.push(`${fieldName} ${sqlOperator} '${value}'`);
            } else if (!isNaN(parseFloat(value))) {
              // For numeric fields
              filterConditions.push(`${fieldName} ${sqlOperator} ${value}`);
            } else {
              // For string fields
              filterConditions.push(`${fieldName} ${sqlOperator} '${value}'`);
            }
          }
        });
      } catch (error) {
        console.error("Error parsing filters:", error);
      }
    }
    
    // Add date range filters if provided
    if (dateDebut) {
      filterConditions.push(`F090INDT >= '${dateDebut}'`);
    }
    if (dateFin) {
      filterConditions.push(`F090INDT <= '${dateFin}'`);
    }
    
    // Add marque search if provided
    if (marqueSearch) {
      filterConditions.push(`(F061MODINF.K061T03MARQ LIKE '%${marqueSearch}%' OR F090PARC.F090LIB LIKE '%${marqueSearch}%')`);
    }
    
    // Add position filter if provided
    if (position) {
      filterConditions.push(`RTRIM(LTRIM(K090T58POS)) = '${position}'`);
    }
    
    // Combine all filter conditions
    let whereClause = "F090ACTIF = 1 AND AlocproProd.dbo.F090PARC.K090050CGPRO = 'Marloc' AND AlocproProd.dbo.F090PARC.K090T27POO = 1 AND AlocproProd.dbo.F091IMMAT.F091IMMA NOT LIKE 'C%'";
    if (filterConditions.length > 0) {
      whereClause += ` AND ${filterConditions.join(' AND ')}`;
    }
    
    // Map sortField to database field name
    let dbSortField;
    if (sortField) {
      switch (sortField) {
        case "Unite": dbSortField = "F090PARC.F090KY"; break;
        case "MARQUE": dbSortField = "F061MODINF.K061T03MARQ"; break;
        case "modele": dbSortField = "F090PARC.F090LIB"; break;
        case "F090SERIE": dbSortField = "F090PARC.F090SERIE"; break;
        case "F090KM": dbSortField = "F090PARC.F090KM"; break;
        case "DMC": dbSortField = "F090PARC.F090DTMISC"; break;
        case "DATE ENTREE": dbSortField = "F090INDT"; break;
        case "K090T07TYP": dbSortField = "K090T07TYP"; break;
        case "Position": dbSortField = "K090T58POS"; break;
        case "ORGANISME": dbSortField = "F090PARC.F090CGPROP"; break;
        case "achat_prix_ht": dbSortField = "F090PARC.F090ACHPXHT"; break;
        default: dbSortField = "F090PARC.F090KY";
      }
    } else {
      dbSortField = "F090PARC.F090KY";
    }
    
    // Add sorting
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY ${dbSortField} ${orderDirection}`;
    
    // Build the count query to get total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM F090PARC
      INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY
      INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY
      AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)
      WHERE ${whereClause}
    `;
    
    // Alternative approach for pagination using ROW_NUMBER() instead of OFFSET/FETCH
    const mainQuery = `
      WITH PaginatedData AS (
        SELECT 
          F090PARC.F090KY as Unite, 
          F061MODINF.K061T03MARQ AS MARQUE, 
          F090PARC.F090LIB as modele,
          F090PARC.F090SERIE, 
          F090PARC.F090KM, 
          CONVERT(VARCHAR, F090PARC.F090DTMISC,   105) as DMC, 
          CONVERT(VARCHAR, F090INDT,   105) AS [DATE ENTREE],
          K090T07TYP, 
          RTRIM(LTRIM(K090T58POS)) as Position, 
          F090PARC.F090CGPROP AS ORGANISME, 
          F090PARC.F090ACHPXHT AS achat_prix_ht,
          ROW_NUMBER() OVER (${orderByClause}) as RowNum
        FROM F090PARC
        INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY
        INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY
        AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)
        WHERE ${whereClause}
      )
      SELECT * FROM PaginatedData 
      WHERE RowNum BETWEEN ${(pageInt - 1) * pageSizeInt + 1} AND ${pageInt * pageSizeInt}
    `;
    
    const pool = await sql.connect(config);
    
    // Execute both queries
    const recordset = await pool.request().query(mainQuery);
    const countResult = await pool.request().query(countQuery);
    
    res.json({
      total: countResult.recordset[0].total,
      items: recordset.recordset,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message }); // Return error as JSON
  }
};

module.exports = {
  getachat,
  getPositions,
};
