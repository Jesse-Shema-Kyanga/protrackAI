const mongoose = require('mongoose');

const evalSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  assessment: { type: String, required: true },
  areasImprovement: String,
  rating: Number,
  type: { type: String, enum: ['self', 'mid-year', 'Q2'], required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  hrComment: String,
  hrRating: Number,
  reviewedBy: String,
  reviewedAt: Date,
  timestamp: { type: Date, default: Date.now }
});

evalSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Eval', evalSchema);