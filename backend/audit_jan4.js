
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const startOfDay = new Date('2026-01-04T00:00:00Z');

        // Find EVERY activity from today
        const allActivities = await db.collection('activities').find({ timestamp: { $gte: startOfDay } }).toArray();
        console.log(`Total Jan 4 Activities: ${allActivities.length}`);

        const userSummary = {};
        allActivities.forEach(a => {
            userSummary[a.userId] = (userSummary[a.userId] || 0) + 1;
        });
        console.log('Activities per User:', userSummary);

        // Find EVERY timelog from today
        const allLogs = await db.collection('timelogs').find({ timestamp: { $gte: startOfDay } }).toArray();
        console.log(`\nTotal Jan 4 Timelogs: ${allLogs.length}`);
        allLogs.forEach(l => console.log(`[LOG] User: ${l.userId}, Type: ${l.type}, Time: ${l.timestamp}`));

        // Check if there are ANY activities for users not in the 'users' collection
        const users = await db.collection('users').find({}).toArray();
        const userIds = new Set(users.map(u => u.id));

        allActivities.forEach(a => {
            if (!userIds.has(a.userId)) {
                console.log(`[ROGUE ACTIVITY] User: ${a.userId} (Not in User collection!)`);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
