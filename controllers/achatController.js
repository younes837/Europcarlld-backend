const sql = require("mssql");
const config = require("../config/dbConfig");

//CONTART A DATE 2022

const getachat = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP (100) PERCENT DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA, dbo.F470ld.F470CONTRAT AS CONTRAT, dbo.F470ld.F470DUREE AS DUREE, dbo.F470ld.F470DTDEP AS DD, dbo.F470ld.F470DTARRP AS DF, dbo.F470ld.F470DTFINPROL AS FIN_PROLONG, dbo.F470ld.F470DTARR AS FIN_REELLE FROM DBO.F470LD INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT = DBO.F400EVT.F400NMDOC INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI = DBO.F090PARC.F090KY INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM = DBO.F091IMMAT.F091KY LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE = DBO.V050TIERS.F050KY LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP = DBO.[VH/CA].F090KY WHERE (DBO.F400EVT.K400T63STATU = '0') AND (dbo.F470ld.F470DTDEP BETWEEN CONVERT(DATETIME, '20250410', 112) AND CONVERT(DATETIME, '20250415', 112) OR (dbo.F470ld.F470DTDEP <= CONVERT(DATETIME, '20250415', 112) AND dbo.F470ld.F470DTFINPROL IS NOT NULL AND dbo.F470ld.F470DTFINPROL >= CONVERT(DATETIME, '20250410', 112))) GROUP BY dbo.F470ld.F470CONTRAT, dbo.F470ld.F470DUREE, dbo.F470ld.F470DTDEP, dbo.F470ld.F470DTARRP, dbo.F470ld.F470DTFINPROL, DBO.F470LD.K470T37ETA, DBO.F470LD.K470050TIE, DBO.F400EVT.F400DEVTT, dbo.F470ld.F470DTARR HAVING ((DBO.F470LD.K470T37ETA = '9') OR (DBO.F470LD.K470T37ETA = '3')) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0) ORDER BY df ASC; "
      );
    res.json({
      total: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};
// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT distinct  TOP (100) PERCENT   (SELECT TOP 1 F901MSG FROM DBO.VT05TYP WHERE F05ZTYPE.K05ZT05TYP = VT05TYP.FT05KY) AS F901MSG ,dbo.F470ld.F470CONTRAT AS CONTRAT, DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA,  dbo.F470ld.F470DUREE AS DUREE, dbo.F470ld.F470DTDEP AS DD, dbo.F470ld.F470DTARRP AS DF, dbo.F470ld.F470DTFINPROL AS FIN_PROLONG, dbo.F470ld.F470DTARR AS FIN_REELLE FROM DBO.F470LD INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT = DBO.F400EVT.F400NMDOC INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI = DBO.F090PARC.F090KY INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM = DBO.F091IMMAT.F091KY LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE = DBO.V050TIERS.F050KY LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP = DBO.[VH/CA].F090KY        INNER JOIN F050TIERS ON DBO.F470LD.K470050TIE=F050TIERS.F050KY        LEFT JOIN DBO.F05ZTYPE ON DBO.F05ZTYPE.K05Z050TIE =DBO.F050TIERS.F050KY INNER JOIN DBO.VT05TYP ON F05ZTYPE.K05ZT05TYP = VT05TYP.FT05KY        WHERE ((f901MSG LIKE '%PUBLIC%') or (f901MSG LIKE '%PRIVEE%')) AND (DBO.F400EVT.K400T63STATU = '0') AND (DBO.F400EVT.K400T63STATU = '0') AND        ((DBO.F470LD.F470DTDEP <= CONVERT(DATETIME, '20221231', 112) AND        (DBO.F470LD.F470DTARRP >= CONVERT(DATETIME, '20220101', 112) OR        (DBO.F470LD.F470DTFINPROL IS NOT NULL AND DBO.F470LD.F470DTFINPROL >= CONVERT(DATETIME, '20220101', 112)))) OR        (DBO.F470LD.F470DTDEP BETWEEN CONVERT(DATETIME, '20220101', 112) AND CONVERT(DATETIME, '20221231', 112))) AND        (dbo.F470ld.F470DTARR IS NULL OR dbo.F470ld.F470DTARR >= CONVERT(DATETIME, '20220101', 112)) GROUP BY DBO.VT05TYP.F901MSG,dbo.F470ld.F470CONTRAT, dbo.F470ld.F470DUREE, dbo.F470ld.F470DTDEP, dbo.F470ld.F470DTARRP, dbo.F470ld.F470DTFINPROL,DBO.F05ZTYPE.K05ZT05TYP, DBO.F470LD.K470T37ETA, DBO.F470LD.K470050TIE, DBO.F400EVT.F400DEVTT, dbo.F470ld.F470DTARR HAVING ((DBO.F470LD.K470T37ETA = '9') OR (DBO.F470LD.K470T37ETA = '3')) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0) ORDER BY df ASC;"
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// const getachat2 = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "
//         select dbo.F470ld.F470CONTRAT AS CONTRAT,
//         "
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT TOP (100) PERCENT DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA, dbo.F470ld.F470CONTRAT AS CONTRAT, dbo.F470ld.F470DUREE AS DUREE, dbo.F470ld.F470DTDEP AS DD, dbo.F470ld.F470DTARRP AS DF, dbo.F470ld.F470DTFINPROL AS FIN_PROLONG, dbo.F470ld.F470DTARR AS FIN_REELLE FROM DBO.F470LD INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT = DBO.F400EVT.F400NMDOC INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI = DBO.F090PARC.F090KY INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM = DBO.F091IMMAT.F091KY LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE = DBO.V050TIERS.F050KY LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP = DBO.[VH/CA].F090KY WHERE (DBO.F400EVT.K400T63STATU = '0') AND ((DBO.F470LD.F470DTDEP <= CONVERT(DATETIME, '20250411', 112) AND (DBO.F470LD.F470DTARRP >= CONVERT(DATETIME, '20250411', 112) OR (DBO.F470LD.F470DTFINPROL IS NOT NULL AND DBO.F470LD.F470DTFINPROL >= CONVERT(DATETIME, '20250411', 112)))) OR (DBO.F470LD.F470DTDEP BETWEEN CONVERT(DATETIME, '20250411', 112) AND CONVERT(DATETIME, '20250411', 112))) AND (dbo.F470ld.F470DTARR IS NULL OR dbo.F470ld.F470DTARR >= CONVERT(DATETIME, '20250411', 112)) GROUP BY dbo.F470ld.F470CONTRAT, dbo.F470ld.F470DUREE, dbo.F470ld.F470DTDEP, dbo.F470ld.F470DTARRP, dbo.F470ld.F470DTFINPROL, DBO.F470LD.K470T37ETA, DBO.F470LD.K470050TIE, DBO.F400EVT.F400DEVTT, dbo.F470ld.F470DTARR HAVING ((DBO.F470LD.K470T37ETA = '9') OR (DBO.F470LD.K470T37ETA = '3')) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0) ORDER BY FIN_REELLE ASC; "
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

