// routes/parcRoutes.js
const express = require("express");
const { get_entretien_vehicule  } = require("../controllers/entretienController");
const router = express.Router();

router.get("/list_entretien", get_entretien_vehicule);

module.exports = router;