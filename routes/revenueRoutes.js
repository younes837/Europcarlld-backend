const express = require("express");
const {get_ca_vehicule  } = require("../controllers/revenueController");


const router = express.Router();

router.get("/parc_ca", get_ca_vehicule);

module.exports = router;