const sql = require("mssql");
const config = require("../config/dbConfig");

const getachat = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT F090PARC.F090KY as Unite, F061MODINF.K061T03MARQ AS MARQUE, F090PARC.F090LIB as modele,F090PARC.F090SERIE, F090PARC.F090KM, F090PARC.F090DTMISC as DMC, F090INDT AS [DATE ENTREE],K090T07TYP, K090T58POS, F090PARC.F090CGPROP AS ORGANISME, F090PARC.F090ACHPXHT AS achat_prix_ht FROM F090PARC   INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY  INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY   AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)  WHERE F090ACTIF = 1 AND AlocproProd.dbo.F090PARC.K090050CGPRO = 'Marloc'   AND AlocproProd.dbo.F090PARC.K090T27POO = 1  AND AlocproProd.dbo.F091IMMAT.F091IMMA NOT LIKE 'C%'"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
  


  
  
module.exports = {
 getachat
  };
  