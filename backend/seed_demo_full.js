
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
const Task = require('./models/Task');
const Goal = require('./models/Goal');
const Leave = require('./models/Leave');
const Feedback = require('./models/Feedback');
const Eval = require('./models/Eval');
const TimeLog = require('./models/TimeLog');
const Notification = require('./models/Notification');
const Activity = require('./models/Activity');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

const getRelativeDate = (days, hours = 0, mins = 0) => {
    const d = new Date();
    d.setHours(hours, mins, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
};

const getISOString = (date) => date.toISOString().split('T')[0];

const seedDemoUltimate = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('🧹 Deep cleaning database...');
        await User.deleteMany({});
        await Task.deleteMany({});
        await Goal.deleteMany({});
        await Leave.deleteMany({});
        await Feedback.deleteMany({});
        await Eval.deleteMany({});
        await TimeLog.deleteMany({});
        await Notification.deleteMany({});
        await Organization.deleteMany({});
        await Activity.deleteMany({});

        console.log('🏢 Seeding Organizations...');
        const orgs = [
            { name: "Information Technology", description: "Core technical infrastructure.", teams: ["Engineering", "IT Support"] },
            { name: "Human Resources", description: "Personnel management.", teams: ["Recruitment", "Operations"] }
        ];
        await Organization.insertMany(orgs);

        console.log('👤 Seeding Users (Strict Security Mode)...');
        const users = [
            { id: 'supervisor_demo', name: "Jesse Shema (Supervisor)", email: "supervisor@demo.com", role: "supervisor", team: "Engineering", dept: "Information Technology", pos: "Engineering Manager", password: "password123" },
            { id: 'employee_demo', name: "Alex Employee", email: "employee@demo.com", role: "employee", team: "Engineering", dept: "Information Technology", pos: "Full Stack Developer", password: "password123" },
            { id: 'hr_demo', name: "Linda HR", email: "hr@demo.com", role: "hr", team: "Recruitment", dept: "Human Resources", pos: "Head of HR", password: "password123" }
        ];
        for (const u of users) { await new User(u).save(); }

        console.log('📝 Seeding Tasks...');
        await Task.insertMany([
            { userId: 'employee_demo', title: 'Refactor AI Classifier Heuristics', status: 'done', completed: true, progress: 100, due: getISOString(getRelativeDate(-1)), assignedBy: 'supervisor_demo' },
            { userId: 'employee_demo', title: 'Verify Frontend Deployment', status: 'pending', completed: false, progress: 45, due: getISOString(getRelativeDate(1)), assignedBy: 'supervisor_demo' },
            { userId: 'employee_demo', title: 'Demo Preparation', status: 'pending', completed: false, progress: 10, due: getISOString(getRelativeDate(0)), assignedBy: 'hr_demo' }
        ]);

        console.log('🎯 Seeding Goals...');
        await Goal.create({
            title: 'Q1 Security Hardening',
            description: 'Implement strict auth and data sanitization.',
            target: '100% Compliance',
            dueDate: getRelativeDate(30),
            assignedTo: 'employee_demo',
            createdBy: 'supervisor_demo',
            progress: 90
        });

        console.log('⏰ Seeding Attendance and 📈 Activity Logs (Last 3 Days)...');
        const logs = [];
        const activities = [];

        for (let i = 1; i <= 3; i++) {
            // Clock In at 8:00 AM
            logs.push({ userId: 'employee_demo', type: 'check-in', status: 'present', timestamp: getRelativeDate(-i, 8) });

            // Seed a block of Productive Activities (coding)
            for (let h = 9; h < 12; h++) {
                activities.push({
                    userId: 'employee_demo',
                    appName: 'Visual Studio Code',
                    windowTitle: 'protrackai/backend/server.js',
                    duration: 3600, // 1 hour
                    classified: 'productive',
                    confidence: 0.95,
                    timestamp: getRelativeDate(-i, h)
                });
            }

            // Seed a block of Productive Localhost Work (testing)
            activities.push({
                userId: 'employee_demo',
                appName: 'Microsoft Edge',
                windowTitle: 'http://localhost:3000 - ProTrackAI',
                url: 'http://localhost:3000',
                duration: 1800, // 30 mins
                classified: 'productive',
                confidence: 1.0,
                timestamp: getRelativeDate(-i, 13)
            });

            // Seed a block of Non-Productive (short break)
            activities.push({
                userId: 'employee_demo',
                appName: 'Chrome',
                windowTitle: 'YouTube - Tech News',
                url: 'youtube.com',
                duration: 900, // 15 mins
                classified: 'non-productive',
                confidence: 0.9,
                timestamp: getRelativeDate(-i, 14)
            });

            // Seed a block of Neutral (System config)
            activities.push({
                userId: 'employee_demo',
                appName: 'Settings',
                windowTitle: 'Display Settings',
                duration: 300, // 5 mins
                classified: 'neutral',
                confidence: 0.8,
                timestamp: getRelativeDate(-i, 10, 30)
            });

            // Clock Out at 5:00 PM
            logs.push({ userId: 'employee_demo', type: 'check-out', status: 'present', timestamp: getRelativeDate(-i, 17) });
        }

        await TimeLog.insertMany(logs);
        await Activity.insertMany(activities);

        console.log('🏖️ Seeding Leave Requests...');
        const leaves = [
            {
                userId: 'employee_demo',
                type: 'vacation',
                startDate: getRelativeDate(10), // Future vaca
                endDate: getRelativeDate(15),
                reason: 'Annual family vacation to Zanzibar.',
                status: 'approved',
                approvedBy: 'supervisor_demo',
                timestamp: getRelativeDate(-5)
            },
            {
                userId: 'employee_demo',
                type: 'sick',
                startDate: getRelativeDate(-1), // Yesterday
                endDate: getRelativeDate(-1),
                reason: 'Flu symptoms.',
                status: 'approved',
                approvedBy: 'supervisor_demo',
                timestamp: getRelativeDate(-2)
            },
            {
                userId: 'employee_demo',
                type: 'other',
                startDate: getRelativeDate(5), // Upcoming
                endDate: getRelativeDate(5),
                reason: 'Family emergency/Personal matter.',
                status: 'pending',
                timestamp: getRelativeDate(0)
            }
        ];
        await Leave.insertMany(leaves);

        console.log('💬 Seeding Feedback & Evaluations...');
        await Feedback.create({ fromUserId: 'supervisor_demo', toUserId: 'employee_demo', content: 'Outstanding attention to database security and performance.', rating: 10, type: 'positive' });
        await Eval.create({ userId: 'employee_demo', type: 'mid-year', assessment: 'System is stable and ready for production.', status: 'completed', hrRating: 9, reviewedBy: 'hr_demo', reviewedAt: new Date() });

        console.log('\n🌟 ULTIMATE DEMO RESTORATION COMPLETE');
        console.log('===================================');
        console.log('STATUS: AUTH SECURED + ANALYTICS POPULATED');
        console.log('Email: employee@demo.com');
        console.log('Pass:  password123');
        console.log('===================================');

        process.exit(0);
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seedDemoUltimate();
