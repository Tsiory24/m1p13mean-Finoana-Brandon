const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservation.controller");
const { protect, authorize } = require("../middlewares/auth");

// routes
router.get("/", protect, authorize('admin'), reservationController.getAllReservations);
router.get("/mes", protect, reservationController.getMesReservations);
router.put("/:id/valider", protect, authorize('admin'), reservationController.validerReservation);
router.put("/:id/annuler", protect, reservationController.annulerReservation);

module.exports = router;