require('dotenv').config();
const mongoose = require('mongoose');
const TimeLog = require('./models/TimeLog');

const userId = 'EMP004';

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const logs = await TimeLog.find({ userId }).sort({ timestamp: -1 });
    console.log(`Logs for ${userId}:`);
    logs.forEach(l => {
        console.log(`- ${l.timestamp.toISOString()} | ${l.type} | ${l.status}`);
    });

    process.exit(0);
}

debug();
