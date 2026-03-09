const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Activity = require('./models/Activity');
const User = require('./models/User');

dotenv.config();

async function seedWhatsAppTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        const employeeEmail = 'employee@demo.com';
        const user = await User.findOne({ email: employeeEmail });

        if (!user) {
            console.error('User not found: ' + employeeEmail);
            process.exit(1);
        }

        const employeeId = user.id;
        console.log(`Found user: ${user.name} (${employeeId})`);

        // 57 minutes = 3420 seconds
        const durationNeeded = 57 * 60;

        // Clear existing WhatsApp activities for today for this user to ensure precision
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        await Activity.deleteMany({
            userId: employeeId,
            appName: 'WhatsApp',
            timestamp: { $gte: startOfDay }
        });

        // Create one large activity or multiple
        // Let's create one for simplicity, the aggregator will sum it up
        await Activity.create({
            userId: employeeId,
            appName: 'WhatsApp',
            windowTitle: 'WhatsApp - Chat',
            duration: durationNeeded,
            classified: 'neutral',
            confidence: 1.0,
            timestamp: new Date()
        });

        console.log(`✅ Seeded 57 minutes of WhatsApp activity for ${user.name}.`);
        console.log(`Current WhatsApp total today: 57m 0s.`);
        console.log(`Remaining to trigger alert: 3m 0s.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedWhatsAppTest();
