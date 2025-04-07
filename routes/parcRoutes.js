// routes/parcRoutes.js
const express = require("express");
const { getParcGlobal } = require("../controllers/parcController");
const router = express.Router();

router.get("/parc-global", getParcGlobal);

module.exports = router;