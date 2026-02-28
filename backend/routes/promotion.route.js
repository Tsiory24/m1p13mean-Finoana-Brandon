const express = require('express');
const router = express.Router();
const {
  getPromotionsActives,
  getPromotionsByBoutique,
  creerPromotion,
  terminerPromotion
} = require('../controllers/promotion.controller');
const { protect, authorize } = require('../middlewares/auth');

// ⚠️ Routes spécifiques AVANT /:id
router.get('/actives', getPromotionsActives);
router.get('/boutique', protect, authorize('responsable_boutique'), getPromotionsByBoutique);
router.post('/', protect, authorize('responsable_boutique'), creerPromotion);
router.delete('/:id', protect, authorize('responsable_boutique'), terminerPromotion);

module.exports = router;
