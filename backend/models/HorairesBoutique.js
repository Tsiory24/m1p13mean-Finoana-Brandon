const mongoose = require('mongoose');

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const HorairesBoutiqueSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  jour: {
    type: String,
    enum: JOURS,
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: null
  }
});

HorairesBoutiqueSchema.index({ boutiqueId: 1, jour: 1 }, { unique: true });

module.exports = mongoose.model('HorairesBoutique', HorairesBoutiqueSchema);
