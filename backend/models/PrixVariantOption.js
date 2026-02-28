const mongoose = require('mongoose');

const PrixVariantOptionSchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VariantProduit',
    required: true
  },
  optionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  optionValeur: {
    type: String,
    required: true
  },
  prix_supplement: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

PrixVariantOptionSchema.index({ variantId: 1, optionId: 1, createdAt: -1 });

module.exports = mongoose.model('PrixVariantOption', PrixVariantOptionSchema);
