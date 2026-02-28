const mongoose = require('mongoose');

const DemandeAfficheProduitSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: true
    },
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true
    },
    statut: {
      type: String,
      enum: ['en_attente', 'accepte', 'refuse'],
      default: 'en_attente'
    },
    ordre: {
      type: Number,
      default: null
    },
    motifRefus: {
      type: String,
      default: null
    },
    dateRefus: {
      type: Date,
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

module.exports = mongoose.model('DemandeAfficheProduit', DemandeAfficheProduitSchema);
