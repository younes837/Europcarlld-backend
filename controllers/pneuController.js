const sql = require("mssql");
const config = require("../config/dbConfig");

const get_pneu_consomme = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Define column mapping between frontend and database
    const columnMapping = {
      CLIENT: "PC.F050NOMPRE",
      number_of_vehicles: "COUNT(DISTINCT PC.F091IMMA)",
      total_pneu_consommé: "SUM(COALESCE(PP.F410QT, 0))",
      total_pneu_dotation:
        "(SELECT SUM(F470NBPNEUS) FROM [AlocproProd].[dbo].[PARC_CLIENT] PC_sub WHERE PC_sub.F050NOMPRE = PC.F050NOMPRE)",
      total_montant: "SUM(COALESCE(PP.F410MTHT, 0))",
      oldest_contract_date: "MIN(PC.DD)",
      consommation_moyenne:
        "CASE WHEN COUNT(DISTINCT PC.F091IMMA) > 0 THEN CAST(SUM(COALESCE(PP.F410QT, 0)) AS FLOAT) / COUNT(DISTINCT PC.F091IMMA) ELSE 0 END",
    };

    // Get the sort field from the frontend query, or use the default if it's invalid
    const sortField =
      req.query.sortField && columnMapping[req.query.sortField]
        ? columnMapping[req.query.sortField]
        : "PC.F050NOMPRE";
    const sortOrder = req.query.sortOrder || "asc";

    // Create request object for parameterized queries
    const request = pool.request();

    // Get search parameters
    const clientSearch = req.query.clientSearch || "";

    // Build the WHERE clause for filtering
    const whereConditions = [];

    // Add search conditions with parameters
    if (clientSearch) {
      request.input('clientSearch', `%${clientSearch}%`);
      whereConditions.push(`PC.F050NOMPRE LIKE @clientSearch`);
    }

    // Process DataGrid filters
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          filters.forEach((filter, index) => {
            const { field, operator, value } = filter;

            // Skip empty values
            if (!value && value !== 0) return;

            const dbField = columnMapping[field] || field;
            const paramName = `filter${index}`;

            switch (operator) {
              case "contains":
                request.input(paramName, `%${value}%`);
                whereConditions.push(`${dbField} LIKE @${paramName}`);
                break;
              case "equals":
                request.input(paramName, value);
                whereConditions.push(`${dbField} = @${paramName}`);
                break;
              case "startsWith":
                request.input(paramName, `${value}%`);
                whereConditions.push(`${dbField} LIKE @${paramName}`);
                break;
              case "endsWith":
                request.input(paramName, `%${value}`);
                whereConditions.push(`${dbField} LIKE @${paramName}`);
                break;
              case ">":
                request.input(paramName, value);
                whereConditions.push(`${dbField} > @${paramName}`);
                break;
              case "<":
                request.input(paramName, value);
                whereConditions.push(`${dbField} < @${paramName}`);
                break;
              case ">=":
                request.input(paramName, value);
                whereConditions.push(`${dbField} >= @${paramName}`);
                break;
              case "<=":
                request.input(paramName, value);
                whereConditions.push(`${dbField} <= @${paramName}`);
                break;
              case "!=":
                request.input(paramName, value);
                whereConditions.push(`${dbField} != @${paramName}`);
                break;
              default:
                request.input(paramName, value);
                whereConditions.push(`${dbField} = @${paramName}`);
            }
          });
        }
      } catch (e) {
        console.error("Error parsing filters:", e);
      }
    }

    // Combine all conditions
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Optimize by combining the count and data queries in one database call
    // This reduces round trips to the database
    const combinedQuery = `
      -- Get total record count for pagination
      SELECT COUNT(DISTINCT PC.F050NOMPRE) as total_records
      FROM [AlocproProd].[dbo].[PARC_CLIENT] PC WITH (NOLOCK)
      LEFT JOIN [AlocproProd].[dbo].[Pneu_Parc] PP WITH (NOLOCK) ON PC.F091IMMA = PP.F091IMMA
      ${whereClause};

      -- Get summary totals
      SELECT 
        COUNT(DISTINCT PC.F050NOMPRE) as total_clients,
        COUNT(DISTINCT PC.F091IMMA) as total_vehicles,
        SUM(COALESCE(PP.F410QT, 0)) as total_pneus_consommes,
        SUM(COALESCE(PC.F470NBPNEUS, 0)) as total_pneus_dotation,
        SUM(COALESCE(PP.F410MTHT, 0)) as total_montant
      FROM [AlocproProd].[dbo].[PARC_CLIENT] PC WITH (NOLOCK)
      LEFT JOIN [AlocproProd].[dbo].[Pneu_Parc] PP WITH (NOLOCK) ON PC.F091IMMA = PP.F091IMMA
      ${whereClause};
      
      -- Get paginated data
      WITH ClientData AS (
        SELECT
          PC.F050NOMPRE AS CLIENT,
          PC.Client AS code,
          COUNT(DISTINCT PC.F091IMMA) AS number_of_vehicles,
          SUM(COALESCE(PP.F410QT, 0)) AS total_pneu_consommé,
          SUM(COALESCE(PC.F470NBPNEUS, 0)) AS total_pneu_dotation,
          SUM(COALESCE(PP.F410MTHT, 0)) AS total_montant,
          MIN(PC.DD) AS oldest_contract_date,
          CASE 
            WHEN COUNT(DISTINCT PC.F091IMMA) > 0 
            THEN CAST(SUM(COALESCE(PP.F410QT, 0)) AS FLOAT) / COUNT(DISTINCT PC.F091IMMA) 
            ELSE 0 
          END AS consommation_moyenne,
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) AS RowNum
        FROM [AlocproProd].[dbo].[PARC_CLIENT] PC WITH (NOLOCK)
        LEFT JOIN [AlocproProd].[dbo].[Pneu_Parc] PP WITH (NOLOCK) ON PC.F091IMMA = PP.F091IMMA
        ${whereClause}
        GROUP BY PC.F050NOMPRE, PC.Client
      )
      SELECT * FROM ClientData
      WHERE RowNum > ${offset} AND RowNum <= ${offset + pageSize}
    `;

    // Execute the combined query
    const result = await request.query(combinedQuery);

    // Extract the different result sets
    const totalRecords = result.recordsets[0][0].total_records;
    const summaryTotals = result.recordsets[1][0];
    const paginatedData = result.recordsets[2];

    res.json({
      items: paginatedData,
      total: totalRecords,
      totals: {
        total_clients: summaryTotals.total_clients || 0,
        total_vehicles: summaryTotals.total_vehicles || 0,
        total_pneus_consommes: summaryTotals.total_pneus_consommes || 0,
        total_pneus_dotation: summaryTotals.total_pneus_dotation || 0,
        total_montant: summaryTotals.total_montant || 0
      }
    });
  } catch (error) {
    console.error("SQL Error:", error);
    res.status(500).send(error.message);
  }
};











