const express = require("express");
const { getTopClient, getTopClientOriginal } = require("../controllers/calculGrillController");

const router = express.Router();
router.get("/cal_grille_offre", getTopClient);
router.get("/cal_grille_offre_original", getTopClientOriginal);
module.exports = router;
