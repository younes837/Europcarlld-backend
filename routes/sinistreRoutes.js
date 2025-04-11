const express = require("express");
const {
  getSinistre,
  getSinistre_lastmonth,
  get_charge_sinistre,
  get_sinistres_by_nature,
  get_sinistres_by_type_acc,
} = require("../controllers/sinistresController");

const router = express.Router();

router.get("/TOTAL_SINISTRE", getSinistre);
router.get("/TOTAL_SINISTRE_1", getSinistre_lastmonth);
router.get("/charge_sinistre", get_charge_sinistre);
router.get("/sinistres_by_nature", get_sinistres_by_nature);
router.get("/sinistres_by_type_acc", get_sinistres_by_type_acc);

module.exports = router;
