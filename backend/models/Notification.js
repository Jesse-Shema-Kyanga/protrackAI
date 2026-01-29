const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // The person the alert is ABOUT (e.g. the late employee)
    targetRoleId: { type: String, enum: ['supervisor', 'hr', 'employee'] }, // Who should see this?
    type: { type: String, enum: ['late', 'absent', 'overdue', 'feedback', 'goal', 'task', 'whatsapp_prompt', 'clock_reminder', 'alert', 'evaluation', 'leave'], required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    team: String,
    dept: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

notificationSchema.index({ userId: 1, timestamp: -1 });
notificationSchema.index({ targetRoleId: 1, team: 1, timestamp: -1 });
notificationSchema.index({ targetRoleId: 1, dept: 1, timestamp: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
