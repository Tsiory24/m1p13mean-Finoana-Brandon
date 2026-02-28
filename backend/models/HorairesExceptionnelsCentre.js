const mongoose = require('mongoose');

const HorairesExceptionnelsCentreSchema = new mongoose.Schema({
  date: {
    type: Date,
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

HorairesExceptionnelsCentreSchema.index({ date: 1 });

module.exports = mongoose.model('HorairesExceptionnelsCentre', HorairesExceptionnelsCentreSchema);
