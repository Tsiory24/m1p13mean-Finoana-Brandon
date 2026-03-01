const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paiementLoyer.controller');
const { protect, authorize } = require('../middlewares/auth');

// Public non — tout protégé
router.get('/', protect, authorize('admin'), ctrl.getAll);
router.get('/boutique', protect, ctrl.getMesBoutique);
router.get('/reservation/:reservationId', protect, ctrl.getCalendrierReservation);
router.post('/', protect, ctrl.creerPaiement);
router.put('/:id/valider', protect, authorize('admin'), ctrl.validerPaiement);
router.put('/:id/refuser', protect, authorize('admin'), ctrl.refuserPaiement);
router.put('/:id/annuler', protect, ctrl.annulerPaiement);

module.exports = router;
