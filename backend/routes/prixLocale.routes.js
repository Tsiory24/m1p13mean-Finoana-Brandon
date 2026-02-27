const express = require('express');
const router = express.Router();
const {
  getAllPrix,
  getCurrentPrix,
  getPrixById,
  createPrix,
  updatePrix,
  deletePrix
} = require('../controllers/prixLocale.controller');
const { protect, authorize } = require('../middlewares/auth');

router.get('/current', protect, getCurrentPrix);
router.get('/', protect, authorize('admin'), getAllPrix);
router.get('/:id', protect, authorize('admin'), getPrixById);
router.post('/', protect, authorize('admin'), createPrix);
router.put('/:id', protect, authorize('admin'), updatePrix);
router.delete('/:id', protect, authorize('admin'), deletePrix);

module.exports = router;
