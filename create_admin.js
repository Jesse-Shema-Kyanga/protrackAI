const mongoose = require('mongoose');
const User = require('./backend/models/User');

async function createAdmin() {
  try {
    await mongoose.connect('mongodb+srv://jesse:onthemoon@protrackai.ime7ent.mongodb.net/protrackai');
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ email: 'admin@mtn.co.rw' });
    if (admin) {
        console.log("Admin user found! Ensuring role is 'admin'...");
        admin.role = 'admin';
        // force password reset for reliability
        admin.password = 'password123';
        await admin.save();
    } else {
        admin = new User({
            id: 'ADM001',
            name: 'System Administrator',
            email: 'admin@mtn.co.rw',
            password: 'password123',
            role: 'admin'
        });
        await admin.save();
        console.log("Created entirely new admin user.");
    }

    console.log("--- ADMIN PROVISIONED ---");
    console.log("Email: admin@mtn.co.rw");
    console.log("Password: password123");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
