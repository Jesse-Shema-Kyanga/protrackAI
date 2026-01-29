require('dotenv').config();
const mongoose = require('mongoose');
const TimeLog = require('./models/TimeLog');

const userId = 'EMP004';
const type = 'check-in';

async function simulatePost() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Simulate calculateLateStatus
    const calculateLateStatus = (type, timestamp) => {
        if (type !== 'check-in') return 'present';
        const time = new Date(timestamp);
        const hour = time.getHours();
        const mins = time.getMinutes();
        if (hour > 9 || (hour === 9 && mins > 30)) return 'late';
        return 'present';
    };

    const timestamp = new Date();
    const finalStatus = calculateLateStatus(type, timestamp);

    console.log(`Saving log: ${userId} | ${type} | ${finalStatus} at ${timestamp.toISOString()}`);

    const newLog = new TimeLog({ userId, type, status: finalStatus, timestamp });
    await newLog.save();

    console.log('Log saved successfully');

    // Check latest log immediately
    const latest = await TimeLog.findOne({ userId }).sort({ timestamp: -1 });
    console.log(`Latest log in DB: ${latest.timestamp.toISOString()} | ${latest.type}`);

    process.exit(0);
}

simulatePost();
