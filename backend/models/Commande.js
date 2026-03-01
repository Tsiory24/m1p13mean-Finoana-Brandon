const mongoose = require('mongoose');

const ligneCommandeSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  quantite: {
    type: Number,
    required: true,
    min: 1
  },
  prix_unitaire: {
    type: Number,
    required: true,
    min: 0
  },
  prix_supplement: {
    type: Number,
    default: 0
  },
  sous_total: {
    type: Number,
    required: true,
    min: 0
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
  variantNom: {
    type: String,
    default: null
  }
}, { _id: false });

const CommandeSchema = new mongoose.Schema({
  lignes: {
    type: [ligneCommandeSchema],
    required: true,
    validate: {
      validator: v => v.length > 0,
      message: 'La commande doit contenir au moins une ligne'
    }
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  acheteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date_commande: {
    type: Date,
    default: Date.now
  },
  statut_commande: {
    type: String,
    enum: ['en_attente', 'confirmee', 'livree', 'annulee'],
    default: 'en_attente'
  },
  montant_total: {
    type: Number,
    required: true,
    min: 0
  },
  montant_paye: {
    type: Number,
    default: 0,
    min: 0
  },
  reste_a_payer: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

CommandeSchema.index({ boutiqueId: 1, createdAt: -1 });
CommandeSchema.index({ acheteurId: 1, createdAt: -1 });
CommandeSchema.index({ statut_commande: 1, createdAt: -1 });

module.exports = mongoose.model('Commande', CommandeSchema);
