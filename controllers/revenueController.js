const sql = require("mssql");
const config = require("../config/dbConfig");

const get_ca_vehicule = async (req, res) => {
    const { immatricule, date_debut, date_fin, page = 1, pageSize = 50 } = req.query;
    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        
        // Construire la clause WHERE
        let whereConditions = ["1=1"];
        
        if (immatricule) {
            whereConditions.push("[F091IMMA] = @immatricule");
            request.input("immatricule", sql.VarChar, immatricule);
        }
        if (date_debut && date_fin) {
            whereConditions.push("[DATE_FAC] BETWEEN @date_debut AND @date_fin");
            request.input("date_debut", sql.Date, date_debut);
            request.input("date_fin", sql.Date, date_fin);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        // Calcul de l'offset pour la pagination
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));
        
        // Requête pour les données paginées
        const dataQuery = `
            WITH PaginatedData AS (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY [DATE_FAC] DESC) as id,
                    [CONTRAT],
                    [TIERS],
                    [UNITE],
                    [F090LIB],
                    [N_FACTURE],
                    [DATE_FAC],
                    [HT],
                    [TTC],
                    [F091IMMA],
                    [F570DTDEP],
                    [F570DTARR],
                    [PRIX_ACHAT],
                    [F090DTMISC]
                FROM [LOCPRO_ALSYS].[dbo].[ca_voiture]
                ${whereClause}
            )
            SELECT *
            FROM PaginatedData
            WHERE id > @offset AND id <= @offset + @pageSize
        `;
        
        // Requête pour les statistiques
        const summaryQuery = `
            SELECT 
                COUNT(*) as totalCount,
                COUNT(DISTINCT [F091IMMA]) as uniqueVehiclesCount,
                COUNT(DISTINCT [CONTRAT]) as totalContracts,
                SUM([HT]) as totalHT,
                SUM([TTC]) as totalTTC
            FROM [LOCPRO_ALSYS].[dbo].[ca_voiture]
            ${whereClause}
        `;
        
        // Exécuter les deux requêtes en parallèle
        const [dataResult, summaryResult] = await Promise.all([
            request.query(dataQuery),
            request.query(summaryQuery)
        ]);
        
        // Préparer les résultats
        const summary = summaryResult.recordset[0];
        
        // Formatage des résultats comme attendu par le frontend
        res.json({
            items: dataResult.recordset,
            total: summary.totalCount,
            summary: {
                totalHT: summary.totalHT || 0,
                totalTTC: summary.totalTTC || 0,
                uniqueVehiclesCount: summary.uniqueVehiclesCount || 0,
                totalContracts: summary.totalContracts || 0
            }
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        res.status(500).send(error.message);
    }
};

module.exports = { get_ca_vehicule };
