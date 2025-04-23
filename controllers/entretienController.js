const sql = require("mssql");
const config = require("../config/dbConfig");

const get_entretien_vehicule = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;

    // Define column mapping between frontend and database
    const columnMapping = {
      Contrat: "PARC_CLIENT.[Contrat]",
      NomClient: "PARC_CLIENT.F050NOMPRE",
      Immatriculation: "F091IMMAT.F091IMMA",
      marque: "PARC_CLIENT.[Marque/modele]",
      MontantHT: "F410LIG.F410MTHT",
      LibelleLigne: "F410LIG.F410LIB",
    };

    // Get the sort field from the frontend query, or use the default
    const sortField =
      req.query.sortField && columnMapping[req.query.sortField]
        ? columnMapping[req.query.sortField]
        : "PARC_CLIENT.[Contrat]";
    const sortOrder = req.query.sortOrder || "desc";

    // Get search parameters
    const clientSearch = req.query.clientSearch || "";
    const immatriculationSearch = req.query.immatriculationSearch || "";

    // Build the WHERE clause for filtering
    let whereConditions = [
      "(F400EVT.K400001SOC = '1')",
      "(F400EVT.K400T43TYP = '1')",
      "(F400EVT.K400305TYP = '2')",
      "(F400EVT.K400030AGE >= '')",
      "(F400EVT.K400030AGE <= 'zzzzzzzzzz')",
      "(F410LIG.F410MTHT <> 0.00000000)",
      "(F091IMMAT.F091IMMA IS NOT NULL)",
    ];

    if (clientSearch) {
      whereConditions.push(`PARC_CLIENT.F050NOMPRE LIKE '%${clientSearch}%'`);
    }

    if (immatriculationSearch) {
      whereConditions.push(
        `F091IMMAT.F091IMMA LIKE '%${immatriculationSearch}%'`
      );
    }

    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          const filterConditions = filters.map((filter) => {
            const { field, operator, value } = filter;
            const dbField = columnMapping[field] || field;

            switch (operator) {
              case "contains":
                return `${dbField} LIKE '%${value}%'`;
              case "equals":
                return `${dbField} = '${value}'`;
              case "startsWith":
                return `${dbField} LIKE '${value}%'`;
              case "endsWith":
                return `${dbField} LIKE '%${value}'`;
              case ">":
                return `${dbField} > '${value}'`;
              case "<":
                return `${dbField} < '${value}'`;
              case ">=":
                return `${dbField} >= '${value}'`;
              case "<=":
                return `${dbField} <= '${value}'`;
              default:
                return `${dbField} = '${value}'`;
            }
          });
          whereConditions.push(...filterConditions);
        }
      } catch (e) {
        console.error("Error parsing filters:", e);
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get summary data
    const summaryQuery = `
      SELECT 
        SUM(F410LIG.F410MTHT) as totalMontantHT,
        COUNT(*) as totalEntretiens,
        COUNT(DISTINCT PARC_CLIENT.[Marque/modele]) as uniqueMarques
      FROM dbo.F090PARC AS F090PARC 
      LEFT OUTER JOIN dbo.F091IMMAT AS F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY 
      FULL OUTER JOIN dbo.F410LIG AS F410LIG ON F090PARC.F090KY = F410LIG.K410090UNI 
      FULL OUTER JOIN dbo.REVI 
      INNER JOIN dbo.F400EVT AS F400EVT ON dbo.REVI.F400NMDOC = F400EVT.F400NMDOC 
      ON F410LIG.K410400EVT = F400EVT.F400KY
      right join PARC_CLIENT on F091IMMAT.F091IMMA = PARC_CLIENT.[Matricule]
      ${whereClause}
    `;

    // Get paginated data
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) as id,
          PARC_CLIENT.[Contrat] as Contrat,
          PARC_CLIENT.F050NOMPRE as NomClient,
          F091IMMAT.F091IMMA as Immatriculation,
          PARC_CLIENT.[Marque/modele] as marque,
          F410LIG.F410MTHT as MontantHT,
          F410LIG.F410LIB as LibelleLigne
        FROM dbo.F090PARC AS F090PARC 
        LEFT OUTER JOIN dbo.F091IMMAT AS F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY 
        FULL OUTER JOIN dbo.F410LIG AS F410LIG ON F090PARC.F090KY = F410LIG.K410090UNI 
        FULL OUTER JOIN dbo.REVI 
        INNER JOIN dbo.F400EVT AS F400EVT ON dbo.REVI.F400NMDOC = F400EVT.F400NMDOC 
        ON F410LIG.K410400EVT = F400EVT.F400KY
        right join PARC_CLIENT on F091IMMAT.F091IMMA = PARC_CLIENT.[Matricule]
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `;

    // Execute both queries in parallel
    const [summaryResult, dataResult] = await Promise.all([
      pool.request().query(summaryQuery),
      pool.request().query(dataQuery),
    ]);

    const summary = summaryResult.recordset[0];
    const montantMoyen =
      summary.totalEntretiens > 0
        ? summary.totalMontantHT / summary.totalEntretiens
        : 0;

    res.json({
      items: dataResult.recordset,
      total: summary.totalEntretiens,
      summary: {
        totalMontantHT: summary.totalMontantHT || 0,
        totalEntretiens: summary.totalEntretiens || 0,
        montantMoyen: montantMoyen || 0,
        uniqueMarques: summary.uniqueMarques || 0,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

// const get_all_entretien = async (req, res) => {
//   try {
//     const { nom_client } = req.query;
//     const pool = await sql.connect(config);

//     const query = `
//       select * from All_entretien_client(@nom_client) order by F400FACDT desc ;
//     `;

