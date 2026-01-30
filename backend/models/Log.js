const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['inscription', 'tentative_login', 'login_reussi', 'login_echoue', 'deconnexion'],
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  details: {
    nom: String,
    email: String,
    contact: String,
    role: String,
    identifier: String,
    ipAddress: String,
    userAgent: String
  },
  statut: {
    type: String,
    enum: ['succès', 'échec'],
    required: true
  },
  message: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
logSchema.index({ action: 1, createdAt: -1 });
logSchema.index({ utilisateur: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
