const Reservation = require("../models/Reservation");
const DureeContrat = require("../models/DureeContrat");
const Boutique = require("../models/Boutique");
const Notification = require("../models/Notification");
const Locale = require("../models/Locale");

// GET all Reservations (admin)
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate("localeId")
      .populate({ path: "boutiqueId", populate: { path: "proprietaire", select: "nom email" } })
      .sort({ createdAt: -1 });
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

// GET mes réservations (responsable_boutique)
exports.getMesReservations = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(200).json({ success: true, data: { reservations: [] } });
    }
    const reservations = await Reservation.find({ boutiqueId: boutique._id })
      .populate("localeId")
      .populate("boutiqueId")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { reservations } });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération",
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

        // Récupère la durée du contrat actif
        const dureeContrat = await DureeContrat.findOne().sort({ createdAt: -1 });
        if (!dureeContrat) {
          return res.status(400).json({
            success: false,
            message: "Aucune durée de contrat configurée"
          });
        }

        // Calcule les dates à partir d'aujourd'hui
        const dateDebut = new Date();
        const dateFin = new Date(dateDebut);
        dateFin.setMonth(dateFin.getMonth() + dureeContrat.duree);

        reservation.dateDebut = dateDebut;
        reservation.dateFin = dateFin;
        reservation.statut = "validée";
        await reservation.save();

        // Notifie le responsable de la boutique
        try {
          const boutique = await Boutique.findById(reservation.boutiqueId).populate('proprietaire');
          const locale = await Locale.findById(reservation.localeId);
          if (boutique && boutique.proprietaire) {
            await Notification.create({
              type: 'reservation_validee',
              message: `Votre réservation du local ${locale ? locale.code : ''} a été validée 🎉. Votre contrat débute le ${dateDebut.toLocaleDateString('fr-FR')}.`,
              targetUser: boutique.proprietaire._id,
              refId: reservation._id,
              refModel: 'Reservation',
              data: { reservationId: reservation._id, boutiqueId: boutique._id }
            });
          }
        } catch (_) {}

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

exports.annulerReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "Réservation non trouvée" });
    }

    if (reservation.statut !== "en_attente") {
      return res.status(400).json({
        success: false,
        message: "Seules les réservations en attente peuvent être annulées"
      });
    }

    // Vérifie que c'est bien la boutique du responsable connecté (sauf admin)
    if (req.user.role !== 'admin') {
      const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
      if (!boutique || boutique._id.toString() !== reservation.boutiqueId.toString()) {
        return res.status(403).json({ success: false, message: "Non autorisé" });
      }
    }

    reservation.statut = "annulée";
    await reservation.save();

    // Notifie le responsable de la boutique si c'est l'admin qui annule
    try {
      if (req.user.role === 'admin') {
        const boutique = await Boutique.findById(reservation.boutiqueId).populate('proprietaire');
        const locale = await Locale.findById(reservation.localeId);
        if (boutique && boutique.proprietaire) {
          await Notification.create({
            type: 'reservation_annulee',
            message: `Votre réservation du local ${locale ? locale.code : ''} a été annulée par l'administration.`,
            targetUser: boutique.proprietaire._id,
            refId: reservation._id,
            refModel: 'Reservation',
            data: { reservationId: reservation._id, boutiqueId: boutique._id }
          });
        }
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: "Réservation annulée avec succès",
      data: { reservation }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation",
      error: err.message
    });
  }
}