const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['produit', 'variant_option'],
      required: true
    },
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      default: null
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VariantProduit',
      default: null
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    optionValeur: {
      type: String,
      default: null
    },
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true
    },
    pourcentage: {
      type: Number,
      required: true,
      min: 1,
      max: 99
    },
    prixOriginal: {
      type: Number,
      required: true,
      min: 0
    },
    prixReduit: {
      type: Number,
      required: true,
      min: 0
    },
    dateDebut: {
      type: Date,
      required: true
    },
    dateFin: {
      type: Date,
      required: true
    },
    actif: {
      type: Boolean,
      default: true
    },
    terminePar: {
      type: String,
      enum: ['responsable', 'expiration', null],
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

PromotionSchema.index({ boutiqueId: 1, actif: 1 });
PromotionSchema.index({ produitId: 1, actif: 1 });
PromotionSchema.index({ variantId: 1, optionId: 1, actif: 1 });

module.exports = mongoose.model('Promotion', PromotionSchema);
