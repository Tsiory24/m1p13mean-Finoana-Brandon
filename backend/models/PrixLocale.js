const mongoose = require('mongoose');

const PrixLocaleSchema = new mongoose.Schema({
  prix_par_m2: {
    type: Number,
    required: true,
    min: 0
  },
  valider_par: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('PrixLocale', PrixLocaleSchema);
