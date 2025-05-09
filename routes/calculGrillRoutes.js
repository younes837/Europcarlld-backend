const express = require("express");
const { getTopClient, getTopClientOriginal, getClientCount, getMargeParClient } = require("../controllers/calculGrillController");

const router = express.Router();
router.get("/cal_grille_offre", getTopClient);
router.get("/cal_grille_offre_original", getTopClientOriginal);
router.get("/totalclient", getClientCount);
router.get('/marge_client', getMargeParClient);
module.exports = router;
