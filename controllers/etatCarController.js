const sql = require("mssql");
const config = require("../config/dbConfig");

const get_car_dispo = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "exec getCarDispo"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };

  const get_car_attente = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "exec get_vehicule_enattente"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
  
  const get_position_car = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT MS.F901MSG as position,MV.K570T58POS as code , COUNT(*) AS Nombre_Vehicule FROM F570MVT MV INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM WHERE CURRENT_TIMESTAMP between MV.F570DTDEP  AND MV.F570DTARR AND MS.F901LNG = '001' GROUP BY MS.F901MSG,MV.K570T58POS ORDER BY Nombre_Vehicule DESC;"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };

  const get_all_positions = async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 5000 MS.F901MSG, MV.[F570DTDEP],MV.[F570DTARR],MV.[F570KMDEP],MV.[K570T58POS],MV.[K570090UNI],PARC.F090LIB FROM F570MVT MV INNER JOIN FT58POS PS ON MV.K570T58POS = PS.FT58KY INNER JOIN F901MSG MS ON PS.LT58901MSG = MS.F901NUM inner join F090PARC PARC on MV.K570090UNI = PARC.F090KY  WHERE MV.F570DTDEP < CURRENT_TIMESTAMP and MV.F570DTARR > CURRENT_TIMESTAMP AND MS.F901LNG ='001' ORDER BY F570DTDEP DESC ;"
        );
      res.json(result.recordset);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
  
  module.exports = {
    get_car_dispo,
    get_car_attente,
    get_position_car,
    get_all_positions
  };