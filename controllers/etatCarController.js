const sql = require("mssql");
const config = require("../config/dbConfig");

const get_car_dispo = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;

    const sortField = req.query.sortField || "F091IMMA"; // immatricule
    const sortOrder = req.query.sortOrder || "asc";

    const marqueSearch = req.query.marqueSearch || "";
    const matriculeSearch = req.query.matriculeSearch || "";

    // Build WHERE clause
    const whereConditions = [];

    if (marqueSearch) {
      whereConditions.push(`[F090LIB] LIKE '%${marqueSearch}%'`);
    }

    if (matriculeSearch) {
      whereConditions.push(`[F091IMMA] LIKE '%${matriculeSearch}%'`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT * FROM dbo.getCarDispo()
      ) AS Cars
      ${whereClause}
    `;

    // Data query with pagination
    const dataQuery = `
      WITH CarData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY [${sortField}] ${sortOrder}) as id,
          *
        FROM (
          SELECT * FROM dbo.getCarDispo()
        ) AS RawData
        ${whereClause}
      )
      SELECT *
      FROM CarData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `;

    const countResult = await pool.request().query(countQuery);
    const result = await pool.request().query(dataQuery);

    res.json({
      items: result.recordset,
      total: countResult.recordset[0]?.total || 0,
    });

  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

// const get_car_dispo = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);

//     // 📦 Pagination
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.pageSize) || 100;
//     const offset = (page - 1) * pageSize;

//     // 🔽 Sorting
//     const sortField = req.query.sortField || "date_dispo";
//     const sortOrder = req.query.sortOrder || "asc";

//     // 🔍 Search globale (marque ou modele)
//     const search = req.query.search || "";

//     // 🧱 WHERE clause
//     let whereClause = "";
//     const whereConditions = [];

//     if (search) {
//       whereConditions.push(`([marque] LIKE '%${search}%' OR [modele] LIKE '%${search}%')`);
//     }

//     // 🧪 Filtres dynamiques
//     if (req.query.filters) {
//       try {
//         const filters = JSON.parse(req.query.filters);
//         if (Array.isArray(filters)) {
//           const filterConditions = filters.map(({ field, operator, value }) => {
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
//               case "<":
//               case ">=":
//               case "<=":
//                 return `[${field}] ${operator} '${value}'`;
//               default:
//                 return `[${field}] = '${value}'`;
//             }
//           });

//           whereConditions.push(...filterConditions);
//         }
//       } catch (e) {
//         console.error("Erreur parsing filters:", e);
//       }
//     }

//     if (whereConditions.length > 0) {
//       whereClause = `WHERE ${whereConditions.join(" AND ")}`;
//     }

//     // 🔢 Total
//     const countQuery = `
//       SELECT COUNT(*) as total 
//       FROM [AlocproProd].[dbo].[VoituresDisponibles]
//       ${whereClause}
//     `;

//     const countResult = await pool.request().query(countQuery);

//     // 🚗 Data Query
//     const dataQuery = `
//       WITH PaginatedCars AS (
//         SELECT 
//           ROW_NUMBER() OVER (ORDER BY [${sortField}] ${sortOrder}) as id,
//           [id_voiture], [marque], [modele], [etat], [km], [date_dispo], [prix_jour], [matricule]
//         FROM [AlocproProd].[dbo].[VoituresDisponibles]
//         ${whereClause}
//       )
//       SELECT *
//       FROM PaginatedCars
//       WHERE id > ${offset} AND id <= ${offset + pageSize}
//     `;

//     const result = await pool.request().query(dataQuery);

//     res.json({
//       items: result.recordset,
//       total: countResult.recordset[0].total,
//     });

//   } catch (error) {
//     console.error("Erreur base de données:", error);
//     res.status(500).json({ error: error.message });
//   }
// };



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