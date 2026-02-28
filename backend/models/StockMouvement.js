const mongoose = require('mongoose');

const StockMouvementSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  type: {
    type: String,
    enum: ['entree', 'sortie'],
    required: true
  },
  quantite: {
    type: Number,
    required: true,
    min: 1
  },
  motif: {
    type: String,
    default: null
  },
  commandeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
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
  }
}, {
  timestamps: true
});

StockMouvementSchema.index({ produitId: 1, boutiqueId: 1, createdAt: -1 });
StockMouvementSchema.index({ boutiqueId: 1, createdAt: -1 });

module.exports = mongoose.model('StockMouvement', StockMouvementSchema);
