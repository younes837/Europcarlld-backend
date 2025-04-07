// routes/parcRoutes.js
const express = require("express");
const { get_commande_encours  } = require("../controllers/cmmdencoursController");
const router = express.Router();

router.get("/com_encours", get_commande_encours);

module.exports = router;