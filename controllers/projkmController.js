const sql = require("mssql");
const config = require("../config/dbConfig");

const get_km_projection = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        EXEC dbo.ObtenirKilometrageContrat `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
const get_vidange_projection = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
       SELECT 
    P.F050NOMPRE,
    P.Matricule,
    CAST(F.F090KM AS DECIMAL(10, 0)) AS DERNIER_KM,
    CAST(P.KM_AFFECT AS DECIMAL(10, 0)) AS KM_AFFECTE,
    CAST(P.DD AS DATE) AS DATE_DEPART,
    CAST(P.DF AS DATE) AS DATE_FIN,
    l.F410VISKM AS km_dernier_vidange, 
    l.F410VISDT AS dernier_vidange, 
   CASE 
  WHEN DATEDIFF(DAY, P.DD, P.DF) > 0 
  THEN CAST(CAST(F.F090KM AS DECIMAL(10, 0)) / NULLIF(DATEDIFF(DAY, P.DD, GETDATE()), 0) AS DECIMAL(10, 0))
  ELSE NULL 
END AS MOYENNE_KM_PAR_JOUR,
    l.F410VISKM + 15000 AS NEXT_VIDANGE_KM,

   
    CASE 
        WHEN (l.F410VISKM + 15000 - F.F090KM) > 0 
             AND (DATEDIFF(DAY, P.DD, P.DF) > 0) 
             AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
        THEN cast((l.F410VISKM + 15000 - F.F090KM) / 
             (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0))  as decimal(10,0))
        ELSE NULL 
    END AS JOURS_RESTANTS,


    CASE 
        WHEN (l.F410VISKM + 15000 - F.F090KM) > 0 
             AND (DATEDIFF(DAY, P.DD, P.DF) > 0) 
             AND (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) > 0
             AND ( (l.F410VISKM + 15000 - F.F090KM) / (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)) ) < 10000  
        THEN DATEADD(DAY, 
            (l.F410VISKM + 15000 - F.F090KM) / 
            (F.F090KM / NULLIF(DATEDIFF(DAY, P.DD, P.DF), 0)), 
            l.F410VISDT
        )
        ELSE NULL 
    END AS NEXT_VIDANGE_DATE

FROM parc_client p
LEFT JOIN F410LIG l ON p.F090KY = l.K410090UNI
INNER JOIN F090PARC F ON P.F090KY = F.F090KY
WHERE l.K410100pro = 'ENT001' 
AND l.F410VISDT = (
    SELECT MAX(F410VISDT) 
    FROM F410LIG l2 
    WHERE l2.K410090UNI = p.F090KY 
    AND l2.K410100pro = 'ENT001'
)
ORDER BY l.F410VISDT DESC;
 `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  get_km_projection,
  get_vidange_projection,
};
