const express = require("express");
const { getTopClient } = require("../controllers/calculGrillController");

const router = express.Router();
router.get("/cal_grille_offre", getTopClient);
module.exports = router;
