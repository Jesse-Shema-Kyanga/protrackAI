
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const startOfDay = new Date('2026-01-04T00:00:00Z');

        // Activity counts by user
        const activityStats = await db.collection('activities').aggregate([
            { $match: { timestamp: { $gte: startOfDay } } },
            { $group: { _id: '$userId', count: { $sum: 1 }, totalDuration: { $sum: '$duration' } } }
        ]).toArray();

        console.log('--- JAN 4 ACTIVITY STATS ---');
        if (activityStats.length === 0) console.log('No activities found for Jan 4.');
        activityStats.forEach(s => console.log(`User: ${s._id}, Count: ${s.count}, Duration: ${s.totalDuration}s`));

        // Timelog counts by user
        const logStats = await db.collection('timelogs').aggregate([
            { $match: { timestamp: { $gte: startOfDay } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } }
        ]).toArray();

        console.log('\n--- JAN 4 TIMELOG STATS ---');
        logStats.forEach(s => console.log(`User: ${s._id}, Logs: ${s.count}`));

        // Check specific user Worker 4 (EMP004)
        const emp4Logs = await db.collection('timelogs').find({ userId: 'EMP004', timestamp: { $gte: startOfDay } }).toArray();
        console.log('\n--- EMP004 (Worker 4) JAN 4 LOGS ---');
        emp4Logs.forEach(l => console.log(`Type: ${l.type}, Time: ${l.timestamp}`));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
