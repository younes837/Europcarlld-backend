const sql = require("mssql");
const config = require("../config/dbConfig");

const getSinistre = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT COUNT([Num_Sinistre]) AS TOTAL FROM [AlocproProd].[dbo].[Sinistre]   where YEAR(Date_Sinistre) = YEAR(GETDATE())  and MONTH(Date_Sinistre)= MONTH(GETDATE())"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getSinistre_lastmonth = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT COUNT([Num_Sinistre]) AS TOTAL FROM [AlocproProd].[dbo].[Sinistre] WHERE   (YEAR(Date_Sinistre) = YEAR(GETDATE()) AND MONTH(Date_Sinistre) = MONTH(GETDATE()) - 1)  OR   (MONTH(GETDATE()) = 1 AND YEAR(Date_Sinistre) = YEAR(GETDATE()) - 1 AND MONTH(Date_Sinistre) = 12);"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
  const get_charge_sinistre = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          " SELECT [Num_Sinistre],[Date_Sinistre],[Sinistre_DT_Saisie],[DTCLOT],[Nr_Unite],[Matricule],[Marque_Modele],[Client],[Nature_op],[Type_Acc],[Prestataire],[Expert],[Ville],[DECL],[K250030AGE],[Statut],[Nm_Fact],[F25ULIB],[Valeur_Devis],[Regl_compagnie],[Facture_Repar],[Type]  FROM [AlocproProd].[dbo].[Sinistre]"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };


  
module.exports = {
  getSinistre,
  getSinistre_lastmonth,
  get_charge_sinistre
};
