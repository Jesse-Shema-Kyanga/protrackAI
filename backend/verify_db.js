
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await User.countDocuments();
        const users = await User.find({}, 'name email role');
        console.log(`Successfully connected to Atlas! Found ${count} users.`);
        console.log('User List:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
};
verify();
