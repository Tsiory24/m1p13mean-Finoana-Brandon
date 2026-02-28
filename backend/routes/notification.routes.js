const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth');

// Admin notification routes
router.get('/', protect, authorize('admin'), notifController.getNotifications);
router.put('/lire-tout', protect, authorize('admin'), notifController.markAllAsRead);

// User (responsable_boutique) notification routes
router.get('/mes', protect, notifController.getMesNotifications);
router.put('/mes/lire-tout', protect, notifController.markAllMesAsRead);

// Mark one as read (shared — guards are inside the controller)
router.put('/:id/lire', protect, notifController.markAsRead);

module.exports = router;
