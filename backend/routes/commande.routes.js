const express = require('express');
const router = express.Router();
const {
  createCommande,
  getAllCommandes,
  getCommandeById,
  updateStatut,
  updatePaiement
} = require('../controllers/commande.controller');
const { protect, authorize } = require('../middlewares/auth');

router.post('/', protect, authorize('acheteur'), createCommande);
router.get('/', protect, authorize('admin', 'responsable_boutique'), getAllCommandes);
router.get('/:id', protect, getCommandeById);
router.put('/:id/statut', protect, authorize('admin', 'responsable_boutique'), updateStatut);
router.put('/:id/paiement', protect, authorize('admin', 'responsable_boutique'), updatePaiement);

module.exports = router;