//------------------ PUBLIC ---------PRIVEE---------
// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT distinct  TOP (100) PERCENT   (SELECT TOP 1 F901MSG FROM DBO.VT05TYP WHERE F05ZTYPE.K05ZT05TYP = VT05TYP.FT05KY) AS F901MSG ,dbo.F470ld.F470CONTRAT AS CONTRAT, DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA,  dbo.F470ld.F470DUREE AS DUREE, dbo.F470ld.F470DTDEP AS DD, dbo.F470ld.F470DTARRP AS DF, dbo.F470ld.F470DTFINPROL AS FIN_PROLONG, dbo.F470ld.F470DTARR AS FIN_REELLE FROM DBO.F470LD INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT = DBO.F400EVT.F400NMDOC INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI = DBO.F090PARC.F090KY INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM = DBO.F091IMMAT.F091KY LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE = DBO.V050TIERS.F050KY LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP = DBO.[VH/CA].F090KY        INNER JOIN F050TIERS ON DBO.F470LD.K470050TIE=F050TIERS.F050KY        LEFT JOIN DBO.F05ZTYPE ON DBO.F05ZTYPE.K05Z050TIE =DBO.F050TIERS.F050KY INNER JOIN DBO.VT05TYP ON F05ZTYPE.K05ZT05TYP = VT05TYP.FT05KY        WHERE ((f901MSG LIKE '%PUBLIC%') or (f901MSG LIKE '%PRIVEE%')) AND (DBO.F400EVT.K400T63STATU = '0') AND ((DBO.F470LD.F470DTDEP <= CONVERT(DATETIME, '20250411', 112) AND (DBO.F470LD.F470DTARRP >= CONVERT(DATETIME, '20250411', 112) OR (DBO.F470LD.F470DTFINPROL IS NOT NULL AND DBO.F470LD.F470DTFINPROL >= CONVERT(DATETIME, '20250411', 112)))) OR (DBO.F470LD.F470DTDEP BETWEEN CONVERT(DATETIME, '20250411', 112) AND CONVERT(DATETIME, '20250411', 112))) AND (dbo.F470ld.F470DTARR IS NULL OR dbo.F470ld.F470DTARR >= CONVERT(DATETIME, '20250411', 112)) GROUP BY DBO.VT05TYP.F901MSG,dbo.F470ld.F470CONTRAT, dbo.F470ld.F470DUREE, dbo.F470ld.F470DTDEP, dbo.F470ld.F470DTARRP, dbo.F470ld.F470DTFINPROL,DBO.F05ZTYPE.K05ZT05TYP, DBO.F470LD.K470T37ETA, DBO.F470LD.K470050TIE, DBO.F400EVT.F400DEVTT, dbo.F470ld.F470DTARR HAVING ((DBO.F470LD.K470T37ETA = '9') OR (DBO.F470LD.K470T37ETA = '3')) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0) ORDER BY FIN_REELLE ASC; "
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

