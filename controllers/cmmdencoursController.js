const sql = require("mssql");
const config = require("../config/dbConfig");




const get_commande_encours = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const offset = (page - 1) * pageSize;

    // Define column mapping between frontend and database
    const columnMapping = {
      DateCommande: "F080COMM.F080DTCOMM",
      NumCommande: "F080COMM.F080REF",
      Fournisseur: "F050TIERSFRS.F050NOM",
      Marque: "F090PARC.F090LIB",
      MontantHT: "F400EVT.F400HT",
      MontantTTC: "F400EVT.F400TT",
    };

    // Get the sort field from the frontend query, or use the default if it's invalid
    const sortField =
      req.query.sortField && columnMapping[req.query.sortField]
        ? columnMapping[req.query.sortField]
        : "F080COMM.F080DTCOMM";
    const sortOrder = req.query.sortOrder || "desc";

    // Get fournisseur search parameter
    const fournisseurSearch = req.query.clientSearch || "";

    // Build the WHERE clause for filtering
    let whereClause = "";
    const whereConditions = [];

    if (fournisseurSearch) {
      whereConditions.push(
        `F050TIERSFRS.F050NOM LIKE '%${fournisseurSearch}%'`
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

    // Combine all conditions
    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM 
        F080COMM 
        LEFT OUTER JOIN F090PARC ON F080COMM.K080090UNI = F090PARC.F090KY
        LEFT OUTER JOIN F050TIERS AS F050TIERSFRS ON F080COMM.K080050FRS = F050TIERSFRS.F050KY
        LEFT OUTER JOIN F030AGE ON F080COMM.K080030AGE = F030AGE.F030KY
        LEFT OUTER JOIN AlocproProd.dbo.F050TIERS AS F050TIERS ON F080COMM.K080050TIE = F050TIERS.F050KY
        LEFT OUTER JOIN AlocproProd.dbo.F082LIGCOM ON F080COMM.F080KY = F082LIGCOM.K082080COM
        LEFT OUTER JOIN AlocproProd.dbo.F400EVT ON F080COMM.R080400EVT = F400EVT.R400EVT
        INNER JOIN V03XAGESECT ON F030AGE.F030KY = V03XAGESECT.K03X030AGE
      ${whereClause}
    `;

    const countResult = await pool.request().query(countQuery);

    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ${sortField} ${sortOrder}) as id,
            F080COMM.F080REF AS NumCommande,
            CONVERT(VARCHAR, F080COMM.F080DTCOMM,   105) AS DateCommande,
            F080COMM.F080DTLIVFRS AS DateLivraison,
            F050TIERSFRS.F050NOM AS Fournisseur,
            F090PARC.F090LIB AS Marque,
            F400EVT.F400HT AS MontantHT,
            F400EVT.F400TT AS MontantTTC
      FROM 
          F080COMM 
          LEFT OUTER JOIN F090PARC ON F080COMM.K080090UNI = F090PARC.F090KY
          LEFT OUTER JOIN F050TIERS AS F050TIERSFRS ON F080COMM.K080050FRS = F050TIERSFRS.F050KY
          LEFT OUTER JOIN F030AGE ON F080COMM.K080030AGE = F030AGE.F030KY
          LEFT OUTER JOIN AlocproProd.dbo.F050TIERS AS F050TIERS ON F080COMM.K080050TIE = F050TIERS.F050KY
          LEFT OUTER JOIN AlocproProd.dbo.F082LIGCOM ON F080COMM.F080KY = F082LIGCOM.K082080COM
          LEFT OUTER JOIN AlocproProd.dbo.F400EVT ON F080COMM.R080400EVT = F400EVT.R400EVT
          INNER JOIN V03XAGESECT ON F030AGE.F030KY = V03XAGESECT.K03X030AGE 
        ${whereClause}
      )
      SELECT *
      FROM PaginatedData
      WHERE id > ${offset} AND id <= ${offset + pageSize}
    `;

    const result = await pool.request().query(dataQuery);
    res.json({
      items: result.recordset,
      total: countResult.recordset[0].total,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};




module.exports = {
  get_commande_encours,
};
