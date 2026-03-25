const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  type: { type: String, enum: ['check-in', 'check-out'], required: true },
  status: { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  reason: { type: String }, // For break justifications
  timestamp: { type: Date, default: Date.now }
});

timeLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);