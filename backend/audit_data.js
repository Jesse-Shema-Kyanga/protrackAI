require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/protrackai');
        console.log('Connected to DB');
    } catch (err) {
        console.error('DB Connection error:', err);
        process.exit(1);
    }
};

const runDiagnostic = async () => {
    await connectDB();

    console.log('\n--- ROLE AUDIT ---');
    const roles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    console.log('Roles found:', JSON.stringify(roles, null, 2));

    console.log('\n--- ORG AUDIT ---');
    const orgs = await Organization.find();
    console.log('Organizations in DB:', JSON.stringify(orgs, null, 2));

    console.log('\n--- USER DEPT/TEAM AUDIT ---');
    const userOrgs = await User.aggregate([
        { $group: { _id: { dept: '$dept', team: '$team' }, count: { $sum: 1 } } }
    ]);
    console.log('User Dept/Team distribution:', JSON.stringify(userOrgs, null, 2));

    console.log('\n--- NULL/EMPTY CHECK ---');
    const nullRole = await User.countDocuments({ role: { $in: [null, ""] } });
    const nullDept = await User.countDocuments({ dept: { $in: [null, ""] }, role: 'employee' });
    const nullTeam = await User.countDocuments({ team: { $in: [null, ""] }, role: 'employee' });
    console.log(`Users with Null Role: ${nullRole}`);
    console.log(`Employees with Null Dept: ${nullDept}`);
    console.log(`Employees with Null Team: ${nullTeam}`);

    process.exit();
};

runDiagnostic();
