const mongoose = require('mongoose');

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const HorairesCentreSchema = new mongoose.Schema({
  jour: {
    type: String,
    enum: JOURS,
    required: true,
    unique: true
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

module.exports = mongoose.model('HorairesCentre', HorairesCentreSchema);
