const mongoose = require('mongoose');

/**
 * Représente une demande de paiement de loyer mensuel.
 * La boutique sélectionne un ou plusieurs mois et soumet la demande.
 * L'admin valide ou refuse.
 */
const PaiementLoyerSchema = new mongoose.Schema(
  {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true
    },
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true
    },
    // Premier jour de chaque mois payé (ex: [2025-01-01, 2025-02-01])
    moisConcernes: {
      type: [Date],
      required: true,
      validate: {
        validator: v => Array.isArray(v) && v.length > 0,
        message: 'Au moins un mois doit être sélectionné.'
      }
    },
    montantTotal: {
      type: Number,
      required: true,
      min: 0
    },
    statut: {
      type: String,
      enum: ['en_attente', 'validé', 'refusé', 'annulé'],
      default: 'en_attente'
    },
    note: {
      type: String,
      default: null
    },
    motifRefus: {
      type: String,
      default: null
    },
    traitePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaiementLoyer', PaiementLoyerSchema);
