const express = require('express');
const router = express.Router();
const {
  getAllUnites,
  getUniteById,
  createUnite,
  updateUnite,
  deleteUnite
} = require('../controllers/unite.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getAllUnites);
router.get('/:id', getUniteById);
router.post('/', protect, createUnite);
router.put('/:id', protect, updateUnite);
router.delete('/:id', protect, deleteUnite);

module.exports = router;
