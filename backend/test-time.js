require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://jesse:onthemoon@protrackai.ime7ent.mongodb.net/protrackai');
  const TimeLog = require('./models/TimeLog');
  
  const checkins = await TimeLog.find({ userId: 'employee_demo', type: 'check-in' }).lean();
  console.log('employee_demo Check-ins:', checkins.length);
  
  process.exit(0);
}
check();
