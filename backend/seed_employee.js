const mongoose = require('mongoose');

async function seedEmployeeData() {
  try {
    await mongoose.connect('mongodb+srv://jesse:onthemoon@protrackai.ime7ent.mongodb.net/protrackai');
    console.log('Connected to MongoDB');

    const Activity = mongoose.model('Activity', new mongoose.Schema({
      userId: String,
      appName: String,
      windowTitle: String,
      duration: Number,
      classified: String,
      timestamp: Date
    }));

    const userId = 'employee_demo';
    
    // Delete existing RECENT activities to avoid duplicates if re-run
    const now = new Date();
    const startTime = new Date();
    startTime.setDate(now.getDate() - 3); // Last 3 days

    console.log(`Clearing recent activities for ${userId}...`);
    await Activity.deleteMany({ userId, timestamp: { $gte: startTime } });

    const apps = [
      { name: 'VS Code', title: 'server.js - protrackAI', classified: 'productive' },
      { name: 'Google Chrome', title: 'GitHub - Pull Requests', classified: 'productive' },
      { name: 'Postman', title: 'Testing API Endpoints', classified: 'productive' },
      { name: 'Terminal', title: 'npm run dev', classified: 'productive' },
      { name: 'Slack', title: 'Team Sync', classified: 'neutral' },
      { name: 'YouTube', title: 'JavaScript Tutorial', classified: 'neutral' },
      { name: 'Solitaire', title: 'Game', classified: 'non-productive' }
    ];

    const newActivities = [];
    for (let i = 0; i < 60; i++) {
        const app = apps[Math.floor(Math.random() * apps.length)];
        const date = new Date();
        date.setHours(now.getHours() - Math.floor(Math.random() * 72)); // Spread over 3 days
        
        newActivities.push({
            userId,
            appName: app.name,
            windowTitle: app.title,
            duration: 300 + Math.floor(Math.random() * 1200), // 5-25 mins
            classified: app.classified,
            timestamp: date
        });
    }

    await Activity.insertMany(newActivities);
    console.log(`Successfully seeded ${newActivities.length} activities for ${userId}!`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedEmployeeData();
