const express = require("express");
const { get_car_dispo , get_car_attente ,get_position_car ,get_all_positions} = require("../controllers/etatCarController");

const router = express.Router();

router.get("/vh_disponible", get_car_dispo);
router.get("/vh_enattente", get_car_attente);
router.get("/postion_car", get_position_car);
router.get("/get_all_positions", get_all_positions);

module.exports = router;
