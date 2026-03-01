const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { getStats, getLoyersStats, getResponsableStats } = require('../controllers/dashboard.controller');

// GET /api/dashboard/stats  — admin uniquement
router.get('/stats', protect, authorize('admin'), getStats);

// GET /api/dashboard/loyers-stats  — admin uniquement
router.get('/loyers-stats', protect, authorize('admin'), getLoyersStats);

// GET /api/dashboard/responsable-stats  — responsable_boutique uniquement
router.get('/responsable-stats', protect, authorize('responsable_boutique'), getResponsableStats);

module.exports = router;
