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

const getTotalVendu_lastYear = async (req,res) => {
  try{
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      select count(*) as totalLastYear 
      from dbo.F400EVT 
      inner join dbo.WW_DEF
      on dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY
      where (dbo.F400EVT.K400T44TYP = 'VM')
      and YEAR(F400EVT.F400FACDT) = YEAR(GETDATE()) -1 ;
      `);
    res.json(result.recordset)
  }catch(err){
    res.status(500).send(err.message)
  }
}

// Function to get sold vehicles
// const getVehiculeVendu = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(`
//         SELECT
//           dbo.WW_DEF.F090KY AS [Nr Unite],
//           dbo.WW_DEF.F091IMMA AS Matricule,
//           LEFT(dbo.WW_DEF.F090LIB, CHARINDEX(' ', dbo.WW_DEF.F090LIB + ' ') - 1) AS [Marque],
//           dbo.WW_DEF.F090LIB AS [Marque/Modele],
//           F060MOD.[F060DIRECT] as marque ,
//           dbo.WW_DEF.F090DTMISC AS DMC,
//           dbo.F400EVT.F400VISKM AS [Dernier Km],
//           dbo.F400EVT.F400FACDT AS [Date vente],
//           dbo.F400EVT.F400HT AS [Prix de vente HT],
//           dbo.WW_DEF.F090ACHPXHT AS [prix achat HT],
//           F470LD.F470VR AS [VR HT],
//           dbo.F400EVT.F400HT / dbo.WW_DEF.F090ACHPXHT AS [%]
//         FROM
//           dbo.F400EVT
//         INNER JOIN
//          dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY
//          inner join F090PARC on dbo.F400EVT.K400090UNI = F090PARC.F090KY
//          inner join F060MOD on  F090PARC.k090060mod =F060MOD.F060KY
//          LEFT JOIN dbo.F470LD AS F470LD  ON F090PARC.F090KY = F470LD.F470CONTRAT
//         WHERE
//           (dbo.F400EVT.K400T44TYP = 'VM')
//         ORDER BY
//           [Marque/Modele]
//       `);
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

const getVehiculeVendu = async (req, res) => {
  let pool;
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Get sorting parameters
    const sortField = req.query.sortField || "MarqueModele";
    const sortOrder = req.query.sortOrder || "asc";

    // Map frontend field names to database column names
    const fieldMapping = {
      NrUnite: "dbo.WW_DEF.F090KY",
      MarqueModele: "dbo.WW_DEF.F090LIB",
      Matricule: "dbo.WW_DEF.F091IMMA",
      Marque:
        "LEFT(dbo.WW_DEF.F090LIB, CHARINDEX(' ', dbo.WW_DEF.F090LIB + ' ') - 1)",
      DMC: "dbo.WW_DEF.F090DTMISC",
      DateVente: "dbo.F400EVT.F400FACDT",
      PrixVenteHT: "dbo.F400EVT.F400HT",
      PrixAchatHT: "dbo.WW_DEF.F090ACHPXHT",
      DernierKm: "dbo.F400EVT.F400VISKM",
      Pourcentage: "dbo.F400EVT.F400HT / dbo.WW_DEF.F090ACHPXHT",
      VrHT: "F470LD.F470VR",
    };

    // Build ORDER BY clause
    const dbSortField = fieldMapping[sortField] || fieldMapping.MarqueModele;
    const orderByClause = `ORDER BY ${dbSortField} ${sortOrder}`;

    // Get search parameter
    const search = req.query.search || "";

    // Get filter parameters
    const filters = req.query.filters ? JSON.parse(req.query.filters) : [];

    // Build WHERE clause
    let whereClause = "(dbo.F400EVT.K400T44TYP = 'VM')";

    // Add search condition if search term is provided
    if (search) {
      whereClause += ` AND (
        dbo.WW_DEF.F090LIB LIKE '%${search}%' OR
        dbo.WW_DEF.F091IMMA LIKE '%${search}%'
      )`;
    }
    if (req.query.dateDebut) {
      whereClause += ` AND dbo.F400EVT.F400FACDT >= '${req.query.dateDebut}'`;
    }
    if (req.query.dateFin) {
      whereClause += ` AND dbo.F400EVT.F400FACDT <= '${req.query.dateFin}'`;
    }

    // Add filter conditions
    if (filters && filters.length > 0) {
      filters.forEach((filter, index) => {
        const dbField = fieldMapping[filter.field] || filter.field;
        const paramName = `@param${index}`;

        switch (filter.operator) {
          case "contains":
            whereClause += ` AND ${dbField} LIKE '%${filter.value}%'`;
            break;
          case "equals":
            whereClause += ` AND ${dbField} = '${filter.value}'`;
            break;
          case "startsWith":
            whereClause += ` AND ${dbField} LIKE '${filter.value}%'`;
            break;
          case "endsWith":
            whereClause += ` AND ${dbField} LIKE '%${filter.value}'`;
            break;
          case "greaterThan":
            whereClause += ` AND ${dbField} > '${filter.value}'`;
            break;
          case "lessThan":
            whereClause += ` AND ${dbField} < '${filter.value}'`;
            break;
          default:
            break;
        }
      });
    }

    // Connect to the database
    pool = await sql.connect(config);

    // Get total count for pagination
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM   
        dbo.F400EVT 
      INNER JOIN 
        dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY 
      INNER JOIN 
        F090PARC on dbo.F400EVT.K400090UNI = F090PARC.F090KY
      INNER JOIN 
        F060MOD on F090PARC.k090060mod = F060MOD.F060KY
      LEFT JOIN 
        dbo.F470LD AS F470LD ON F090PARC.F090KY = F470LD.F470CONTRAT
      WHERE  
        ${whereClause}
    `);

    const total = countResult.recordset[0].total;

    // Get paginated data with ROW_NUMBER for proper pagination
    const result = await pool.request().query(`
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (${orderByClause}) as id,
          dbo.WW_DEF.F090KY AS [NrUnite], 
          dbo.WW_DEF.F091IMMA AS [Matricule], 
          LEFT(dbo.WW_DEF.F090LIB, CHARINDEX(' ', dbo.WW_DEF.F090LIB + ' ') - 1) AS [Marque], 
          dbo.WW_DEF.F090LIB AS [MarqueModele],
          CONVERT(VARCHAR, dbo.WW_DEF.F090DTMISC, 103) AS [DMC],  
          dbo.F400EVT.F400VISKM AS [DernierKm],
          CONVERT(VARCHAR, dbo.F400EVT.F400FACDT, 103) AS [DateVente], 
          dbo.F400EVT.F400HT AS [PrixVenteHT],
          dbo.WW_DEF.F090ACHPXHT AS [PrixAchatHT], 
          F470LD.F470VR AS [VrHT],  
          dbo.F400EVT.F400HT / dbo.WW_DEF.F090ACHPXHT AS [Pourcentage]
        FROM   
          dbo.F400EVT 
        INNER JOIN 
          dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY 
        INNER JOIN 
          F090PARC on dbo.F400EVT.K400090UNI = F090PARC.F090KY
        INNER JOIN 
          F060MOD on F090PARC.k090060mod = F060MOD.F060KY
        LEFT JOIN 
          dbo.F470LD AS F470LD ON F090PARC.F090KY = F470LD.F470CONTRAT
        WHERE  
          ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `);

    // Return the data with pagination info
    res.json({
      items: result.recordset,
      total: total,
      page: page,
      pageSize: pageSize,
    });
  } catch (error) {
    console.log("Database error:", error);
    res.status(500).send(error.message);
  }
};
const getVehiculeVenduStats = async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);

    // Get top 20 models using compatible syntax
    const topModelsResult = await pool.request().query(`
      WITH RankedModels AS (
        SELECT 
          dbo.WW_DEF.F090LIB as modele,
          COUNT(*) as count,
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as RowNum
        FROM   
          dbo.F400EVT 
        INNER JOIN 
          dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY 
        WHERE  
          dbo.F400EVT.K400T44TYP = 'VM'
        GROUP BY 
          dbo.WW_DEF.F090LIB
      )
      SELECT 
        modele,
        count
      FROM RankedModels
      WHERE RowNum <= 20
      ORDER BY count DESC
    `);

    // Get totals
    const totalsResult = await pool.request().query(`
      SELECT 
        CAST(SUM(dbo.F400EVT.F400HT) as DECIMAL(18,2)) as prixVenteHT,
        CAST(SUM(dbo.WW_DEF.F090ACHPXHT) as DECIMAL(18,2)) as prixAchatHT
      FROM   
        dbo.F400EVT 
      INNER JOIN 
        dbo.WW_DEF ON dbo.F400EVT.K400090UNI = dbo.WW_DEF.F090KY 
      INNER JOIN 
        F090PARC on dbo.F400EVT.K400090UNI = F090PARC.F090KY
      INNER JOIN 
        F060MOD on F090PARC.k090060mod = F060MOD.F060KY
      LEFT JOIN 
        dbo.F470LD AS F470LD ON F090PARC.F090KY = F470LD.F470CONTRAT
      WHERE  
        dbo.F400EVT.K400T44TYP = 'VM'
    `);

    res.json({
      topModels: topModelsResult.recordset,
      totals: totalsResult.recordset[0],
    });
  } catch (error) {
    console.log("Database error:", error);
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
    const result = await pool
      .request()
      .input("months", sql.Int, parseInt(months)).query(`
        SELECT
          dbo.WW_DEF.F090LIB AS [Marque],
          CAST(SUM(dbo.WW_DEF.PRIX_TTC) AS DECIMAL(18,2)) AS [Somme_de_PRIX_TTC],
          CAST(SUM(dbo.F400EVT.F400TT) AS DECIMAL(18,2)) AS [Somme_de_Prix_de_vente_TTC],
          CAST(
            CASE 
              WHEN SUM(dbo.WW_DEF.PRIX_TTC) = 0 THEN 0 
              ELSE (SUM(dbo.F400EVT.F400TT) / SUM(dbo.WW_DEF.PRIX_TTC) * 100) 
            END 
          AS INT) AS [Pourcentage],
          COUNT(dbo.WW_DEF.F091IMMA) AS [Nombre_de_Matricule],
          CAST(AVG(DATEDIFF(MONTH, dbo.WW_DEF.F090DTMISC, dbo.F400EVT.F400FACDT)) AS INT) AS [Moyenne_de_Duree_de_vie],
          CAST(
            CASE 
              WHEN COUNT(dbo.WW_DEF.F091IMMA) = 0 THEN 0 
              ELSE SUM(dbo.F400EVT.F400TT) / COUNT(dbo.WW_DEF.F091IMMA) 
            END 
          AS DECIMAL(18,2)) AS [VR]
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

    // Add an id field to each row for DataGrid
    const formattedData = result.recordset.map((row, index) => ({
      id: index, // Add an id field for DataGrid
      ...row,
    }));

    res.json(formattedData);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getTotalVendu,
  getVehiculeVendu,
  getVR,
  getVehiculeVenduStats,
  getTotalVendu_lastYear
};
