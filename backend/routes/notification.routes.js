const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth');

// All notification routes require admin auth
router.get('/', protect, authorize('admin'), notifController.getNotifications);
router.put('/lire-tout', protect, authorize('admin'), notifController.markAllAsRead);
router.put('/:id/lire', protect, authorize('admin'), notifController.markAsRead);

module.exports = router;
