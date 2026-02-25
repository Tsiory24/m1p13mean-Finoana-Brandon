const Reservation = require("../models/Reservation");

// GET all Reservations
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.status(200).json({
      success: true,
      data: { reservations }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des réservations",
      error: err.message
    });
  }
};


exports.validerReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
        return res.status(404).json({
            success: false,
            message: "Réservation non trouvée"
        });
        }
    
        reservation.statut = "validée";
        await reservation.save();
    
        res.status(200).json({
        success: true,
        message: "Réservation validée avec succès",
        data: { reservation }
        });
    } catch (err) {
        res.status(500).json({
        success: false,
        message: "Erreur lors de la validation de la réservation",
        error: err.message
        });
    }
}