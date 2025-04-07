const express = require("express");
const { getachat } = require("../controllers/achatController");


const router = express.Router();

router.get("/achats_vh", getachat);


module.exports = router;
