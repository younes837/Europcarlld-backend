const express = require("express");
const { getachat, getPositions } = require("../controllers/achatController");


const router = express.Router();

router.get("/achats_vh", getachat);
router.get("/positions", getPositions);

module.exports = router;
