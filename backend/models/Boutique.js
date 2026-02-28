// import mongoose from "mongoose";
const mongoose = require('mongoose');


// const { Schema } = mongoose;

function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const BoutiqueSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true
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

    categorieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categorie",
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
    },

    // ── Affiche ──────────────────────────────────────────────────────────
    enAffiche: {
      type: Boolean,
      default: false
    },
    ordreAffiche: {
      type: Number,
      default: null
    }
  }
);

BoutiqueSchema.pre('save', async function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  if (this.isModified('nom') || !this.slug) {
    const base = slugify(this.nom);
    let slug = base;
    let count = 1;
    while (await mongoose.model('Boutique').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${count++}`;
    }
    this.slug = slug;
  }
  // next();
});

module.exports = mongoose.model("Boutique", BoutiqueSchema);
