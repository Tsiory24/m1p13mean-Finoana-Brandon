const mongoose = require('mongoose');

const SousCategorieSchema = new mongoose.Schema({
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

SousCategorieSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
});

module.exports = mongoose.model('SousCategorie', SousCategorieSchema);
