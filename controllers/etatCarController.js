const sql = require("mssql");
const config = require("../config/dbConfig");

const get_car_dispo = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const matriculeSearch = req.query.matriculeSearch || "";
    const marqueSearch = req.query.marqueSearch || "";
    const sortField = req.query.sortField || "date_depart";
    const sortOrder = req.query.sortOrder || "asc";

    // Build the WHERE clause
    let whereClause = `
      "F090PARC"."K090050PRO"='MARLOC' 
      AND "F090PARC"."F090ACTIF"='1' 
      AND "F570MVT"."F570CLOS"='2' 
      AND "F090PARC"."F090OUTDT" IS NULL 
      AND "F091IMMAT"."F091IMMA" NOT LIKE 'C%' 
      AND "VT58POS"."F901LNG"='001' 
      AND "VT58POS"."F901MSG" LIKE 'Disponible'
    `;

    if (matriculeSearch) {
      whereClause += ` AND "F091IMMAT"."F091IMMA" LIKE '%${matriculeSearch}%'`;
    }
    if (marqueSearch) {
      whereClause += ` AND "F090PARC"."F090LIB" LIKE '%${marqueSearch}%'`;
    }

    // Build the ORDER BY clause
    const validSortFields = {
      date_depart: '"F570MVT"."F570DTDEP"',
      code_agence: '"F570MVT"."K570030DEP"',
      agence: '"Agence_depart"."F030LIB"',
      matricule: '"F091IMMAT"."F091IMMA"',
      marque: '"F090PARC"."F090LIB"',
    };

    const orderByClause = validSortFields[sortField]
      ? `${validSortFields[sortField]} ${sortOrder.toUpperCase()}`
      : '"F570MVT"."F570DTDEP"';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ((("F570MVT" "F570MVT" 
      LEFT OUTER JOIN "F090PARC" "F090PARC" ON "F570MVT"."K570090UNI"="F090PARC"."F090KY")
      LEFT OUTER JOIN "F030AGE" "Agence_depart" ON "F570MVT"."K570030DEP"="Agence_depart"."F030KY")
      LEFT OUTER JOIN "VT58POS" "VT58POS" ON "F570MVT"."K570T58POS"="VT58POS"."FT58KY")
      LEFT OUTER JOIN "F091IMMAT" "F091IMMAT" ON "F090PARC"."K090091IMM"="F091IMMAT"."F091KY"
      WHERE ${whereClause}
    `;

    // Main data query with pagination using ROW_NUMBER()
    const dataQuery = `
      WITH NumberedRows AS (
        SELECT 
          convert(varchar,"F570MVT"."F570DTDEP",103) as date_depart,
          "F570MVT"."K570030DEP" as code_agence,
          "Agence_depart"."F030LIB" as agence,
          "F091IMMAT"."F091IMMA" as matricule,
          "F090PARC"."F090LIB" as marque,
          ROW_NUMBER() OVER (ORDER BY ${orderByClause}) as RowNum
        FROM ((("F570MVT" "F570MVT" 
        LEFT OUTER JOIN "F090PARC" "F090PARC" ON "F570MVT"."K570090UNI"="F090PARC"."F090KY")
        LEFT OUTER JOIN "F030AGE" "Agence_depart" ON "F570MVT"."K570030DEP"="Agence_depart"."F030KY")
        LEFT OUTER JOIN "VT58POS" "VT58POS" ON "F570MVT"."K570T58POS"="VT58POS"."FT58KY")
        LEFT OUTER JOIN "F091IMMAT" "F091IMMAT" ON "F090PARC"."K090091IMM"="F091IMMAT"."F091KY"
        WHERE ${whereClause}
      )
      SELECT *
      FROM NumberedRows
      WHERE RowNum BETWEEN (${
        page - 1
      } * ${pageSize} + 1) AND (${page} * ${pageSize})
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.request().query(countQuery),
      pool.request().query(dataQuery),
    ]);

    res.json({
      items: dataResult.recordset,
      total: countResult.recordset[0].total,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_car_attente = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
    SELECT "F470LD"."F470CONTRAT" as contrat, 
    "F090PARC"."F090LIB" as marque, 
    "F091IMMAT"."F091IMMA" as matricule,
    convert(varchar,"F470LD"."F470DTARRP",103) as date_arrivee, 
    "F050TIERS"."F050NOM" as nom_client,
 "VT37ETA"."F901MSG" as libele, 
 "F050TIERS"."F050KY" as code_client, 
 convert(varchar,"F090PARC"."F090INDT",103) as date_entree, 
 "F470LD"."K470T46TYP" as type,  
 convert(varchar,"F470LD"."F470DTDEP",103) as date_depart  
 FROM   (((("AlocproProd"."dbo"."F470LD" "F470LD" LEFT OUTER JOIN "AlocproProd"."dbo"."F570MVT" "F570MVT"   
 ON "F470LD"."K470570MVT"="F570MVT"."F570KY") LEFT OUTER JOIN "AlocproProd"."dbo"."F050TIERS" "F050TIERS"   
 ON "F470LD"."K470050TIE"="F050TIERS"."F050KY") LEFT OUTER JOIN "AlocproProd"."dbo"."VT37ETA" "VT37ETA"    
 ON "F470LD"."K470T37ETA"="VT37ETA"."FT37KY") LEFT OUTER JOIN "AlocproProd"."dbo"."F090PARC" "F090PARC" 
   ON "F570MVT"."K570090UNI"="F090PARC"."F090KY") LEFT OUTER JOIN "AlocproProd"."dbo"."F091IMMAT" "F091IMMAT"   
   ON "F090PARC"."K090091IMM"="F091IMMAT"."F091KY"
 WHERE  "F091IMMAT"."F091IMMA" NOT  LIKE 'c%' AND ("VT37ETA"."F901MSG" LIKE 'Contrat' 
 OR "VT37ETA"."F901MSG" LIKE 'Préparation - Résa')  AND "F470LD"."K470T46TYP" LIKE '1ATTENTE'  
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};







const get_position_car = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT MS.F901MSG as position,MV.K570T58POS as code , COUNT(*) AS Nombre_Vehicule FROM F570MVT MV INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM WHERE CURRENT_TIMESTAMP between MV.F570DTDEP  AND MV.F570DTARR AND MS.F901LNG = '001' GROUP BY MS.F901MSG,MV.K570T58POS ORDER BY Nombre_Vehicule DESC;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};




