// import mongoose from "mongoose";
const mongoose = require('mongoose');


// const { Schema } = mongoose;

const BoutiqueSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true
    },

    // proprietaire: {
    //   type: String,
    //   required: true,
    //   default: null
    // },
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
      // default: null
    },

    type: {
      type: String,
      enum: ["kiosque", "stand", "magasin"],
      default: "kiosque"
    },

    active: {
      type: Boolean,
      default: false
    },

    image: {
      type: String,
      default: null
    },

    // Référence vers le box actuel
    localeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Locale",
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: null
    },
    dateDebut: {
      type: Date,
      default: null
    },
    dateFin: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    }    
  }
);

BoutiqueSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  // next();
});

module.exports = mongoose.model("Boutique", BoutiqueSchema);
