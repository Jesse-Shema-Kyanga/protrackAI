
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const users = await db.collection('users').find({}).toArray();
        const nameToId = {};
        users.forEach(u => {
            nameToId[u.name] = u.id;
        });

        const logs = await db.collection('timelogs').find({}).toArray();
        let updated = 0;
        for (const log of logs) {
            if (nameToId[log.userId]) {
                console.log(`Matching log for ${log.userId} -> ${nameToId[log.userId]}`);
                await db.collection('timelogs').updateOne({ _id: log._id }, { $set: { userId: nameToId[log.userId] } });
                updated++;
            }
        }
        console.log('Successfully updated ' + updated + ' logs');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
