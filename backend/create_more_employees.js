const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function createAndSeed() {
  try {
    await mongoose.connect('mongodb+srv://jesse:onthemoon@protrackai.ime7ent.mongodb.net/protrackai');
    console.log('Connected to MongoDB');

    const userInfo = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        name: String,
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['employee', 'supervisor', 'hr'], default: 'employee' },
        team: String,
        dept: String,
        pos: String
    });

    // Hash password middleware logic bypass - just hash manually here for speed
    const User = mongoose.model('UserSeeder', userInfo, 'users');

    const activityInfo = new mongoose.Schema({
      userId: String,
      appName: String,
      windowTitle: String,
      duration: Number,
      classified: String,
      timestamp: Date
    });
    const Activity = mongoose.model('ActivitySeeder', activityInfo, 'activities');

    const newUsers = [
        { id: 'emp_vlad', name: 'Vladimir Developer', email: 'vlad@demo.com', role: 'employee', team: 'Engineering', dept: 'IT', pos: 'Senior Dev' },
        { id: 'emp_sarah', name: 'Sarah Designer', email: 'sarah@demo.com', role: 'employee', team: 'Engineering', dept: 'IT', pos: 'UI/UX Lead' }
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const u of newUsers) {
        console.log(`Checking/Creating user ${u.id}...`);
        const existing = await User.findOne({ id: u.id });
        if (!existing) {
            await new User({ ...u, password: hashedPassword }).save();
            console.log(`Created user ${u.id}`);
        } else {
            console.log(`User ${u.id} already exists.`);
        }

        // Seed activities
        console.log(`Seeding activities for ${u.id}...`);
        await Activity.deleteMany({ userId: u.id }); // Clear old demo data for these IDs

        const apps = [
            { name: 'VS Code', title: 'protrackAI-core', classified: 'productive' },
            { name: 'Figma', title: 'Dashboard Mockups', classified: 'productive' },
            { name: 'Stack Overflow', title: 'How to fix ports', classified: 'productive' },
            { name: 'Teams', title: 'Project Sync', classified: 'neutral' },
            { name: 'Netflix', title: 'Watching movie', classified: 'non-productive' }
        ];

        const activities = [];
        const now = new Date();
        for (let i = 0; i < 40; i++) {
            const app = apps[Math.floor(Math.random() * apps.length)];
            const date = new Date();
            date.setHours(now.getHours() - Math.floor(Math.random() * 48));
            activities.push({
                userId: u.id,
                appName: app.name,
                windowTitle: app.title,
                duration: 600 + Math.floor(Math.random() * 1800),
                classified: app.classified,
                timestamp: date
            });
        }
        await Activity.insertMany(activities);
        console.log(`Seeded ${activities.length} activities for ${u.id}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAndSeed();
