const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  delaiResoumissionAffiche: {
    type: Number,
    default: 7
  },
  maxProduitsAffiche: {
    type: Number,
    default: 10
  },
  updatedAt: {
    type: Date,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

module.exports = mongoose.model('Config', ConfigSchema);
