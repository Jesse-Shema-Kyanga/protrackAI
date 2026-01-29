
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await db.collection('timelogs').find({ timestamp: { $gte: today } }).toArray();
        console.log('--- JAN 4 LOGS ---');
        logs.forEach(l => console.log(`User: ${l.userId}, Type: ${l.type}, Time: ${l.timestamp}`));

        const activities = await db.collection('activities').find({ timestamp: { $gte: today } }).toArray();
        console.log('\n--- JAN 4 ACTIVITIES ---');
        console.log(`Count: ${activities.length}`);
        activities.forEach(a => console.log(`User: ${a.userId}, App: ${a.appName}`));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
