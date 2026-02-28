const mongoose = require('mongoose');

const HorairesExceptionnelsBoutiqueSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  heure_ouverture: {
    type: String,
    default: null
  },
  heure_fermeture: {
    type: String,
    default: null
  },
  ferme: {
    type: Boolean,
    default: false
  },
  motif: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

HorairesExceptionnelsBoutiqueSchema.index({ boutiqueId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HorairesExceptionnelsBoutique', HorairesExceptionnelsBoutiqueSchema);
