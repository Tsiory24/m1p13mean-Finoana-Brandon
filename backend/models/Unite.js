const mongoose = require('mongoose');

const UniteSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

UniteSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
});

module.exports = mongoose.model('Unite', UniteSchema);
