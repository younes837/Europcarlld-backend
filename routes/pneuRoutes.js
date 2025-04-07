

const express = require("express");
const { get_pneu_consomme, get_pneu_consomme_detail, get_old_pneu_kms, get_0_pneus } = require("../controllers/pneuController");


const router = express.Router();

router.get("/total_pneu_client",get_pneu_consomme );
router.get("/detail_pneu_client",get_pneu_consomme_detail );
router.get("/old_pneu_kms",get_old_pneu_kms );
router.get("/pneu_0",get_0_pneus );

module.exports = router;

