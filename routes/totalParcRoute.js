const express = require("express");
const {
getAllParc,getCountParc
} = require("../controllers/totalparcController");

const router = express.Router();


router.get("/total_parc",getCountParc);
router.get("/all_parc", getAllParc);

module.exports = router;
