const express = require("express");
const { get_ca } = require("../controllers/caController");


const router = express.Router();

router.get("/ca_annuelle", get_ca);


module.exports = router;
