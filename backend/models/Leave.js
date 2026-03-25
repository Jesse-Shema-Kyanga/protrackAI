const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, enum: ['vacation', 'sick', 'emergency', 'bereavement', 'jury_duty', 'maternity', 'study', 'other'], default: 'vacation' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: String,
    proofDocument: String, // Path to the uploaded doctor's note / proof
    approvedBy: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
