const express = require('express');
const router = express.Router();
const { addMouvement, getStockByBoutique, getMouvementsByBoutique } = require('../controllers/stock.controller');
const { protect, authorize } = require('../middlewares/auth');

router.post('/mouvement', protect, authorize('admin', 'responsable_boutique'), addMouvement);
router.get('/boutique/:boutiqueId', protect, getStockByBoutique);
router.get('/mouvements/:boutiqueId', protect, getMouvementsByBoutique);

module.exports = router;
