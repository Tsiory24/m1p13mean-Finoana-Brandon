const mongoose = require('mongoose');

const VariantOptionSchema = new mongoose.Schema({
  valeur: {
    type: String,
    required: true,
    trim: true
  },
  prix_supplement: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    type: String,
    default: null
  }
}, { _id: true });

const VariantProduitSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
    // Ex: "Taille", "Couleur", "Matière"
  },
  options: [VariantOptionSchema],
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

VariantProduitSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
});

module.exports = mongoose.model('VariantProduit', VariantProduitSchema);
