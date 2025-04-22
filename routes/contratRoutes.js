const express = require("express");
const {
  getContratLongueDuree,
  getRevenue,
  gettop_marque,
  gettotal_contrat,
  get_contrat_actuelle,
  get_total_restitution,
  get_production_contrat,
  get_restitution_contrat,
  get_all_productions,
  get_all_restitutions,
  get_lld_vr,
} = require("../controllers/contratController");

const router = express.Router();

router.get("/contrat_longue_duree", getContratLongueDuree);
router.get("/revenue", getRevenue);
router.get("/top_marque", gettop_marque);
router.get("/total_contrat", gettotal_contrat);
router.get("/contrat-daba", get_contrat_actuelle);
router.get("/restitution_contrat", get_total_restitution);
router.get("/productions", get_production_contrat);
router.get("/restitutions", get_restitution_contrat);
router.get("/all_productions", get_all_productions);
router.get("/all_restitutions", get_all_restitutions);
router.get("/lld_vr", get_lld_vr);

module.exports = router;
