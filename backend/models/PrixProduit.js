const mongoose = require('mongoose');

const PrixProduitSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  prix_par_unite: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

PrixProduitSchema.index({ produitId: 1, createdAt: -1 });

module.exports = mongoose.model('PrixProduit', PrixProduitSchema);
