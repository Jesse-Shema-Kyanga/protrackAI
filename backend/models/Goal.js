const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  target: { type: String, required: true },
  dueDate: { type: Date, required: true },
  assignedTo: { type: String, required: true },
  createdBy: { type: String, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);