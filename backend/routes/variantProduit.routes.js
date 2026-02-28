const express = require('express');
const router = express.Router();
const {
  getVariantsByProduit,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant
} = require('../controllers/variantProduit.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getVariantsByProduit);
router.get('/:id', getVariantById);
router.post('/', protect, createVariant);
router.put('/:id', protect, updateVariant);
router.delete('/:id', protect, deleteVariant);

module.exports = router;
