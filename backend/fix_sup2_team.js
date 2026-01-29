
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;

        // Move Sup2 to match EMP004
        const result = await db.collection('users').updateOne(
            { id: 'Sup2' },
            { $set: { team: 'Operations & Support', dept: 'Information Technology' } }
        );
        console.log(`Updated Sup2: ${result.modifiedCount} document(s)`);

        // Also ensure EMP004 is definitely in that team (just in case)
        const result2 = await db.collection('users').updateOne(
            { id: 'EMP004' },
            { $set: { team: 'Operations & Support' } }
        );
        console.log(`Verified EMP004: ${result2.modifiedCount} document(s)`);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
