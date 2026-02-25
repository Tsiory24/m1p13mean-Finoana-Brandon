const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategorieById,
  createCategorie,
  updateCategorie,
  deleteCategorie
} = require('../controllers/categorie.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getAllCategories);
router.get('/:id', getCategorieById);
router.post('/', protect, createCategorie);
router.put('/:id', protect, updateCategorie);
router.delete('/:id', protect, deleteCategorie);

module.exports = router;
