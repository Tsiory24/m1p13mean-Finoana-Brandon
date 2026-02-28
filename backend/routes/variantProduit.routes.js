const express = require('express');
const router = express.Router();
const {
  getVariantsByProduit,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  changePrixVariantOption,
  getHistoriqueVariantPrix
} = require('../controllers/variantProduit.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getVariantsByProduit);
router.get('/:id', getVariantById);
router.post('/', protect, createVariant);
router.put('/:id', protect, updateVariant);
router.delete('/:id', protect, deleteVariant);

// Historique des prix des options d'un variant
router.get('/:variantId/prix', protect, getHistoriqueVariantPrix);

// Modifier le prix_supplement d'une option spécifique
router.patch('/:variantId/options/:optionId/prix', protect, changePrixVariantOption);

module.exports = router;