//----------------------------------------------

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         " SELECT TOP (100) PERCENT DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA, dbo.F470ld.F470CONTRAT AS CONTRAT, dbo.F470ld.F470DUREE AS DUREE, dbo.F470ld.F470DTDEP AS DD, dbo.F470ld.F470DTARRP AS DF, dbo.F470ld.F470DTFINPROL AS FIN_PROLONG, dbo.F470ld.F470DTARR AS FIN_REELLE FROM DBO.F470LD INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT = DBO.F400EVT.F400NMDOC INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI = DBO.F090PARC.F090KY INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM = DBO.F091IMMAT.F091KY LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE = DBO.V050TIERS.F050KY LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP = DBO.[VH/CA].F090KY WHERE (DBO.F400EVT.K400T63STATU = '0') AND ((DBO.F470LD.F470DTDEP <= CONVERT(DATETIME, '20221231', 112) AND (DBO.F470LD.F470DTARRP >= CONVERT(DATETIME, '20220101', 112) OR (DBO.F470LD.F470DTFINPROL IS NOT NULL AND DBO.F470LD.F470DTFINPROL >= CONVERT(DATETIME, '20220101', 112)))) OR (DBO.F470LD.F470DTDEP BETWEEN CONVERT(DATETIME, '20220101', 112) AND CONVERT(DATETIME, '20221231', 112))) AND (dbo.F470ld.F470DTARR >= CONVERT(DATETIME, '20220101', 112)) GROUP BY dbo.F470ld.F470CONTRAT, dbo.F470ld.F470DUREE, dbo.F470ld.F470DTDEP, dbo.F470ld.F470DTARRP, dbo.F470ld.F470DTFINPROL, DBO.F470LD.K470T37ETA, DBO.F470LD.K470050TIE, DBO.F400EVT.F400DEVTT, dbo.F470ld.F470DTARR HAVING ((DBO.F470LD.K470T37ETA = '9') OR (DBO.F470LD.K470T37ETA = '3')) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0) ORDER BY FIN_REELLE ;"
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "Select TOP (100) PERCENT     DBO.F400EVT.F400DEVTT, DBO.F470LD.K470050TIE, DBO.F470LD.K470T37ETA,  dbo.F470ld.F470CONTRAT AS CONTRAT,        dbo.F470ld.F470DUREE AS DUREE,        dbo.F470ld.F470DTDEP AS DD,        dbo.F470ld.F470DTARRP AS DF,        dbo.F470ld.F470DTFINPROL AS FIN_PROLONG       FROM DBO.F470LD         INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT=DBO.F400EVT.F400NMDOC        INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI=DBO.F090PARC.F090KY        INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM=DBO.F091IMMAT.F091KY        LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE=DBO.V050TIERS.F050KY        LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP=DBO.[VH/CA].F090KY        WHERE (DBO.F400EVT.K400T63STATU='0')        AND (          (DBO.F470LD.F470DTDEP<= CONVERT(DATETIME,'20251231',112)          AND (DBO.F470LD.F470DTARRP>= CONVERT(DATETIME,'20250101',112)          OR DBO.F470LD.F470DTFINPROL>= CONVERT(DATETIME,'20250101',112)          OR DBO.F470LD.F470DTARRP >= CONVERT(DATETIME,'20250101',112)          )              )        OR        (DBO.F470LD.F470DTDEP BETWEEN CONVERT(DATETIME,'20250101',112) AND CONVERT(DATETIME,'20251231',112)        ))        GROUP BY dbo.F470ld.F470CONTRAT ,        dbo.F470ld.F470DUREE ,        dbo.F470ld.F470DTDEP,        dbo.F470ld.F470DTARRP ,        dbo.F470ld.F470DTFINPROL  ,DBO.F470LD.K470T37ETA ,DBO.F470LD.K470050TIE,DBO.F400EVT.F400DEVTT   HAVING ((DBO.F470LD.K470T37ETA='3') OR (DBO.F470LD.K470T37ETA='9') ) AND (DBO.F470LD.K470050TIE LIKE 'L%') AND (DBO.F400EVT.F400DEVTT <> 0)        ORDER BY DF               "
//       );
//     res.json({
//       total: result.recordset.length,
//       data: result.recordset,
//     });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

