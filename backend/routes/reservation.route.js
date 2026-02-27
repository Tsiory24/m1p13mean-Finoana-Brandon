const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservation.controller");

// routes
router.get("/", reservationController.getAllReservations);
router.put("/:id/valider", reservationController.validerReservation);

module.exports = router;