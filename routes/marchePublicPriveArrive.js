const express = require("express");
const {
  getContratPublicArrive,
  getContratPriveArrive,
  getContratPublicDetails,
  getContratPriveDetails,
} = require("../controllers/marchePublicPriveArriveController.js");

const router = express.Router();

router.get("/contrats_public_arrive", getContratPublicArrive);
router.get("/contrats_public_details/:code_client", getContratPublicDetails);

router.get("/contrats_prive_arrive", getContratPriveArrive);
router.get("/contrats_prive_details/:code_client", getContratPriveDetails);

module.exports = router;
