const Notification = require('../models/Notification');

// GET all notifications for admin (newest first)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ targetRole: 'admin', deletedAt: null })
      .sort({ lu: 1, createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ targetRole: 'admin', lu: false, deletedAt: null });

    res.status(200).json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
      error: err.message
    });
  }
};

// GET notifications for the connected user (responsable_boutique)
exports.getMesNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ targetUser: req.user._id, deletedAt: null })
      .sort({ lu: 1, createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ targetUser: req.user._id, lu: false, deletedAt: null });

    res.status(200).json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos notifications',
      error: err.message
    });
  }
};

// PUT /api/notifications/:id/lire — mark one as read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    // Security: only admin can mark admin notifs; only the targetUser can mark their own
    if (notif.targetRole === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    if (notif.targetUser && notif.targetUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    notif.lu = true;
    await notif.save();
    res.status(200).json({ success: true, data: { notification: notif } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/lire-tout — mark all admin notifs as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ targetRole: 'admin', lu: false }, { lu: true });
    res.status(200).json({ success: true, message: 'Toutes les notifications lues' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/mes/lire-tout — mark all user notifs as read
exports.markAllMesAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ targetUser: req.user._id, lu: false }, { lu: true });
    res.status(200).json({ success: true, message: 'Toutes vos notifications lues' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
