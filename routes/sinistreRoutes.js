const express = require("express");
const {
  getSinistre,
  getSinistre_lastmonth,
  get_charge_sinistre,
} = require("../controllers/sinistresController");

const router = express.Router();

router.get("/TOTAL_SINISTRE", getSinistre);
router.get("/TOTAL_SINISTRE_1", getSinistre_lastmonth);
router.get("/charge_SINISTRE", get_charge_sinistre);

module.exports = router;
