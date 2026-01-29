const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  appName: String,
  windowTitle: String,
  url: String,
  duration: { type: Number, required: true },
  classified: { type: String, enum: ['productive', 'non-productive', 'neutral', 'unknown', 'review_required'], required: true },
  confidence: { type: Number, default: 0 },
  isReviewed: { type: Boolean, default: false },
  manualOverride: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

activitySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);