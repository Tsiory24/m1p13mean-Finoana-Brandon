const mongoose = require('mongoose');


const ReservationSchema = new mongoose.Schema({
    localeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Locale",
      required: true
    },
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Boutique",
      required: true
    },
    dateDebut: {
      type: Date,
      required: true
    },
    dateFin: {
      type: Date,
      required: true
    },
    statut: {
      type: String,
      enum: ["en_attente", "validée", "annulée"],
      default: "en_attente"
    },
    montant: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      defaut : 0
    }
  });
  
  module.exports = mongoose.model("Reservation", ReservationSchema);
  