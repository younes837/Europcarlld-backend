const sql = require("mssql");
const config = require("../config/dbConfig");

const getTopClient = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT [Parc] ,[Nom client] ,[LOYER] ,[MARGE] ,CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]  order by MARGE desc"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };

  module.exports = {
  getTopClient
  };
  