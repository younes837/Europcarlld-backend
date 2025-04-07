const sql = require("mssql");
const config = require("../config/dbConfig");

const get_ca_vehicule = async (req, res) => {
    const { immatricule, date_debut, date_fin } = req.query;
    try {
        const pool = await sql.connect(config);

        let query = `
           SELECT [CONTRAT]
      ,[TIERS]
      ,[UNITE]
      ,[F090LIB]
      ,[N_FACTURE]
      ,[DATE_FAC]
      ,[HT]
      ,[TTC]
      ,[F091IMMA]
      ,[F570DTDEP]
      ,[F570DTARR]
      ,[PRIX_ACHAT]
      ,[F090DTMISC]
  FROM [LOCPRO_ALSYS].[dbo].[ca_voiture]
            WHERE 1=1
        `;

        // Add filters dynamically
        if (immatricule) {
            query += " AND [F091IMMA] = @immatricule";
        }
        if (date_debut && date_fin) {
            query += " AND [DATE_FAC] BETWEEN @date_debut AND @date_fin";
        }

        query += " ORDER BY [DATE_FAC] DESC";

        const request = pool.request();
        if (immatricule) {
            request.input("immatricule", sql.VarChar, immatricule);
        }
        if (date_debut && date_fin) {
            request.input("date_debut", sql.Date, date_debut);
            request.input("date_fin", sql.Date, date_fin);
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { get_ca_vehicule };
