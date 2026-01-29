
const mongoose = require('mongoose');
(async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');
        const db = mongoose.connection;
        const users = await db.collection('users').find({}).toArray();
        console.log('--- ALL USERS ---');
        users.forEach(u => {
            console.log(`ID: [${u.id}], Name: [${u.name}], Role: [${u.role}], Team: [${u.team}], Dept: [${u.dept}]`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
