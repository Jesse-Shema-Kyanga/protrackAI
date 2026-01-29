const mongoose = require('mongoose');
const User = require('./backend/models/User');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/protrackai');

    const supId = 'Sup2';
    const sup = await User.findOne({ id: supId });
    console.log('Supervisor found in DB:', sup ? 'YES' : 'NO');
    if (sup) console.log('Supervisor Team:', sup.team);

    const queryTeam = 'Sales & Marketing'; // Simulating stale token
    let effectiveTeam = queryTeam;
    if (sup) effectiveTeam = sup.team || queryTeam;

    console.log('Effective Team for query:', effectiveTeam);

    const escaped = effectiveTeam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const query = {
        team: { $regex: new RegExp(`^${escaped}$`, 'i') },
        role: 'employee'
    };

    const users = await User.find(query);
    console.log('Employees found:', users.length);
    users.forEach(u => console.log(`- ${u.name} (${u.id}) [${u.role}] Team: ${u.team}`));

    await mongoose.connection.close();
}

test();
