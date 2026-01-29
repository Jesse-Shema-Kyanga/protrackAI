const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  due: String,
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completed: { type: Boolean, default: false },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  timestamp: { type: Date, default: Date.now }
});

taskSchema.index({ userId: 1, due: 1 });

module.exports = mongoose.model('Task', taskSchema);