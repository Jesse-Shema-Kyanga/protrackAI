
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const startOfDay = new Date('2026-01-04T00:00:00Z');

        const activities = await db.collection('activities').find({ userId: 'Sup2', timestamp: { $gte: startOfDay } }).toArray();
        console.log('--- SUP2 JAN 4 ACTIVITIES ---');
        activities.forEach(a => console.log(`App: ${a.appName}, Time: ${a.timestamp}`));

        // Also check if there were ANY failed /raw attempts in the last 30 mins
        // We can't check DB, but we can look for "ignored: true" in debug_api.log

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
