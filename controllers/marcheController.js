const sql = require("mssql");
const config = require("../config/dbConfig");

const getTotalContratMarche = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT F901MSG AS Marche, COUNT(*) AS Nombre_Marches FROM  marche_prive_public GROUP BY  F901MSG;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_loyer_par_marche = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT F901MSG AS Marche, SUM([loyer ht]) AS Total_Loyer_HT, SUM([loyer ttc]) AS Total_Loyer_TTC FROM marche_prive_public GROUP BY F901MSG;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_moyen_duree = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT F901MSG AS Marche,  AVG(DUREE) AS Duree_Moyenne FROM  marche_prive_public GROUP BY F901MSG;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_total_client_marche = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT F901MSG AS Marche, COUNT(DISTINCT code_client) AS Nombre_Clients FROM marche_prive_public GROUP BY F901MSG;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
// Marche Public Methods

// const getContratsParClient = async (req, res) => {
//   try {
//     const months = parseInt(req.query.months, 10) || 3; // Par défaut, 3 mois
//     const pool = await sql.connect(config);
//     const result = await pool.request().input("months", sql.Int, months).query(`
//        SELECT client,code_client, COUNT(CONTRAT) AS nombre_contrats
// FROM marche_prive_public
// WHERE F901MSG = 'MARCHE PUBLIC'
//  AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)  -- Ensures no past dates
// AND [DT ARR Prevue] < DATEADD(MONTH, @months, CAST(GETDATE() AS DATE))
//  GROUP BY client,code_client;
//       `);
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send("Erreur serveur : " + error.message);
//   }
// };

//------------------------------------
const getContratsParClient = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 3;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const clientSearch = req.query.clientSearch || "";
    const sortField = req.query.sortField || "client";
    const sortOrder = req.query.sortOrder || "asc";

    const pool = await sql.connect(config);

    // Base query with ROW_NUMBER for pagination
    let query = `
      WITH BaseData AS (
        SELECT 
          client, 
          code_client, 
          COUNT(CONTRAT) AS nombre_contrats
        FROM marche_prive_public
        WHERE F901MSG = 'MARCHE PUBLIC'
        AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)
        AND [DT ARR Prevue] < DATEADD(MONTH, @months, CAST(GETDATE() AS DATE))
    `;

    // Add client search if provided
    if (clientSearch) {
      query += ` AND client LIKE @clientSearch`;
    }

    // Add GROUP BY
    query += ` GROUP BY client, code_client`;

    // Add sorting and pagination
    query += `
      ),
      SortedData AS (
        SELECT *,
          ROW_NUMBER() OVER (
            ORDER BY 
              ${sortField === "nombre_contrats" ? "nombre_contrats" : "client"} 
              ${sortOrder}
          ) as RowNum
        FROM BaseData
      )
      SELECT client, code_client, nombre_contrats
      FROM SortedData
      WHERE RowNum BETWEEN @startRow AND @endRow
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT client, code_client
        FROM marche_prive_public
        WHERE F901MSG = 'MARCHE PUBLIC'
        AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)
        AND [DT ARR Prevue] < DATEADD(MONTH, @months, CAST(GETDATE() AS DATE))
        ${clientSearch ? ` AND client LIKE @clientSearch` : ""}
        GROUP BY client, code_client
      ) as subquery
    `;

    const startRow = (page - 1) * pageSize + 1;
    const endRow = page * pageSize;

    const result = await pool
      .request()
      .input("months", sql.Int, months)
      .input("clientSearch", sql.NVarChar, `%${clientSearch}%`)
      .input("startRow", sql.Int, startRow)
      .input("endRow", sql.Int, endRow)
      .query(query);

    const countResult = await pool
      .request()
      .input("months", sql.Int, months)
      .input("clientSearch", sql.NVarChar, `%${clientSearch}%`)
      .query(countQuery);

    res.json({
      items: result.recordset,
      total: countResult.recordset[0].total,
    });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};
//------------------------------------

const getAllContratsClient = async (req, res) => {
  try {
    const { code_client, months } = req.params;
    const pool = await sql.connect(config);
    const query = `
      SELECT  client,  CONTRAT,   DUREE,   KM, [marque modele], IMMA, Date_Debut, [DT ARR Prevue] as Date_arrive_prevue
      FROM    marche_prive_public   WHERE F901MSG = 'MARCHE PUBLIC' AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)  
AND [DT ARR Prevue] < DATEADD(MONTH, ${months}, CAST(GETDATE() AS DATE)) AND code_client = @code_client;
    `;
    const result = await pool
      .request()
      .input("code_client", sql.VarChar, code_client)
      .query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};

// Marche Prive methods
const getContratsParClient_prive = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 3; // Par défaut, 3 mois
    const pool = await sql.connect(config);
    const result = await pool.request().input("months", sql.Int, months).query(`
SELECT client,code_client, COUNT(CONTRAT) AS nombre_contrats
FROM marche_prive_public
WHERE F901MSG ='PRIVEE'
 AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)  -- Ensures no past dates
AND [DT ARR Prevue] < DATEADD(MONTH, @months, CAST(GETDATE() AS DATE))
 GROUP BY client,code_client;;
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};

const getAllContratsClient_prive = async (req, res) => {
  try {
    const { code_client, months } = req.params;
    const pool = await sql.connect(config);
    const query = `
    SELECT client,CONTRAT,DUREE,KM,[marque modele],IMMA,Date_Debut,[DT ARR Prevue] as Date_arrive_prevue
FROM  marche_prive_public WHERE F901MSG ='PRIVEE'      AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE) 
AND [DT ARR Prevue] < DATEADD(MONTH, ${months}, CAST(GETDATE() AS DATE)) AND code_client = @code_client;
    `;
    const result = await pool
      .request()
      .input("code_client", sql.VarChar, code_client)
      .query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};
module.exports = {
  getTotalContratMarche,
  get_loyer_par_marche,
  get_moyen_duree,
  get_total_client_marche,
  getContratsParClient,
  getAllContratsClient,
  getContratsParClient_prive,
  getAllContratsClient_prive,
};
