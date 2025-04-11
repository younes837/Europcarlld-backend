// routes/parcRoutes.js
const express = require("express");
const {
  get_entretien_vehicule,
  get_all_entretien,
  get_entretien_matricule,
} = require("../controllers/entretienController");
const router = express.Router();

router.get("/list_entretien", get_entretien_vehicule);
router.get("/entretien_client", get_all_entretien);
router.get("/entretien_matricule", get_entretien_matricule);

module.exports = router;
