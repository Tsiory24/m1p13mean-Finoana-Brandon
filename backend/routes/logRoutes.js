const express = require('express');
const router = express.Router();
const { getAllLogs, getUserLogs, getLogStats } = require('../controllers/logController');
const { protect, authorize } = require('../middlewares/auth');

// Toutes les routes de logs nécessitent une authentification
router.use(protect);

// Routes réservées aux admins
router.get('/', authorize('admin'), getAllLogs);

// Route accessible à l'admin ou à l'utilisateur lui-même
router.get('/user/:userId', getUserLogs);

module.exports = router;
