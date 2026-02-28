const express = require('express');
const router = express.Router();
const {
  getHorairesCentre,
  upsertHoraireCentre,
  getExceptionsCentre,
  createExceptionCentre,
  updateExceptionCentre,
  deleteExceptionCentre,
  getHorairesBoutique,
  upsertHoraireBoutique,
  getExceptionsBoutique,
  createExceptionBoutique,
  updateExceptionBoutique,
  deleteExceptionBoutique
} = require('../controllers/horaires.controller');
const { protect, authorize } = require('../middlewares/auth');

// ── Centre ────────────────────────────────────────────────────────────────
router.get('/centre', getHorairesCentre);
router.put('/centre/:jour', protect, authorize('admin'), upsertHoraireCentre);
router.get('/centre/exceptions', getExceptionsCentre);
router.post('/centre/exceptions', protect, authorize('admin'), createExceptionCentre);
router.put('/centre/exceptions/:id', protect, authorize('admin'), updateExceptionCentre);
router.delete('/centre/exceptions/:id', protect, authorize('admin'), deleteExceptionCentre);

// ── Boutiques ─────────────────────────────────────────────────────────────
router.get('/boutiques/:boutiqueId', getHorairesBoutique);
router.put('/boutiques/:boutiqueId/:jour', protect, authorize('admin', 'responsable_boutique'), upsertHoraireBoutique);
router.get('/boutiques/:boutiqueId/exceptions', getExceptionsBoutique);
router.post('/boutiques/:boutiqueId/exceptions', protect, authorize('admin', 'responsable_boutique'), createExceptionBoutique);
router.put('/boutiques/:boutiqueId/exceptions/:id', protect, authorize('admin', 'responsable_boutique'), updateExceptionBoutique);
router.delete('/boutiques/:boutiqueId/exceptions/:id', protect, authorize('admin', 'responsable_boutique'), deleteExceptionBoutique);

module.exports = router;
