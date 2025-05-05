const sql = require("mssql");
const config = require("../config/dbConfig");

// Marche Public Methods
const getContratPublicArrive = async (req, res) => {
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

// Marche Prive methods
const getContratPriveArrive = async (req, res) => {
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

// Marche Public Details
const getContratPublicDetails = async (req, res) => {
  try {
    const { code_client } = req.params;
    const { months } = req.query;

    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT  client,  CONTRAT,   DUREE,   KM, [marque modele], IMMA, Date_Debut, [DT ARR Prevue] as Date_arrive_prevue
      FROM    marche_prive_public  
      WHERE F901MSG = 'MARCHE PUBLIC'
      AND code_client = '${code_client}'
      AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE)  -- Ensures no past dates
      AND [DT ARR Prevue] < DATEADD(MONTH, ${months}, CAST(GETDATE() AS DATE))
      `);

    res.json({
      result: result.recordset,
      client_name: result.recordset[0].client,
    });
  } catch (error) {

    res.status(500).send("Erreur serveur : " + error.message);
  }
};

// Marche Prive Details
const getContratPriveDetails = async (req, res) => {
  try {
    const { code_client } = req.params;
    const { months } = req.query;

    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT  client,  CONTRAT,   DUREE,   KM, [marque modele], IMMA, Date_Debut, [DT ARR Prevue] as Date_arrive_prevue
        FROM    marche_prive_public 
        WHERE F901MSG = 'PRIVEE'
        AND code_client = '${code_client}'
        AND [DT ARR Prevue] >= CAST(GETDATE() AS DATE) 
        AND [DT ARR Prevue] < DATEADD(MONTH, ${months}, CAST(GETDATE() AS DATE))
        `);

    res.json({
      result: result.recordset,
      client_name: result.recordset[0].client,
    });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};

module.exports = {
  getContratPublicArrive,
  getContratPriveArrive,
  getContratPublicDetails,
  getContratPriveDetails,
};
