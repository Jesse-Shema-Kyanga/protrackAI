require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function testApi() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Activity = mongoose.model('Activity', new mongoose.Schema({ userId: String, timestamp: Date, classified: String, duration: Number }));
    
    // Simulate EmployeeDashboard parameters
    const userId = process.argv[2] || 'hr_demo';
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 7); // week
    const endDate = new Date();

    console.log(`\nTesting Reports API logic for ${userId}:`);
    console.log(`Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const matchQuery = { 
      userId: new RegExp(`^${userId}$`, 'i'), 
      timestamp: { $gte: startDate, $lte: endDate } 
    };

    const count = await Activity.countDocuments(matchQuery);
    console.log(`Activity Count: ${count}`);

    const stats = await Activity.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$classified', totalDuration: { $sum: '$duration' } } }
    ]);
    console.log('Stats:', JSON.stringify(stats, null, 2));

    const totalTime = stats.reduce((s, a) => s + (a.totalDuration || 0), 0);
    console.log(`Total Time: ${totalTime}s`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testApi();
