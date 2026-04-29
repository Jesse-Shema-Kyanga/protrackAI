require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({ id: String, name: String, role: String, team: String }));
    
    const users = await User.find({});
    console.log(`\nFound ${users.length} users:`);
    users.forEach(u => {
        console.log(`- ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Team: ${u.team}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listUsers();
