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

const getContratsParClient = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 3; // Par défaut, 3 mois
    const pool = await sql.connect(config);
    const result = await pool.request().input("months", sql.Int, months).query(`
       SELECT client,code_client, COUNT(CONTRAT) AS nombre_contrats
FROM marche_prive_public
WHERE F901MSG = 'MARCHE PUBLIC'
 AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)  -- Ensures no past dates
AND [DT ARR Prevue] < DATEADD(MONTH, @months, CAST(GETDATE() AS DATE))
 GROUP BY client,code_client;
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};

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
      .request().input("code_client", sql.VarChar, code_client).query(query);
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
      .request().input("code_client", sql.VarChar, code_client).query(query);
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
  getAllContratsClient_prive
};
