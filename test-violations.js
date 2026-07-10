require('dotenv').config({ path: __dirname + '/backend/.env' });
const mongoose = require('mongoose');
const Activity = require('./backend/models/Activity');
const TimeLog = require('./backend/models/TimeLog');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        // --- VLAD: Chronic lateness (4 lates), borderline productivity ---
        console.log('Seeding violations for Vlad Petrescu...');
        for (let i = 0; i < 4; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(10, 15, 0); // 10:15 AM — very late
            await TimeLog.create({ userId: 'vlad_demo', type: 'check-in', status: 'late', timestamp: d });
        }
        // Low productivity: mostly non-productive
        const vBase = new Date(); vBase.setHours(11, 0, 0);
        await Activity.create({ userId: 'vlad_demo', appName: 'YouTube', windowTitle: 'Watching videos', duration: 5400, classified: 'non-productive', timestamp: vBase });
        await Activity.create({ userId: 'vlad_demo', appName: 'Reddit', windowTitle: 'Reddit Feed', duration: 3600, classified: 'non-productive', timestamp: new Date(vBase.getTime() - 5000) });
        await Activity.create({ userId: 'vlad_demo', appName: 'VS Code', windowTitle: 'main.js', duration: 2400, classified: 'productive', timestamp: new Date(vBase.getTime() - 9000) });

        // --- SARAH: Low productivity (not many lates, but efficiency tanks) ---
        console.log('Seeding violations for Sarah Uwimana...');
        for (let i = 0; i < 2; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(9, 40, 0); // 9:40 AM — late
            await TimeLog.create({ userId: 'sarah_demo', type: 'check-in', status: 'late', timestamp: d });
        }
        const sBase = new Date(); sBase.setHours(11, 30, 0);
        await Activity.create({ userId: 'sarah_demo', appName: 'Facebook', windowTitle: 'Facebook Feed', duration: 7200, classified: 'non-productive', timestamp: sBase });
        await Activity.create({ userId: 'sarah_demo', appName: 'TikTok', windowTitle: 'TikTok', duration: 5400, classified: 'non-productive', timestamp: new Date(sBase.getTime() - 5000) });
        await Activity.create({ userId: 'sarah_demo', appName: 'Slack', windowTitle: 'Slack messages', duration: 1200, classified: 'productive', timestamp: new Date(sBase.getTime() - 9000) });

        console.log('Done! All 3 employees now have violations seeded.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
});
