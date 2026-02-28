const express = require('express');
const router = express.Router();
const {
  getProduitAffiches,
  getDemandesAdmin,
  demanderAffiche,
  accepterDemande,
  refuserDemande,
  retirerAffiche,
  reorderAffiches,
  getConfig,
  updateConfig,
  getDemandesByBoutique,
  retirerAfficheResponsable
} = require('../controllers/affiches.controller');
const { protect, authorize } = require('../middlewares/auth');

// ── Produits à l'affiche ──────────────────────────────────────────────────────
router.get('/produits', getProduitAffiches);
router.get('/produits/demandes', protect, authorize('admin'), getDemandesAdmin);
router.get('/produits/mes-demandes', protect, authorize('responsable_boutique'), getDemandesByBoutique);
router.post('/produits/demander/:produitId', protect, authorize('responsable_boutique'), demanderAffiche);
router.put('/produits/reorder', protect, authorize('admin'), reorderAffiches);
router.put('/produits/:id/accepter', protect, authorize('admin'), accepterDemande);
router.put('/produits/:id/refuser', protect, authorize('admin'), refuserDemande);
router.delete('/produits/mes-demandes/:id', protect, authorize('responsable_boutique'), retirerAfficheResponsable);
router.delete('/produits/:id', protect, authorize('admin'), retirerAffiche);

// ── Config ────────────────────────────────────────────────────────────────────
router.get('/config', getConfig);
router.put('/config', protect, authorize('admin'), updateConfig);

module.exports = router;
