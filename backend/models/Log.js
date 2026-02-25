const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['create', 'update', 'delete', 'auth'],
    required: true,
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
logSchema.index({ type: 1, createdAt: -1 });
logSchema.index({ utilisateur: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
