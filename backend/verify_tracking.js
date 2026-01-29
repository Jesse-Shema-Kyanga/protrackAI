const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }));
        const recent = await Activity.find({ employeeId: 'EMP004' }).sort({ timestamp: -1 }).limit(5);
        console.log('--- RECENT ACTIVITIES ---');
        console.log(JSON.stringify(recent, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
