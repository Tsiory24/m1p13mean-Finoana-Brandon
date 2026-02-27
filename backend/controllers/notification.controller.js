const Notification = require('../models/Notification');

// GET all notifications for admin (newest first)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ targetRole: 'admin' })
      .sort({ lu: 1, createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ targetRole: 'admin', lu: false });

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

// PUT /api/notifications/:id/lire — mark one as read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { lu: true },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    res.status(200).json({ success: true, data: { notification: notif } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/lire-tout — mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ targetRole: 'admin', lu: false }, { lu: true });
    res.status(200).json({ success: true, message: 'Toutes les notifications lues' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
