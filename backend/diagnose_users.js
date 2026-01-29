const mongoose = require('mongoose');
const User = require('./models/User'); // Correct path for backend root
require('dotenv').config({ path: './.env' }); // Correct path for backend root

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({});
        console.log('--- USER DUMP ---');
        console.table(users.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            team: u.team,
            dept: u.dept
        })));

        console.log('--- TEAM ANALYSIS ---');
        const teams = {};
        users.forEach(u => {
            const t = u.team || 'Unassigned';
            if (!teams[t]) teams[t] = { supervisor: [], employee: [], hr: [] };
            if (teams[t][u.role]) teams[t][u.role].push(u.name);
            else {
                if (!teams[t].other) teams[t].other = [];
                teams[t].other.push(`${u.name} (${u.role})`);
            }
        });

        console.log('--- REGEX & ENCODING TEST ---');
        const testTeam = "Operations & Support";
        const regex = new RegExp(`^${testTeam}$`, 'i');
        console.log(`Testing Regex: ${regex}`);

        const matchingUsers = await User.find({ team: { $regex: regex } });
        console.log(`Matched via Regex: ${matchingUsers.length} users`);
        matchingUsers.forEach(u => console.log(` - Found: ${u.name} (${u.role})`));

        console.log('--- ENCODING ANALYSIS ---');
        const distinctTeams = await User.distinct('team');
        distinctTeams.forEach(t => {
            console.log(`Team: "${t}"`);
            console.log('Hex:', Buffer.from(t).toString('hex'));
        });
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
