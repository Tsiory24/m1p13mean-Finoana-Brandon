const mongoose = require('mongoose');

const ProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  // La catégorie est héritée de la boutique via boutiqueId.categorieId
  sousCategorieIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SousCategorie'
  }],
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
  // Images du produit (URLs)
  images: [{
    type: String
  }],
  // Attributs dynamiques : métadonnées descriptives du produit
  attributs: [{
    cle: { type: String, required: true, trim: true },
    valeur: { type: String, required: true, trim: true }
  }],
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