const get_all_positions = async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 50, 
      sort = '',
      filter = '',
      search = '',
      code 
    } = req.query;

    const pool = await sql.connect(config);
    const request = pool.request();

    // Base query with ROW_NUMBER() for pagination
    let query = `
      WITH PaginatedData AS (
        SELECT 
          MS.F901MSG as Code_position,
          CONVERT(VARCHAR, MV.[F570DTDEP], 103) as Date_depart,
          CONVERT(VARCHAR, MV.[F570DTARR], 103) as Date_arrivee,
          MV.[F570KMDEP] as Km_depart,
          MV.[K570090UNI] as Code_vehicule,
          PARC.F090LIB as Marque,
          ROW_NUMBER() OVER (`;

    // Add sorting
    const columnMappings = {
      'Code_position': 'MS.F901MSG',
      'Date_depart': 'MV.F570DTDEP',
      'Date_arrivee': 'MV.F570DTARR',
      'Km_depart': 'MV.F570KMDEP',
      'Code_vehicule': 'MV.K570090UNI',
      'Marque': 'PARC.F090LIB'
    };

    if (sort) {
      const [field, direction] = sort.split(':');
      if (field && columnMappings[field]) {
        query += ` ORDER BY ${columnMappings[field]} ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else {
        query += ` ORDER BY MV.F570DTDEP DESC`;
      }
    } else {
      query += ` ORDER BY MV.F570DTDEP DESC`;
    }

    query += `) as RowNum,
          COUNT(*) OVER() as total_count
        FROM F570MVT MV 
        INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY 
        INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM 
        INNER JOIN F090PARC PARC on MV.K570090UNI = PARC.F090KY
        WHERE MV.F570DTDEP < CURRENT_TIMESTAMP 
        AND MV.F570DTARR > CURRENT_TIMESTAMP 
        AND MS.F901LNG = '001'
    `;

    // Add code filter if provided
    if (code) {
      query += ` AND PS.FT58KY = @code`;
      request.input('code', sql.VarChar, code);
    }

    // Add search by marque if provided
    if (search) {
      query += ` AND PARC.F090LIB LIKE @search`;
      request.input('search', sql.VarChar, `%${search}%`);
    }

    // Add filters if provided
    if (filter) {
      const filters = filter.split(',').filter(f => f);
      filters.forEach((filterItem, index) => {
        const [field, operator, value] = filterItem.split(':');
        const paramName = `filter${index}`;
        
        if (field && operator && value && columnMappings[field]) {
          const dbField = columnMappings[field];
          
          switch (operator) {
            case 'contains':
              query += ` AND ${dbField} LIKE @${paramName}`;
              request.input(paramName, sql.VarChar, `%${value}%`);
              break;
            case 'equals':
              query += ` AND ${dbField} = @${paramName}`;
              request.input(paramName, sql.VarChar, value);
              break;
            case 'startsWith':
              query += ` AND ${dbField} LIKE @${paramName}`;
              request.input(paramName, sql.VarChar, `${value}%`);
              break;
            case 'endsWith':
              query += ` AND ${dbField} LIKE @${paramName}`;
              request.input(paramName, sql.VarChar, `%${value}`);
              break;
            case 'isEmpty':
              query += ` AND ${dbField} IS NULL OR ${dbField} = ''`;
              break;
            case 'isNotEmpty':
              query += ` AND ${dbField} IS NOT NULL AND ${dbField} <> ''`;
              break;
            case 'isAnyOf':
              const values = value.split('|');
              query += ` AND ${dbField} IN (${values.map((_, i) => `@${paramName}_${i}`).join(',')})`;
              values.forEach((val, i) => request.input(`${paramName}_${i}`, sql.VarChar, val));
              break;
            // Date and numeric operators
            case 'after':
            case '>':
              query += ` AND ${dbField} > @${paramName}`;
              request.input(paramName, field.includes('Date') ? sql.DateTime : sql.Float, 
                field.includes('Date') ? new Date(value) : parseFloat(value));
              break;
            case 'before':
            case '<':
              query += ` AND ${dbField} < @${paramName}`;
              request.input(paramName, field.includes('Date') ? sql.DateTime : sql.Float,
                field.includes('Date') ? new Date(value) : parseFloat(value));
              break;
          }
        }
      });
    }

    // Close the CTE and add pagination
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    query += `) SELECT * FROM PaginatedData WHERE RowNum > @offset AND RowNum <= @offsetEnd`;
    
    request.input('offset', sql.Int, offset);
    request.input('offsetEnd', sql.Int, offset + parseInt(pageSize));

    const result = await request.query(query);

    // Get total count from the first row
    const totalCount = result.recordset[0]?.total_count || 0;

    res.json({
      items: result.recordset,
      total: totalCount
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(error.message);
  }
};



// const get_all_positions = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT MS.F901MSG as Code_position, MV.[F570DTDEP] as Date_depart,MV.[F570DTARR] as Date_arrivee,MV.[F570KMDEP] as Km_depart,MV.[K570T58POS] as Code_position,MV.[K570090UNI] as Code_vehicule,PARC.F090LIB as Marque FROM F570MVT MV INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM inner join F090PARC PARC on MV.K570090UNI = PARC.F090KY  WHERE MV.F570DTDEP < CURRENT_TIMESTAMP and MV.F570DTARR > CURRENT_TIMESTAMP AND MS.F901LNG ='001' ORDER BY F570DTDEP DESC ;"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

module.exports = {
  get_car_dispo,
  get_car_attente,
  get_position_car,
  get_all_positions,
};
