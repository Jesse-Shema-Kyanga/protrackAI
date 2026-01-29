const mongoose = require('mongoose');
const User = require('./models/User');
const Leave = require('./models/Leave');
const connectDB = require('./config/db');
require('dotenv').config();

const diagnose = async () => {
    try {
        await connectDB();
        console.log("Connected to DB");

        console.log("\n--- Users matching 'worker' ---");
        const users = await User.find({
            $or: [{ name: /worker/i }, { id: /worker/i }, { email: /worker/i }]
        }).select('id name email');
        console.log(users);

        console.log("\n--- Sample Leaves ---");
        const leaves = await Leave.find().limit(5);
        console.log(leaves);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

diagnose();
