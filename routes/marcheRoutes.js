const express = require("express");
const {
  getTotalContratMarche,
  get_loyer_par_marche,
  get_moyen_duree,
  get_total_client_marche,
  getMarchePublic,
  getContratsParClient,
  getAllContratsClient,
  getContratsParClient_prive,
  getAllContratsClient_prive,
} = require("../controllers/marcheController");

const router = express.Router();

router.get("/marche_contrat", getTotalContratMarche);
router.get("/loyer_marche", get_loyer_par_marche);
router.get("/moyen_duree", get_moyen_duree);
router.get("/client_marche", get_total_client_marche);
router.get("/contrats_par_client", getContratsParClient); 
router.get("/marche_public/:code_client/:months", getAllContratsClient); 
router.get("/contrats_par_client_prive", getContratsParClient_prive); 
router.get("/marche_prive/:code_client/:months", getAllContratsClient_prive); 
module.exports = router;
