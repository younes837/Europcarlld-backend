const sql = require("mssql");
const config = require("../config/dbConfig");

const get_pneu_consomme = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT    PC.F050NOMPRE AS CLIENT,   PC.Client AS Code,  COUNT(DISTINCT PC.F091IMMA) AS number_of_vehicles, SUM(COALESCE(PP.F410QT, 0)) AS total_pneu_consommé, (SELECT SUM(F470NBPNEUS) FROM [AlocproProd].[dbo].[PARC_CLIENT] PC_sub WHERE PC_sub.Client = PC.Client) AS total_pneu_dotation, SUM(COALESCE(PP.F410MTHT, 0)) AS total_montant,   MIN(PC.DD) AS oldest_contract_date FROM   [AlocproProd].[dbo].[PARC_CLIENT] PC LEFT JOIN [AlocproProd].[dbo].[Pneu_Parc] PP  ON PC.F091IMMA = PP.F091IMMA GROUP BY  PC.F050NOMPRE,  PC.Client;"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const get_pneu_consomme_detail = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT PP.[F090KY] ,PP.[F091IMMA],PC.F050NOMPRE,PC.Client,[F090LIB],[F050NOM],[F410LIB],[F410MTHT],[K410100PRO],[F400NMDOC]     ,[F410QT],[F410VISKM],[F400FACDT]  FROM [AlocproProd].[dbo].[Pneu_Parc] PP   inner join PARC_CLIENT PC on PP.F091IMMA= PC.F091IMMA"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
const get_old_pneu_kms = async (req, res) => {
  try {
    const { nom_client } = req.query; 
    const pool = await sql.connect(config);

    const query = `
        EXEC old_client_pneu @nom_client;
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
const get_0_pneus = async (req, res) => {
  try {
    const { nom_client } = req.query; 
    const pool = await sql.connect(config);

    const query = `
        SELECT 
    PC.Contrat, 
    PC.[F091IMMA], 
    PC.[F050NOMPRE],
    PC.[Client], 
    PC.[Marque/modele] as marque, 
    SUM(PP.[F410QT]) AS Pneu_Consommé,
    PC.F470NBPNEUS as dotation ,
    PC.DD AS date_depart,
    PC.DF AS date_fin,
    parc.F090KM
FROM 
    [AlocproProd].[dbo].[PARC_CLIENT] PC
    inner join F090PARC parc on PC.F090KY= parc.F090KY
left JOIN 
   [Pneu_Parc] pp   ON PC.[F091IMMA] = PP.[F091IMMA]
GROUP BY 
    PC.Contrat, 
    PC.[F091IMMA], 
    PC.[F050NOMPRE], 
    PC.[Client], 
    PC.[Marque/modele], 
    PC.F470NBPNEUS,
    PC.DD,
    PC.DF,parc.F090KM    
    having  SUM(PP.[F410QT]) is null and parc.F090KM >='60000'
ORDER BY date_depart 
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

module.exports = {
  get_pneu_consomme,
  get_pneu_consomme_detail,
  get_old_pneu_kms,
  get_0_pneus
};
