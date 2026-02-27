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
      default: null
    },
    dateFin: {
      type: Date,
      default: null
    },
    statut: {
      type: String,
      enum: ["en_attente", "validée", "annulée"],
      default: "en_attente"
    },
    montant: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
      defaut : 0
    }
  });
  
  module.exports = mongoose.model("Reservation", ReservationSchema);
  