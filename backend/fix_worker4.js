
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const result = await db.collection('timelogs').updateMany({ userId: 'Worker 4' }, { $set: { userId: 'EMP004' } });
        console.log(`Updated ${result.modifiedCount} logs`);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
