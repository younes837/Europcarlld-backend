const sql = require("mssql");
const config = require("../config/dbConfig");

const get_ca_vehicule = async (req, res) => {
  const {
    immatricule,
    date_debut,
    date_fin,
    page = 1,
    pageSize = 50,
    debug,
  } = req.query;

  try {
    const pool = await sql.connect(config);

    // Create request objects for data and count queries
    const dataRequest = pool.request();
    const countRequest = pool.request();

    // Add filter parameters properly
    if (immatricule) {
      dataRequest.input("immatricule", sql.NVarChar, immatricule);
      countRequest.input("immatricule", sql.NVarChar, immatricule);
    }

    if (date_debut) {
      dataRequest.input("date_debut", sql.Date, date_debut);
      countRequest.input("date_debut", sql.Date, date_debut);
     
    }

    if (date_fin) {
      dataRequest.input("date_fin", sql.Date, date_fin);
      countRequest.input("date_fin", sql.Date, date_fin);
      
    }

    // Add pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    dataRequest.input("offset", sql.Int, offset);
    dataRequest.input("pageSize", sql.Int, parseInt(pageSize));

    // Build the WHERE conditions with proper parameter usage
    const whereConditions = ["1=1"];

    if (immatricule) {
      whereConditions.push("[F091IMMA] LIKE '%' + @immatricule + '%'");
    }

    if (date_debut) {
      whereConditions.push("[DATE_FAC] >= @date_debut");
    }

    if (date_fin) {
      whereConditions.push("[DATE_FAC] <= @date_fin");
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // For debugging, log the complete query before execution
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY [DATE_FAC] DESC) as id,
          [CONTRAT],
          [TIERS],
          [UNITE],
          [F090LIB],
          [N_FACTURE],
          convert(varchar, [DATE_FAC], 105) as DATE_FAC,

          [HT],
          [TTC],
          [F091IMMA]
        FROM [LOCPRO_ALSYS].[dbo].[ca_voiture] WITH (NOLOCK)
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > @offset AND id <= @offset + @pageSize
    `;

    // Simple count query for total records
    const countQuery = `
      SELECT COUNT(*) as totalCount
      FROM [LOCPRO_ALSYS].[dbo].[ca_voiture] WITH (NOLOCK)
      ${whereClause}
    `;

    // Execute queries in parallel
    const [dataResult, countResult] = await Promise.all([
      dataRequest.query(dataQuery),
      countRequest.query(countQuery),
    ]);

    res.json({
      items: dataResult.recordset,
      total: countResult.recordset[0].totalCount || 0,
      debug: debug
        ? {
            query: dataQuery,
            whereConditions,
            parameters: Object.fromEntries(
              Object.entries(dataRequest.parameters).map(([key, value]) => [
                key,
                { type: value.type.name, value: value.value },
              ])
            ),
          }
        : undefined,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    res.status(500).send(error.message);
  }
};



module.exports = { get_ca_vehicule };
