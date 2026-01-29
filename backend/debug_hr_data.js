const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Activity = require('./models/Activity');
const TimeLog = require('./models/TimeLog');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Sample User
        const user = await User.findOne({ role: 'employee' });
        console.log('--- User Sample ---');
        console.log(JSON.stringify(user, null, 2));
        console.log(`Type of id: ${typeof user.id}`);

        // 2. Sample Activity
        const activ = await Activity.findOne();
        console.log('\n--- Activity Sample ---');
        console.log(JSON.stringify(activ, null, 2));
        console.log(`Type of userId: ${typeof activ.userId}`);

        // 3. Test Manual Lookup
        const manualLookup = await Activity.aggregate([
            { $limit: 10 },
            { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } }
        ]);
        console.log('\n--- Lookup Test (First 10) ---');
        manualLookup.forEach((item, i) => {
            console.log(`Item ${i}: userId=${item.userId}, userFound=${item.user.length > 0}`);
        });

        // 4. Check Date Range for "Month"
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        console.log(`\nDefault Date Range (Month): ${startOfMonth.toISOString()} to ${now.toISOString()}`);

        const countInRange = await Activity.countDocuments({ timestamp: { $gte: startOfMonth } });
        console.log(`Activities in range: ${countInRange}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
