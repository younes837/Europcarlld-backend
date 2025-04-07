const sql = require("mssql");
const config = require("../config/dbConfig");

const get_commande_encours = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(`
        SELECT F080COMM.F080KY, 
          F080COMM.F080DTCOMM, 
          F090PARC.F090LIB, 
          F050TIERSFRS.F050NOM AS Fournisseur, 
          F030AGE.F030LIB, 
          F080COMM.F080ACTIF, 
          F080COMM.F080DTLIVFRS, 
          F030AGE.K030001SOC,
          V03XAGESECT.K03X033SECT, 
          F080COMM.K080030AGE, 
          F080COMM.F080REF, 
          F080COMM.F080LIVPRECLT, 
          F050TIERS.F050NOM AS client, 
          F080COMM.F080DTDISPO, 
          F090PARC.F090OUTDT, 
          F080COMM.K080T87STATU, 
          F082LIGCOM.K082T89LIB, 
          F082LIGCOM.F082QT, 
          F082LIGCOM.F082LIB, 
          F080COMM.F080REFFRS, 
          F400EVT.F400HT, 
          F400EVT.F400TT 
        FROM 
          F080COMM 
          LEFT OUTER JOIN F090PARC ON F080COMM.K080090UNI = F090PARC.F090KY
          LEFT OUTER JOIN F050TIERS AS F050TIERSFRS ON F080COMM.K080050FRS = F050TIERSFRS.F050KY
          LEFT OUTER JOIN F030AGE ON F080COMM.K080030AGE = F030AGE.F030KY
          LEFT OUTER JOIN AlocproProd.dbo.F050TIERS AS F050TIERS ON F080COMM.K080050TIE = F050TIERS.F050KY
          LEFT OUTER JOIN AlocproProd.dbo.F082LIGCOM ON F080COMM.F080KY = F082LIGCOM.K082080COM
          LEFT OUTER JOIN AlocproProd.dbo.F400EVT ON F080COMM.R080400EVT = F400EVT.R400EVT
          INNER JOIN V03XAGESECT ON F030AGE.F030KY = V03XAGESECT.K03X030AGE 
        WHERE  
          F082LIGCOM.K082T89LIB = '0' 
          AND F080COMM.K080T87STATU = 'STAT_1' 
          AND F090PARC.F090OUTDT IS NULL  
          AND F080COMM.F080DTDISPO IS NULL  
          AND V03XAGESECT.K03X033SECT = 'GLOBAL' 
          AND F080COMM.F080ACTIF = '1' 
          AND F080COMM.F080DTCOMM IS NOT NULL 
        ORDER BY 
          Fournisseur
      `);
    
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  get_commande_encours,
};
