require('dotenv').config();
const mongoose = require('mongoose');
const TimeLog = require('./models/TimeLog');
const User = require('./models/User');
const Activity = require('./models/Activity');
const Notification = require('./models/Notification');
const Leave = require('./models/Leave');

// Mock req/res
const req = {
    query: { userId: 'EMP004' }
};
const res = {
    json: (data) => {
        console.log('--- RESPONSE START ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('--- RESPONSE END ---');
    },
    status: (code) => ({
        json: (data) => console.log(`Status ${code}:`, data)
    })
};

// Import getAttendance logic (since I can't easily require it without setting up express)
const getAttendance = async (req, res) => {
    try {
        const { team, userId, startDate, endDate } = req.query;
        let matchQuery = {};
        let expectedUsers = [];

        if (team) {
            expectedUsers = await User.find({ dept: team });
        } else if (userId) {
            matchQuery.userId = userId;
            const user = await User.findOne({ id: userId }).select('id name dept');
            if (user) expectedUsers = [user];
        }

        if (startDate) matchQuery.timestamp = { ...matchQuery.timestamp, $gte: new Date(startDate) };
        if (endDate) matchQuery.timestamp = { ...matchQuery.timestamp, $lte: new Date(endDate) };

        const rawLogs = await TimeLog.find(matchQuery).sort({ timestamp: -1 }).lean();

        // Get user names for logs
        const userIds = [...new Set(rawLogs.map(l => l.userId))];
        const users = await User.find({ id: { $in: userIds } }).select('id name');
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);

        // Simplfied logs mapping for debug
        const logs = await Promise.all(rawLogs.map(async (log) => {
            if (log.type !== 'check-in') return null;
            return { type: 'check-in', timestamp: log.timestamp };
        }));

        const finalLogs = logs.filter(l => l !== null);

        // Get REAL-TIME status (most recent log ever)
        const latestRawLog = await TimeLog.findOne({ userId: matchQuery.userId || userId }).sort({ timestamp: -1 });
        const realTimeStatus = latestRawLog ? latestRawLog.type : 'check-out';

        res.json({ logs: finalLogs, realTimeStatus });
    } catch (err) {
        console.error('Error:', err);
    }
};

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    await getAttendance(req, res);
    process.exit(0);
}

run();
