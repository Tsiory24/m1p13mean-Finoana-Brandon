const mongoose = require('mongoose');

const ProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  categorieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie',
    required: true
  },
  sousCategorieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SousCategorie',
    default: null
  },
  description: {
    type: String,
    default: null
  },
  prix_actuel: {
    type: Number,
    required: true,
    min: 0
  },
  uniteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unite',
    required: true
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

ProduitSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
});

module.exports = mongoose.model('Produit', ProduitSchema);