const get_pneu_consomme_detail = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const code = req.query.code;
    
    if (!code) {
      return res.status(400).send("Code parameter is required");
    }
    
    const result = await pool
      .request()
      .input('code', sql.VarChar, code)
      .query(`
        SELECT 
          PP.[F090KY],
          PP.[F091IMMA],
          PC.F050NOMPRE,
          PC.Client as Code,
          PP.[F090LIB],
          PP.[F410LIB],
          PP.[F410MTHT],
          PP.[K410100PRO],
          PP.[F400NMDOC],
          PP.[F410QT],
          PP.[F410VISKM],
          PP.[F400FACDT],
          PP.[F050NOM]
        FROM [AlocproProd].[dbo].[Pneu_Parc] PP
        INNER JOIN [AlocproProd].[dbo].[PARC_CLIENT] PC 
          ON PP.F091IMMA = PC.F091IMMA
        WHERE PC.Client = @code
        ORDER BY PP.[F400FACDT] DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error("SQL Error:", error);
    res.status(500).send(error.message);
  }
};











// const get_pneu_consomme_detail = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT PP.[F090KY] ,PP.[F091IMMA],PC.F050NOMPRE,PC.Client as Code,[F090LIB],[F050NOM],[F410LIB],[F410MTHT],[K410100PRO],[F400NMDOC]     ,[F410QT],[F410VISKM],[F400FACDT]  FROM [AlocproProd].[dbo].[Pneu_Parc] PP   inner join PARC_CLIENT PC on PP.F091IMMA= PC.F091IMMA where PC.Client = L00019"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

const get_old_pneu_kms = async (req, res) => {
  try {
    const { nom_client, date_debut, date_fin } = req.query;
    const pool = await sql.connect(config);

    // Construction de la requête SQL directe au lieu d'appeler une procédure stockée
    const query = `
      SELECT 
        TIE.F050NOM,
        F470CONTRAT,
        PC.F090LIB,
        F090KM,
        F470DTDEP,
        F470DTARRP,
        F470DTARR,
        F470DUREE,
        F470KMAFF,
        F470NBPNEUS,
        SUM(PP.F410QT) AS PNEU_CONSOMME 
      FROM 
        F470LD LD 
      INNER JOIN 
        F050TIERS AS TIE ON LD.K470050TIE = TIE.F050KY
      INNER JOIN 
        F400EVT EV ON LD.K470400EVTTIE = EV.F400KY
      INNER JOIN 
        F090PARC PC ON EV.K400090UNI = PC.F090KY
      INNER JOIN 
        F091IMMAT IM ON PC.K090091IMM = IM.F091KY
      LEFT OUTER JOIN 
        Pneu_Parc PP ON IM.F091IMMA = PP.F091IMMA
      WHERE 
        TIE.F050NOM LIKE '%' + @nom_client + '%'
        AND YEAR(F470DTDEP) > 2014 
        AND (
          (@date_debut IS NULL AND @date_fin IS NULL)
          OR (@date_debut IS NOT NULL AND @date_fin IS NULL AND F470DTDEP >= @date_debut)
          OR (@date_debut IS NULL AND @date_fin IS NOT NULL AND F470DTDEP <= @date_fin)
          OR (@date_debut IS NOT NULL AND @date_fin IS NOT NULL AND F470DTDEP BETWEEN @date_debut AND @date_fin)
        )
      GROUP BY 
        TIE.F050NOM, 
        F470CONTRAT,
        PC.F090LIB,
        F090KM,
        F470DTDEP,
        F470DTARRP,
        F470DTARR,
        F470DUREE,
        F470KMAFF,
        F470NBPNEUS
    `;

    const request = pool.request().input("nom_client", sql.VarChar, nom_client);

    // Ajout des paramètres de date s'ils sont fournis
    if (date_debut) {
      request.input("date_debut", sql.Date, new Date(date_debut));
    } else {
      request.input("date_debut", sql.Date, null);
    }

    if (date_fin) {
      request.input("date_fin", sql.Date, new Date(date_fin));
    } else {
      request.input("date_fin", sql.Date, null);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};

const get_0_pneus = async (req, res) => {
  try {
    const { nom_client } = req.query;
    const pool = await sql.connect(config);

    const query = `
        SELECT 
    PC.Contrat, 
    PC.[F091IMMA], 
    PC.[F050NOMPRE],
    PC.[Client], 
    PC.[Marque/modele] as marque, 
    SUM(PP.[F410QT]) AS Pneu_Consommé,
    PC.F470NBPNEUS as dotation ,
    PC.DD AS date_depart,
    PC.DF AS date_fin,
    parc.F090KM
FROM 
    [AlocproProd].[dbo].[PARC_CLIENT] PC
    inner join F090PARC parc on PC.F090KY= parc.F090KY
left JOIN 
   [Pneu_Parc] pp   ON PC.[F091IMMA] = PP.[F091IMMA]
GROUP BY 
    PC.Contrat, 
    PC.[F091IMMA], 
    PC.[F050NOMPRE], 
    PC.[Client], 
    PC.[Marque/modele], 
    PC.F470NBPNEUS,
    PC.DD,
    PC.DF,parc.F090KM    
    having  SUM(PP.[F410QT]) is null and parc.F090KM >='60000'
ORDER BY date_depart 
      `;

    const result = await pool
      .request()
      .input("nom_client", sql.VarChar, nom_client)
      .query(query);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  get_pneu_consomme,
  get_pneu_consomme_detail,
  get_old_pneu_kms,
  get_0_pneus,
};
