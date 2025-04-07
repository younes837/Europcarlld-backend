const sql = require("mssql");
const config = require("../config/dbConfig");

const get_entretien_vehicule = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
  SELECT DISTINCT TOP (100) PERCENT PARC_CLIENT.[Contrat],PARC_CLIENT.F050NOMPRE, F091IMMAT.F091IMMA, PARC_CLIENT.[Marque/modele] as marque, F410LIG.F410MTHT AS MTHT_REV, 
 F410LIG.F410LIB
FROM         dbo.F090PARC AS F090PARC LEFT OUTER JOIN
                      dbo.F091IMMAT AS F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY FULL OUTER JOIN
                      dbo.F410LIG AS F410LIG ON F090PARC.F090KY = F410LIG.K410090UNI FULL OUTER JOIN
                      dbo.REVI INNER JOIN
                      dbo.F400EVT AS F400EVT ON dbo.REVI.F400NMDOC = F400EVT.F400NMDOC ON F410LIG.K410400EVT = F400EVT.F400KY
                      right join PARC_CLIENT on F091IMMAT.F091IMMA = PARC_CLIENT.[Matricule]
WHERE     (F400EVT.K400001SOC = '1') AND (F400EVT.K400T43TYP = '1') AND (F400EVT.K400305TYP = '2') AND (F400EVT.K400030AGE >= '')
 AND (F400EVT.K400030AGE <= 'zzzzzzzzzz') AND 
                      (F410LIG.F410MTHT <> 0.00000000) AND (F091IMMAT.F091IMMA IS NOT NULL)  

 `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_all_entretien = async (req, res) => {
  try {
    const { nom_client } = req.query;
    const pool = await sql.connect(config);

    const query = `
      select * from All_entretien_client(@nom_client) order by F400FACDT desc ;
    `;

    const result = await pool
      .request()
      .input("nom_client", sql.VarChar, nom_client)
      .query(query);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};

const get_entretien_matricule = async (req, res) => {
  try {
    const { matricule } = req.query;
    const pool = await sql.connect(config);

    const query = `
        SELECT * FROM F091IMMAT WHERE F091IMMA LIKE '%' + @matricule + '%';
    `;

    const result = await pool
      .request()
      .input("matricule", sql.VarChar, matricule)
      .query(query);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching vehicule data:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  get_entretien_vehicule,
  get_all_entretien,
  get_entretien_matricule,
};
