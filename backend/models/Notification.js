const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
      // admin: 'boutique_creation' | 'reservation_locale'
      // user:  'reservation_validee' | 'reservation_annulee' | 'boutique_validee' | 'boutique_annulee'
    },
    message: {
      type: String,
      required: true
    },
    // For admin-targeted notifications
    targetRole: {
      type: String,
      default: null
    },
    // For user-targeted notifications (responsable_boutique)
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lu: {
      type: Boolean,
      default: false
    },
    // Reference to the entity that triggered the notification
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    refModel: {
      type: String,
      enum: ['Reservation', 'Boutique', null],
      default: null
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
