const sql = require("mssql");
const config = require("../config/dbConfig");

const getCountParc =  async (req, res) => {
  

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT COUNT(*) as total FROM [LOCPRO_ALSYS].[dbo].[PARC_000_PARC_ACTIF_A_DATE] WHERE Position ='LLD'"
      );
      
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }


};

const getAllParc = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT * FROM [LOCPRO_ALSYS].[dbo].[PARC_000_PARC_ACTIF_A_DATE] WHERE Position ='LLD'"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };



  
module.exports = {
  getCountParc,
  getAllParc
  
};