//GET ACHAT
// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "Select DISTINCT TOP (100) PERCENT      DBO.F470LD.K470T37ETA       FROM DBO.F470LD         INNER JOIN DBO.F400EVT ON DBO.F470LD.F470CONTRAT=DBO.F400EVT.F400NMDOC        INNER JOIN DBO.F090PARC ON DBO.F400EVT.K400090UNI=DBO.F090PARC.F090KY        INNER JOIN DBO.F091IMMAT ON DBO.F090PARC.K090091IMM=DBO.F091IMMAT.F091KY        LEFT OUTER JOIN DBO.V050TIERS ON DBO.F470LD.K470050TIE=DBO.V050TIERS.F050KY        LEFT OUTER JOIN DBO.[VH/CA] ON DBO.F090PARC.K090T07TYP=DBO.[VH/CA].F090KY"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT TOP (100) PERCENT * FROM F901MSG  WHERE F901MSG.F901TAB='K4%'"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// const getachat = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.pageSize) || 100;
//     const offset = (page - 1) * pageSize;

//     const sortField = req.query.sortField || "DMC";
//     const sortOrder = req.query.sortOrder || "desc";

//     let whereClause = "";
//     const whereConditions = [];

//     if (req.query.filters) {
//       try {
//         const filters = JSON.parse(req.query.filters);
//         if (filters.length > 0) {
//           const filterConditions = filters.map((filter) => {
//             const { field, operator, value } = filter;
//             // Handle different operators
//             switch (operator) {
//               case "contains":
//                 return `[${field}] LIKE '%${value}%'`;
//               case "equals":
//                 return `[${field}] = '${value}'`;
//               case "startsWith":
//                 return `[${field}] LIKE '${value}%'`;
//               case "endsWith":
//                 return `[${field}] LIKE '%${value}'`;
//               case ">":
//                 return `[${field}] > '${value}'`;
//               case "<":
//                 return `[${field}] < '${value}'`;
//               case ">=":
//                 return `[${field}] >= '${value}'`;
//               case "<=":
//                 return `[${field}] <= '${value}'`;
//               default:
//                 return `[${field}] = '${value}'`;
//             }
//           });

//           whereConditions.push(...filterConditions);
//         }
//       } catch (e) {
//         console.error("Error parsing filters:", e);
//       }
//     }

//     if (whereConditions.length > 0) {
//       whereClause = `WHERE ${whereConditions.join(" AND ")}`;
//     }
//     const countQuery = `
//       FROM F090PARC   INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY  INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY   AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)
//       ${whereClause}
//     `;
//     const total = countQuery.recordset[0].total;

//     const result = await pool
//       .request()
//       .query(
//         ` WITH PaginatedData AS (SELECT ROW_NUMBER() OVER (${orderByClause}) as id,`,
//         "SELECT F090PARC.F090KY as Unite, F061MODINF.K061T03MARQ AS MARQUE, F090PARC.F090LIB as modele,F090PARC.F090SERIE, F090PARC.F090KM, F090PARC.F090DTMISC as DMC, F090INDT AS [DATE ENTREE],K090T07TYP, K090T58POS, F090PARC.F090CGPROP AS ORGANISME, F090PARC.F090ACHPXHT AS achat_prix_ht FROM F090PARC   INNER JOIN AlocproProd.dbo.F091IMMAT ON AlocproProd.dbo.F090PARC.K090091IMM = AlocproProd.dbo.F091IMMAT.F091KY  INNER JOIN AlocproProd.dbo.F061MODINF ON AlocproProd.dbo.F090PARC.K090061MOD = AlocproProd.dbo.F061MODINF.F061KY   AND YEAR(AlocproProd.dbo.F090PARC.F090DTMISC) <= YEAR(AlocproProd.dbo.F091IMMAT.F091IMMADT)  WHERE F090ACTIF = 1 AND AlocproProd.dbo.F090PARC.K090050CGPRO = 'Marloc'   AND AlocproProd.dbo.F090PARC.K090T27POO = 1  AND AlocproProd.dbo.F091IMMAT.F091IMMA NOT LIKE 'C%'"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

module.exports = {
  getachat,
};
