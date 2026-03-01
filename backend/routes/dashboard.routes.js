const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { getStats, getLoyersStats } = require('../controllers/dashboard.controller');

// GET /api/dashboard/stats  — admin uniquement
router.get('/stats', protect, authorize('admin'), getStats);

// GET /api/dashboard/loyers-stats  — admin uniquement
router.get('/loyers-stats', protect, authorize('admin'), getLoyersStats);

module.exports = router;
