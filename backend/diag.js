
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;

        // Get all users
        const users = await db.collection('users').find({}).toArray();
        console.log('--- USERS ---');
        users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Team: |${u.team}|`));

        // Get recent activities (last 1 hour)
        const hourAgo = new Date(Date.now() - 3600000);
        const activities = await db.collection('activities').find({ timestamp: { $gte: hourAgo } }).toArray();
        console.log('\n--- RECENT ACTIVITIES (Last 1h) ---');
        console.log(`Count: ${activities.length}`);
        activities.slice(0, 5).forEach(a => console.log(`User: ${a.userId}, App: ${a.appName}, Time: ${a.timestamp}`));

        // Get recent logs (last 1 hour)
        const logs = await db.collection('timelogs').find({ timestamp: { $gte: hourAgo } }).toArray();
        console.log('\n--- RECENT TIMELOGS (Last 1h) ---');
        console.log(`Count: ${logs.length}`);
        logs.forEach(l => console.log(`User: ${l.userId}, Type: ${l.type}, Time: ${l.timestamp}`));

        // Check strict clock-in filter status for latest activity attempt if possible
        // We can't see "ignored" data in DB, but we can see logs

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
