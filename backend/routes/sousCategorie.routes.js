const express = require('express');
const router = express.Router();
const {
  getAllSousCategories,
  getSousCategorieById,
  createSousCategorie,
  updateSousCategorie,
  deleteSousCategorie
} = require('../controllers/sousCategorie.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getAllSousCategories);
router.get('/:id', getSousCategorieById);
router.post('/', protect, createSousCategorie);
router.put('/:id', protect, updateSousCategorie);
router.delete('/:id', protect, deleteSousCategorie);

module.exports = router;
