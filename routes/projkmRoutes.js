// routes/parcRoutes.js
const express = require("express");
const { get_km_projection, get_vidange_projection  } = require("../controllers/projkmController");
const router = express.Router();

router.get("/km_project", get_km_projection);
router.get("/vidange_pro", get_vidange_projection);

module.exports = router;