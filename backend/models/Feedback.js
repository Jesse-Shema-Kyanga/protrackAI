const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  fromUserId: { type: String, ref: 'User' },
  toUserId: { type: String, required: true, ref: 'User' },
  content: { type: String, required: true },
  rating: Number,
  type: { type: String, enum: ['positive', 'constructive', 'goal', 'self', 'performance_review'], required: true },
  timestamp: { type: Date, default: Date.now }
});

feedbackSchema.index({ toUserId: 1, timestamp: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);