//     const result = await pool
//       .request()
//       .input("nom_client", sql.VarChar, nom_client)
//       .query(query);

//     res.json(result.recordset);
//   } catch (error) {
//     console.error("Error fetching client data:", error);
//     res.status(500).send("Internal server error");
//   }
// };

const get_all_entretien = async (req, res) => {
  try {
    const {
      nom_client,
      date_debut,
      date_fin,
      page = 1,
      pageSize = 50,
    } = req.query;
    const pool = await sql.connect(config);

    // Calcul de l'offset pour la pagination
    const offset = (page - 1) * pageSize;

    // Construction de la clause WHERE
    let whereConditions = [];
    if (nom_client) {
      whereConditions.push(`F050NOM LIKE '%${nom_client}%'`);
    }
    if (date_debut) {
      whereConditions.push(`F400FACDT >= '${date_debut}'`);
    }
    if (date_fin) {
      whereConditions.push(`F400FACDT <= '${date_fin}'`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Requête pour les données paginées
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY F400FACDT DESC) as id,
          [F050NOM],
          [F090LIB],
          [F091IMMA],
          convert(varchar,F400FACDT,103) as F400FACDT,
          [F400NMDOC],
          [F410LIB],
          [F410MTHT],
          [K410100PRO]
        FROM All_entretien_client(@nom_client)
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `;

    // Requête pour les statistiques
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalEntretiens,
        COUNT(DISTINCT F091IMMA) as uniqueVehiclesCount,
        SUM(F410MTHT) as totalMontant
      FROM All_entretien_client(@nom_client)
      ${whereClause}
    `;

    const [dataResult, summaryResult] = await Promise.all([
      pool
        .request()
        .input("nom_client", sql.VarChar, nom_client || "")
        .query(dataQuery),
      pool
        .request()
        .input("nom_client", sql.VarChar, nom_client || "")
        .query(summaryQuery),
    ]);

    const summary = summaryResult.recordset[0];
    const montantMoyen =
      summary.totalEntretiens > 0
        ? summary.totalMontant / summary.totalEntretiens
        : 0;

    res.json({
      items: dataResult.recordset,
      total: summary.totalEntretiens,
      summary: {
        totalMontant: summary.totalMontant || 0,
        totalEntretiens: summary.totalEntretiens || 0,
        montantMoyen: montantMoyen || 0,
        uniqueVehiclesCount: summary.uniqueVehiclesCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};

const get_entretien_matricule = async (req, res) => {
  try {
    const {
      matricule,
      dateDebut,
      dateFin,
      page = 1,
      pageSize = 50,
    } = req.query;
    const pool = await sql.connect(config);

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // Construction de la clause WHERE de manière sécurisée
    let whereConditions = [];
    const request = pool.request();

    if (matricule && matricule.trim() !== "") {
      whereConditions.push(`F091IMMAT.F091IMMA LIKE @matricule`);
      request.input("matricule", sql.VarChar, `%${matricule}%`);
    }
    if (dateDebut) {
      whereConditions.push(`F400EVT.F400FACDT >= @dateDebut`);
      request.input("dateDebut", sql.Date, dateDebut);
    }
    if (dateFin) {
      whereConditions.push(`F400EVT.F400FACDT <= @dateFin`);
      request.input("dateFin", sql.Date, dateFin);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Requête pour les données paginées
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY F400EVT.F400FACDT DESC) as id,
          F091IMMAT.F091IMMA, 
          F090PARC.F090LIB, 
          F400EVT.F400NMDOC, 
          F410LIG.F410MTHT,
          F410LIG.K410100PRO, 
          F410LIG.F410LIB,
          convert(varchar,F400EVT.F400FACDT,103) as F400FACDT,
          CD.F050NOM
        FROM 
          dbo.F410LIG AS F410LIG 
          INNER JOIN dbo.F090PARC AS F090PARC ON F410LIG.K410090UNI = F090PARC.F090KY 
          LEFT JOIN dbo.F091IMMAT AS F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY 
          INNER JOIN dbo.F400EVT AS F400EVT ON F410LIG.K410400EVT = F400EVT.F400KY
          LEFT JOIN [Contrat_LLD] AS CD ON F091IMMAT.F091IMMA = CD.F091IMMA
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > @offset AND id <= @offsetEnd
    `;

    // Requête pour les statistiques
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalEntretiens,
        COUNT(DISTINCT F091IMMAT.F091IMMA) as uniqueVehiclesCount,
        SUM(F410LIG.F410MTHT) as totalMontant
      FROM 
        dbo.F410LIG AS F410LIG 
        INNER JOIN dbo.F090PARC AS F090PARC ON F410LIG.K410090UNI = F090PARC.F090KY 
        LEFT JOIN dbo.F091IMMAT AS F091IMMAT ON F090PARC.K090091IMM = F091IMMAT.F091KY 
        INNER JOIN dbo.F400EVT AS F400EVT ON F410LIG.K410400EVT = F400EVT.F400KY
        LEFT JOIN [Contrat_LLD] AS CD ON F091IMMAT.F091IMMA = CD.F091IMMA
      ${whereClause}
    `;

    // Ajout des paramètres pour la pagination
    request.input("offset", sql.Int, offset);
    request.input("offsetEnd", sql.Int, offset + parseInt(pageSize));

    // Exécuter les deux requêtes en parallèle
    const [dataResult, summaryResult] = await Promise.all([
      request.query(dataQuery),
      request.query(summaryQuery),
    ]);

    // Traiter les résultats des statistiques
    const summary = summaryResult.recordset[0];
    const montantMoyen =
      summary.totalEntretiens > 0
        ? summary.totalMontant / summary.totalEntretiens
        : 0;

    // Renvoyer les résultats formatés
    res.json({
      items: dataResult.recordset,
      total: summary.totalEntretiens,
      summary: {
        totalMontant: summary.totalMontant || 0,
        totalEntretiens: summary.totalEntretiens || 0,
        montantMoyen: montantMoyen || 0,
        uniqueVehiclesCount: summary.uniqueVehiclesCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching entretien data:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des données d'entretien",
    });
  }
};

module.exports = {
  get_entretien_vehicule,
  get_all_entretien,
  get_entretien_matricule,
};
