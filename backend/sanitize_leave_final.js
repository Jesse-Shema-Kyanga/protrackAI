const mongoose = require('mongoose');
const Leave = require('./models/Leave');
const connectDB = require('./config/db');
require('dotenv').config();

const sanitize = async () => {
    try {
        await connectDB();
        console.log("Connected to DB");

        const userId = 'EMP004';
        const professionalReasons = [
            "Medical Leave - Doctor's Orders",
            "Family Emergency - Urgent",
            "Annual Vacation Request",
            "Personal Development Seminar",
            "Relocation - Moving Days"
        ];

        const leaves = await Leave.find({ userId: userId });
        console.log(`Found ${leaves.length} leaves for ${userId}`);

        for (let i = 0; i < leaves.length; i++) {
            const reason = professionalReasons[i % professionalReasons.length];
            leaves[i].reason = reason;
            leaves[i].type = reason.includes("Emergency") ? 'emergency' : reason.includes("Medical") ? 'sick' : 'vacation';
            // Ensure status is approved for screenshots if not already (user implied they were approved)
            leaves[i].status = 'approved';

            await leaves[i].save();
            console.log(`Updated leave ${leaves[i]._id} to: "${reason}"`);
        }

        console.log("Sanitization complete");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

sanitize();
