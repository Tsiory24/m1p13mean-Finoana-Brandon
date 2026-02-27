const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
      // 'boutique_creation' | 'reservation_locale'
    },
    message: {
      type: String,
      required: true
    },
    targetRole: {
      type: String,
      default: 'admin'
    },
    lu: {
      type: Boolean,
      default: false
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
