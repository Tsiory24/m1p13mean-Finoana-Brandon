const express = require('express');
const router = express.Router();
const {
  getAllProduits,
  getProduitById,
  getProduitBySlug,
  createProduit,
  updateProduit,
  deleteProduit
} = require('../controllers/produit.controller');
const { getHistoriquePrixByProduit } = require('../controllers/prixProduit.controller');
const { protect } = require('../middlewares/auth');

router.get('/', getAllProduits);
router.get('/by-slug/:slug', getProduitBySlug);
router.get('/:id', getProduitById);
router.post('/', protect, createProduit);
router.put('/:id', protect, updateProduit);
router.delete('/:id', protect, deleteProduit);

// Historique des prix d'un produit
router.get('/:produitId/prix', protect, getHistoriquePrixByProduit);

module.exports = router;
