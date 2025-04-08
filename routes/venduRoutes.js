const express = require("express");
const {
  getTotalVendu,
  getVehiculeVendu,
  getVR,
  getVehiculeVenduStats,
} = require("../controllers/venduController");

const router = express.Router();

router.get("/total_vo", getTotalVendu);
router.get("/vo", getVehiculeVendu);
router.get("/vo/stats", getVehiculeVenduStats);
router.get("/vr", getVR);
module.exports = router;
