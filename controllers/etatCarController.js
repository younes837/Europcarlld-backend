const sql = require("mssql");
const config = require("../config/dbConfig");






const get_car_dispo = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const matriculeSearch = req.query.matriculeSearch || '';
    const marqueSearch = req.query.marqueSearch || '';
    const sortField = req.query.sortField || 'date_depart';
    const sortOrder = req.query.sortOrder || 'asc';

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
      'date_depart': '"F570MVT"."F570DTDEP"',
      'code_agence': '"F570MVT"."K570030DEP"',
      'agence': '"Agence_depart"."F030LIB"',
      'matricule': '"F091IMMAT"."F091IMMA"',
      'marque': '"F090PARC"."F090LIB"'
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
          "F570MVT"."F570DTDEP" as date_depart,
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
      WHERE RowNum BETWEEN (${page - 1} * ${pageSize} + 1) AND (${page} * ${pageSize})
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.request().query(countQuery),
      pool.request().query(dataQuery)
    ]);

    res.json({
      items: dataResult.recordset,
      total: countResult.recordset[0].total
    });

  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};











const get_car_attente = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("exec get_vehicule_enattente");
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
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 5000 MS.F901MSG, MV.[F570DTDEP],MV.[F570DTARR],MV.[F570KMDEP],MV.[K570T58POS],MV.[K570090UNI],PARC.F090LIB FROM F570MVT MV INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM inner join F090PARC PARC on MV.K570090UNI = PARC.F090KY  WHERE MV.F570DTDEP < CURRENT_TIMESTAMP and MV.F570DTARR > CURRENT_TIMESTAMP AND MS.F901LNG ='001' ORDER BY F570DTDEP DESC ;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  get_car_dispo,
  get_car_attente,
  get_position_car,
  get_all_positions,
};
