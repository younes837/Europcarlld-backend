const sql = require("mssql");
const config = require("../config/dbConfig");

// Function to get total sold
const getTotalVendu = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("EXEC GetTotalVo");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// Function to get sold vehicles
const getVehiculeVendu = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(`
        SELECT 
          dbo.WW_DEF.F090KY AS [Nr Unite], 
          dbo.WW_DEF.F091IMMA AS Matricule, 
          LEFT(dbo.WW_DEF.F090LIB, CHARINDEX(' ', dbo.WW_DEF.F090LIB + ' ') - 1) AS [Marque], 
          dbo.WW_DEF.F090LIB AS [Marque/Modele],
          F060MOD.[F060DIRECT] as marque ,
          dbo.WW_DEF.F090DTMISC AS DMC,  
          dbo.F400EVT.F400VISKM AS [Dernier Km],
          dbo.F400EVT.F400FACDT AS [Date vente], 
          dbo.F400EVT.F400HT AS [Prix de vente HT],
          dbo.WW_DEF.F090ACHPXHT AS [prix achat HT], 
          F470LD.F470VR AS [VR HT],  
          dbo.F400EVT.F400HT / dbo.WW_DEF.F090ACHPXHT AS [%] 
        FROM   
          dbo.F400EVT 
        INNER JOIN 
         dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY 
         inner join F090PARC on dbo.F400EVT.K400090UNI = F090PARC.F090KY
         inner join F060MOD on  F090PARC.k090060mod =F060MOD.F060KY
         LEFT JOIN dbo.F470LD AS F470LD  ON F090PARC.F090KY = F470LD.F470CONTRAT
        WHERE  
          (dbo.F400EVT.K400T44TYP = 'VM') 
        ORDER BY 
          [Marque/Modele]
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// New function to get VR data
const getVR = async (req, res) => {
  try {
    const { months } = req.query;

    if (!months || isNaN(months) || months <= 0) {
      return res.status(400).send("Invalid months parameter");
    }

    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("months", sql.Int, months)
      .query(`
        SELECT 
          dbo.WW_DEF.F090LIB AS [Marque], 
          CAST(SUM(dbo.WW_DEF.PRIX_TTC) AS INT) AS [Somme de PRIX_TTC], 
          CAST(SUM(dbo.F400EVT.F400TT) AS INT) AS [Somme de Prix de vente TTC], 
          CAST(SUM(dbo.F400EVT.F400TT) / SUM(dbo.WW_DEF.PRIX_TTC) * 100 AS INT) AS [Pourcentage],
          COUNT(dbo.WW_DEF.F091IMMA) AS [Nombre de Matricule], 
          CAST(AVG(DATEDIFF(MONTH, dbo.WW_DEF.F090DTMISC, dbo.F400EVT.F400FACDT)) AS INT) AS [Moyenne de Durée de vie (Mois)],
          CAST(SUM(dbo.F400EVT.F400TT) / NULLIF(COUNT(dbo.WW_DEF.F091IMMA), 0) AS INT) AS [VR]
        FROM 
          dbo.F400EVT 
        INNER JOIN 
          dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY  
        WHERE 
          dbo.F400EVT.K400T44TYP = 'VM' 
          AND dbo.F400EVT.F400FACDT >= DATEADD(MONTH, -@months, GETDATE())
          AND dbo.WW_DEF.F091IMMA NOT IN (
            SELECT Matricule 
            FROM Sinistre 
            WHERE Nature_op IN ('Reforme Technique', 'Reforme Economique')
          )
        GROUP BY 
          dbo.WW_DEF.F090LIB
        ORDER BY 
          dbo.WW_DEF.F090LIB
      `);

    res.json(result.recordset || []);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getTotalVendu,
  getVehiculeVendu,
  getVR,
};
