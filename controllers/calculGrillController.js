const sql = require("mssql");
const config = require("../config/dbConfig");
const express = require("express");

const getTopClientOriginal = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT top 20 [Parc] ,[Nom client] FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]  order by Parc desc"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getClientCount = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT count(*) as totaleClient FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getTopClient = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Get sorting parameters
    const sortField = req.query.sortField || "MARGE";
    const sortOrder = req.query.sortOrder || "desc";

    // Get client search parameter
    const clientSearch = req.query.clientSearch || "";

    // Build the WHERE clause for filtering
    let whereClause = "";
    const whereConditions = [];

    // Add client search condition if provided
    if (clientSearch) {
      whereConditions.push(`[Nom client] LIKE '%${clientSearch}%'`);
    }

    // Add other filter conditions if available
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        if (filters.length > 0) {
          const filterConditions = filters.map((filter) => {
            const { field, operator, value } = filter;
            // Handle different operators
            switch (operator) {
              case "contains":
                return `[${field}] LIKE '%${value}%'`;
              case "equals":
                return `[${field}] = '${value}'`;
              case "startsWith":
                return `[${field}] LIKE '${value}%'`;
              case "endsWith":
                return `[${field}] LIKE '%${value}'`;
              case ">":
                return `[${field}] > '${value}'`;
              case "<":
                return `[${field}] < '${value}'`;
              case ">=":
                return `[${field}] >= '${value}'`;
              case "<=":
                return `[${field}] <= '${value}'`;
              default:
                return `[${field}] = '${value}'`;
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

    // First, get the total count with filters applied
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
      ${whereClause}
    `;

    const countResult = await pool.request().query(countQuery);

    // Then, get the paginated and sorted data
    const dataQuery = `
      WITH PaginatedData AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY [${sortField}] ${sortOrder}) as id,
          [Parc], [Nom client], [LOYER], [MARGE], CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL
        FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
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

// const getMargeParClient = async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool
//       .request()
//       .query(
//         "SELECT [Parc], [Nom client], [LOYER], [MARGE], CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL FROM [AlocproProd].[dbo].[calc_grille_offre_rnl] ORDER BY MARGE DESC"
//       );
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };




const getMargeParClient = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Récupération des paramètres de requête
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const isExport = req.query.export === "true";
    const filters = req.query.filters ? JSON.parse(req.query.filters) : [];
    const sortField = req.query.sortField;
    const sortOrder = req.query.sortOrder?.toUpperCase() || 'DESC';

    // Calcul de l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Construire la requête de base
    let whereClause = "WHERE 1=1";
    let parameters = {};
    let parameterIndex = 0;

    // Ajouter la condition de recherche si nécessaire
    if (search) {
      whereClause += ` AND [Nom client] LIKE @search`;
      parameters.search = `%${search}%`;
    }

    // Traitement des filtres
    if (filters && filters.length > 0) {
      filters.forEach((filter, index) => {
        const paramName = `filter${index}`;
        switch (filter.operator) {
          case 'equals':
            whereClause += ` AND [${filter.field}] = @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case 'contains':
            whereClause += ` AND [${filter.field}] LIKE @${paramName}`;
            parameters[paramName] = `%${filter.value}%`;
            break;
          case 'startsWith':
            whereClause += ` AND [${filter.field}] LIKE @${paramName}`;
            parameters[paramName] = `${filter.value}%`;
            break;
          case 'endsWith':
            whereClause += ` AND [${filter.field}] LIKE @${paramName}`;
            parameters[paramName] = `%${filter.value}`;
            break;
          case 'isEmpty':
            whereClause += ` AND ([${filter.field}] IS NULL OR [${filter.field}] = '')`;
            break;
          case 'isNotEmpty':
            whereClause += ` AND [${filter.field}] IS NOT NULL AND [${filter.field}] <> ''`;
            break;
          case 'isAnyOf':
            if (Array.isArray(filter.value)) {
              whereClause += ` AND [${filter.field}] IN (${filter.value.map((_, i) => `@${paramName}${i}`).join(',')})`;
              filter.value.forEach((val, i) => {
                parameters[`${paramName}${i}`] = val;
              });
            }
            break;
          // Numeric comparisons
          case '>':
            whereClause += ` AND [${filter.field}] > @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case '>=':
            whereClause += ` AND [${filter.field}] >= @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case '<':
            whereClause += ` AND [${filter.field}] < @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case '<=':
            whereClause += ` AND [${filter.field}] <= @${paramName}`;
            parameters[paramName] = filter.value;
            break;
        }
      });
    }

    // Pour l'export, on récupère toutes les données sans pagination
    if (isExport) {
      const query = `
        SELECT 
          [Parc], 
          [Nom client], 
          [LOYER], 
          [MARGE], 
          CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL
        FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
        ${whereClause}
        ${sortField ? `ORDER BY [${sortField}] ${sortOrder}` : 'ORDER BY MARGE DESC'}
      `;

      const request = pool.request();
      // Add parameters to request
      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      const result = await request.query(query);

      // Calculer les totaux pour l'export
      const totals = {
        totalLoyer: result.recordset.reduce((sum, row) => sum + (row.LOYER || 0), 0),
        totalMarge: result.recordset.reduce((sum, row) => sum + (row.MARGE || 0), 0),
        totalRNL: result.recordset.reduce((sum, row) => sum + (row.RNL || 0), 0),
        totalParcs: result.recordset.reduce((sum, row) => sum + (row.Parc || 0), 0),
      };

      return res.json({
        data: result.recordset,
        total: result.recordset.length,
        totals: totals,
      });
    }

    // Get total count with filters
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
      ${whereClause}
    `;

    const countRequest = pool.request();
    // Add parameters to request
    Object.keys(parameters).forEach(key => {
      countRequest.input(key, parameters[key]);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Calculate totals with filters
    const totalsQuery = `
      SELECT 
        SUM([LOYER]) as totalLoyer,
        SUM([MARGE]) as totalMarge,
        SUM(CAST([RNL] * 100 AS DECIMAL(10,2))) as totalRNL,
        SUM([Parc]) as totalParcs
      FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
      ${whereClause}
    `;

    const totalsRequest = pool.request();
    // Add parameters to request
    Object.keys(parameters).forEach(key => {
      totalsRequest.input(key, parameters[key]);
    });

    const totalsResult = await totalsRequest.query(totalsQuery);
    const totals = totalsResult.recordset[0];

    // Get paginated data with filters and sorting
    const dataQuery = `
      WITH NumberedResults AS (
        SELECT 
          [Parc], 
          [Nom client], 
          [LOYER], 
          [MARGE], 
          CAST([RNL] * 100 AS DECIMAL(10,2)) as RNL,
          ROW_NUMBER() OVER (${sortField ? `ORDER BY [${sortField}] ${sortOrder}` : 'ORDER BY MARGE DESC'}) AS RowNum
        FROM [AlocproProd].[dbo].[calc_grille_offre_rnl]
        ${whereClause}
      )
      SELECT 
        [Parc], 
        [Nom client], 
        [LOYER], 
        [MARGE], 
        [RNL]
      FROM NumberedResults
      WHERE RowNum BETWEEN ${offset + 1} AND ${offset + limit}
    `;

    const dataRequest = pool.request();
    // Add parameters to request
    Object.keys(parameters).forEach(key => {
      dataRequest.input(key, parameters[key]);
    });

    const dataResult = await dataRequest.query(dataQuery);

    // Return data with pagination info
    res.json({
      data: dataResult.recordset,
      total: total,
      totals: totals,
      page: page,
      limit: limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erreur dans getMargeParClient:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

module.exports = {
  getTopClient,
  getTopClientOriginal,
  getClientCount,
  getMargeParClient,
};
