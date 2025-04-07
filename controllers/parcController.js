// controllers/parcController.js
const sql = require("mssql");
const config = require("../config/dbConfig");

const getParcGlobal = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT TOP (100) PERCENT
 dbo.F091IMMAT.F091IMMA AS Matricule,
 dbo.F090PARC.F090LIB AS [Marque/modele],
 dbo.F090PARC.K090T58POS AS position,
 dbo.F470LD.F470CONTRAT AS Contrat,
 dbo.V050TIERS.F050NOMPRE AS Client ,
 
 dbo.VT37ETA.F901MSG AS Statut,
 dbo.F470LD.F470DUREE duree ,
 dbo.F470LD.F470KMAFF AS KM_AFFECT,
                        
 dbo.F470LD.F470DTDEP AS DD,
 dbo.F470LD.F470DTARRP AS DF,
 dbo.F470LD.F470KMSUP as [KM SUPP], 
 dbo.F470LD.F470NBPNEUS as [NB Pneu]  
  FROM         dbo.F470LD INNER JOIN                      
                            dbo.F400EVT ON dbo.F470LD.F470CONTRAT = dbo.F400EVT.F400NMDOC 
                           
                            INNER JOIN
                               dbo.F090PARC ON dbo.F400EVT.K400090UNI = dbo.F090PARC.F090KY
                             INNER JOIN  
                                       dbo.F091IMMAT ON dbo.F090PARC.K090091IMM = dbo.F091IMMAT.F091KY
                                       INNER JOIN  dbo.VT37ETA ON dbo.F470LD.K470T37ETA = VT37ETA.FT37KY
                                        LEFT OUTER JOIN 
                                          dbo.V050TIERS ON dbo.F470LD.K470050TIE = dbo.V050TIERS.F050KY LEFT OUTER JOIN  
                                           dbo.[VH/CA] ON dbo.F090PARC.F090KY = dbo.[VH/CA].F090KY  WHERE 
                                             (dbo.F400EVT.K400T63STATU = '0')   GROUP BY dbo.F470LD.K470050TIE, dbo.F470LD.F470CONTRAT, dbo.F470LD.F470DTDEP,
                                              dbo.F470LD.F470DTARRP, dbo.VT37ETA.F901MSG, dbo.F470LD.F470KMAFF, dbo.F470LD.F470DTFAC,  
                                                 dbo.F470LD.F470DTFINPROL, dbo.F470LD.F470DTARR, dbo.F400EVT.F400DEVTT, dbo.F470LD.K470400EVTTIE,
                                                  dbo.F091IMMAT.F091IMMA, dbo.F090PARC.F090KY, dbo.F470LD.F470KMSUP,
                                                    dbo.F470LD.F470VR, dbo.F470LD.F470NBPNEUS, dbo.[VH/CA].CA_HT, dbo.F470LD.F470DUREE, dbo.F090PARC.F090LIB,
                                                     dbo.F090PARC.F090ACHPXHT, dbo.F470LD.R470570MVT, 
                                                        dbo.F470LD.K470570MVT, dbo.V050TIERS.F050NOMPRE  , F090PARC.K090T58POS
                                                         HAVING  
     (dbo.F470LD.K470050TIE LIKE 'L%')  AND (dbo.F400EVT.F400DEVTT <> 0)
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = { getParcGlobal };
