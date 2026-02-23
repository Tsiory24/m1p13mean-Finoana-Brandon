// import mongoose from "mongoose";
const mongoose = require('mongoose');



const DureeContratSchema = new mongoose.Schema(
  {
    duree: {
      type: Number,
      default: 12 // Durée par défaut de 12 mois
    },
    createdAt: {
      type: Date,
      default: Date.now
    },

  }
);

DureeContratSchema.pre('save', function () {
    this.createdAt = new Date();
});

module.exports = mongoose.model("DureeContrat", DureeContratSchema);
