
const mongoose = require('mongoose');
const TimeLog = require('./models/TimeLog');
const User = require('./models/User');
require('dotenv').config();

const diag = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'employee@demo.com' });
        if (!user) {
            console.log('Employee user not found');
            process.exit(0);
        }
        console.log('Found User:', user.id);
        const logs = await TimeLog.find({ userId: user.id }).sort({ timestamp: -1 }).limit(10);
        console.log('Recent Logs:', JSON.stringify(logs, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Diag failed:', err);
        process.exit(1);
    }
};
diag();
