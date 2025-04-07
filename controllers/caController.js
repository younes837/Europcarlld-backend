const sql = require("mssql");
const config = require("../config/dbConfig");

const get_ca = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .query(
                `SELECT 
                    YEAR(F400FACDT) AS annee, 
                    MONTH(F400FACDT) AS mois, 
                    SUM(F410MTHT) AS CA 
                 FROM [LOCPRO_ALSYS].[dbo].[F400CA] 
                 WHERE YEAR(F400FACDT) > '2020' 
                 GROUP BY YEAR(F400FACDT), MONTH(F400FACDT) 
                 ORDER BY annee, mois`
            );
        res.json(result.recordset);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { get_ca };
