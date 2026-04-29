/**
 * ProtrackAI — Defense Demo Seeder
 * Generates 20 days of rich, realistic data for ALL users:
 *   - Alex Employee (employee@demo.com)
 *   - Vlad Employee (vlad@demo.com)
 *   - Sarah Employee (sarah@demo.com)
 *   - Jesse Supervisor (supervisor@demo.com)
 *   - Linda HR (hr@demo.com)
 * Password for all: password123
 */

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

// ─── Helpers ────────────────────────────────────────────

// Returns a Date object for N days ago at a specific hour:minute
const daysAgo = (n, hour = 9, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, min, 0, 0);
    return d;
};

// Skip weekends
const isWeekend = (daysBack) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const day = d.getDay(); // 0=Sun, 6=Sat
    return day === 0 || day === 6;
};

// ─── Activity Templates ─────────────────────────────────

const productiveBlocks = [
    { appName: 'Visual Studio Code', windowTitle: 'protrackAI/backend/routes/activities.js', url: null, confidence: 0.97 },
    { appName: 'Visual Studio Code', windowTitle: 'protrackAI/frontend/src/pages/EmployeeDashboard.jsx', url: null, confidence: 0.97 },
    { appName: 'Visual Studio Code', windowTitle: 'protrackAI/backend/ai/classifier.js', url: null, confidence: 0.97 },
    { appName: 'Google Chrome', windowTitle: 'React Documentation - Hooks API', url: 'https://react.dev/reference/react', confidence: 0.91 },
    { appName: 'Google Chrome', windowTitle: 'MongoDB Aggregation Pipeline Docs', url: 'https://www.mongodb.com/docs/manual/aggregation/', confidence: 0.92 },
    { appName: 'Google Chrome', windowTitle: 'Stack Overflow - Express JWT middleware', url: 'https://stackoverflow.com/questions/express-jwt', confidence: 0.88 },
    { appName: 'Google Chrome', windowTitle: 'localhost:5173 - ProTrackAI App', url: 'http://localhost:5173', confidence: 1.0 },
    { appName: 'Postman', windowTitle: 'ProTrackAI API Collection - Testing /api/activities', url: null, confidence: 0.96 },
    { appName: 'Google Chrome', windowTitle: 'GitHub - protrackAI - Pull Request #14', url: 'https://github.com/Jesse-Shema-Kyanga/protrackAI', confidence: 0.94 },
    { appName: 'Google Chrome', windowTitle: 'YouTube - TensorFlow.js Tutorial - Build Neural Networks', url: 'https://youtube.com/watch?v=tensorflow-tutorial', confidence: 0.85 },
    { appName: 'Microsoft Teams', windowTitle: 'Teams - Engineering Meeting - MTN Rwanda IT Dept', url: null, confidence: 0.96 },
    { appName: 'Google Chrome', windowTitle: 'Node.js v18 Documentation - EventEmitter', url: 'https://nodejs.org/docs', confidence: 0.90 },
];

const nonProductiveBlocks = [
    { appName: 'Google Chrome', windowTitle: 'YouTube - Top 10 Funniest Fails Compilation 2024', url: 'https://youtube.com/watch?v=funnyfails', confidence: 0.92 },
    { appName: 'Google Chrome', windowTitle: 'Twitter/X - Home Timeline', url: 'https://twitter.com/home', confidence: 0.99 },
    { appName: 'Google Chrome', windowTitle: 'Instagram - Explore Feed', url: 'https://instagram.com/explore', confidence: 0.99 },
    { appName: 'Google Chrome', windowTitle: 'Reddit - r/funny - Top Posts', url: 'https://reddit.com/r/funny', confidence: 0.94 },
    { appName: 'Google Chrome', windowTitle: 'Facebook - News Feed', url: 'https://facebook.com', confidence: 0.99 },
];

const neutralBlocks = [
    { appName: 'Windows Explorer', windowTitle: 'Documents - File Explorer', url: null, confidence: 0.85 },
    { appName: 'Settings', windowTitle: 'Display Settings - Windows', url: null, confidence: 0.82 },
    { appName: 'Calculator', windowTitle: 'Calculator', url: null, confidence: 0.80 },
    { appName: 'Google Chrome', windowTitle: 'New Tab', url: null, confidence: 0.80 },
];

// ─── Generate Activities for a user for N days ─────────

const generateActivities = (userId, daysCount, productivityProfile) => {
    const activities = [];

    for (let day = 1; day <= daysCount; day++) {
        if (isWeekend(day)) continue;

        // productivityProfile: 'high' | 'average' | 'low'
        let productiveHours, nonProductiveHours;
        if (productivityProfile === 'high') {
            productiveHours = 6 + Math.floor(Math.random() * 2); // 6-7h
            nonProductiveHours = 1;
        } else if (productivityProfile === 'average') {
            productiveHours = 4 + Math.floor(Math.random() * 2); // 4-5h
            nonProductiveHours = 2;
        } else { // low
            productiveHours = 1; // 1h
            nonProductiveHours = 5;
        }

        // Morning productive block (9am - 12pm)
        for (let h = 9; h < 9 + Math.min(productiveHours, 3); h++) {
            const template = productiveBlocks[Math.floor(Math.random() * productiveBlocks.length)];
            activities.push({
                userId,
                appName: template.appName,
                windowTitle: template.windowTitle,
                url: template.url,
                duration: 3600,
                classified: 'productive',
                confidence: template.confidence,
                timestamp: daysAgo(day, h, Math.floor(Math.random() * 30)),
            });
        }

        // Short non-productive break (12:15pm)
        const npTemplate = nonProductiveBlocks[Math.floor(Math.random() * nonProductiveBlocks.length)];
        activities.push({
            userId,
            appName: npTemplate.appName,
            windowTitle: npTemplate.windowTitle,
            url: npTemplate.url,
            duration: 900,
            classified: 'non-productive',
            confidence: npTemplate.confidence,
            timestamp: daysAgo(day, 12, 15),
        });

        // Afternoon productive block (1pm - 4pm)
        for (let h = 13; h < 13 + Math.min(productiveHours - 3, 3); h++) {
            const template = productiveBlocks[Math.floor(Math.random() * productiveBlocks.length)];
            activities.push({
                userId,
                appName: template.appName,
                windowTitle: template.windowTitle,
                url: template.url,
                duration: 3600,
                classified: 'productive',
                confidence: template.confidence,
                timestamp: daysAgo(day, h, Math.floor(Math.random() * 30)),
            });
        }

        // Neutral (settings / file explorer etc)
        if (Math.random() > 0.5) {
            const nTemplate = neutralBlocks[Math.floor(Math.random() * neutralBlocks.length)];
            activities.push({
                userId,
                appName: nTemplate.appName,
                windowTitle: nTemplate.windowTitle,
                url: nTemplate.url,
                duration: 300,
                classified: 'neutral',
                confidence: nTemplate.confidence,
                timestamp: daysAgo(day, 10, 30),
            });
        }

        // Extra non-productive if low profile
        if (productivityProfile === 'low' && nonProductiveHours > 1) {
            for (let i = 0; i < 4; i++) {
                const npTemplate2 = nonProductiveBlocks[Math.floor(Math.random() * nonProductiveBlocks.length)];
                activities.push({
                    userId,
                    appName: npTemplate2.appName,
                    windowTitle: npTemplate2.windowTitle,
                    url: npTemplate2.url,
                    duration: 3600, // 4 additional hours of non-productive browsing
                    classified: 'non-productive',
                    confidence: npTemplate2.confidence,
                    timestamp: daysAgo(day, 13 + i, 0),
                });
            }
        }
    }

    return activities;
};

// ─── Generate TimeLogs (check-in / check-out) ──────────

const generateTimeLogs = (userId, daysCount, isLateOccasionally = false) => {
    const logs = [];
    for (let day = 1; day <= daysCount; day++) {
        if (isWeekend(day)) continue;

        const lateToday = isLateOccasionally && Math.random() < 0.2;
        const checkInHour = lateToday ? 9 : 8;
        const checkInMin = lateToday ? Math.floor(Math.random() * 30) + 15 : Math.floor(Math.random() * 20);
        const checkOutHour = 17 + (Math.random() < 0.3 ? 1 : 0); // sometimes 6pm

        logs.push({ userId, type: 'check-in', status: lateToday ? 'late' : 'present', timestamp: daysAgo(day, checkInHour, checkInMin) });
        logs.push({ userId, type: 'check-out', status: 'present', timestamp: daysAgo(day, checkOutHour, Math.floor(Math.random() * 30)), reason: 'End of Day' });
    }
    return logs;
};

// ─── Main Seeder ────────────────────────────────────────

const seed = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Wiping existing data...');
        await Promise.all([
            User.deleteMany({}),
            Organization.deleteMany({}),
            Task.deleteMany({}),
            Goal.deleteMany({}),
            Leave.deleteMany({}),
            Feedback.deleteMany({}),
            Eval.deleteMany({}),
            TimeLog.deleteMany({}),
            Notification.deleteMany({}),
            Activity.deleteMany({}),
        ]);

        // ── Organizations ──────────────────────────────
        console.log('🏢 Seeding organizations...');
        await Organization.insertMany([
            { name: 'Information Technology', description: 'Core technical infrastructure and software engineering.', teams: ['Engineering', 'IT Support'] },
            { name: 'Human Resources', description: 'People operations, recruitment, and employee development.', teams: ['Recruitment', 'HR Operations'] },
            { name: 'Sales & Marketing', description: 'Revenue growth and brand management.', teams: ['Sales', 'Marketing'] },
        ]);

        // ── Users ──────────────────────────────────────
        console.log('👤 Seeding users...');
        const userData = [
            { id: 'employee_demo', name: 'Alex Employee',          email: 'employee@demo.com',    role: 'employee',   team: 'Engineering',   dept: 'Information Technology', pos: 'Full Stack Developer',  password: 'password123' },
            { id: 'vlad_demo',    name: 'Vlad Petrescu',           email: 'vlad@demo.com',         role: 'employee',   team: 'Engineering',   dept: 'Information Technology', pos: 'Backend Engineer',      password: 'password123' },
            { id: 'sarah_demo',   name: 'Sarah Uwimana',           email: 'sarah@demo.com',        role: 'employee',   team: 'IT Support',    dept: 'Information Technology', pos: 'IT Support Specialist', password: 'password123' },
            { id: 'sup_demo',     name: 'Jesse Shema (Supervisor)', email: 'supervisor@demo.com',   role: 'supervisor', team: 'Engineering',   dept: 'Information Technology', pos: 'Engineering Manager',   password: 'password123' },
            { id: 'hr_demo',      name: 'Linda HR',                email: 'hr@demo.com',           role: 'hr',         team: 'HR Operations', dept: 'Human Resources',        pos: 'Head of HR',            password: 'password123' },
        ];
        for (const u of userData) { await new User(u).save(); }
        console.log(`   ✓ ${userData.length} users created`);

        // ── Activities + TimeLogs ──────────────────────
        console.log('📊 Generating 20 days of activities and timelogs...');

        // Alex — high performer
        const alexActivities = generateActivities('employee_demo', 20, 'high');
        const alexLogs = generateTimeLogs('employee_demo', 20, false);

        // Vlad — average performer
        const vladActivities = generateActivities('vlad_demo', 20, 'average');
        const vladLogs = generateTimeLogs('vlad_demo', 20, true);

        // Sarah — lower performer (for contrast)
        const sarahActivities = generateActivities('sarah_demo', 20, 'low');
        const sarahLogs = generateTimeLogs('sarah_demo', 20, true);

        // Supervisor (Jesse) — active but more meetings/docs
        const supActivities = [
            ...Array.from({ length: 10 }, (_, i) => ({
                userId: 'sup_demo',
                appName: 'Microsoft Teams',
                windowTitle: 'Teams - Engineering Sprint Review - MTN Rwanda',
                url: null,
                duration: 5400,
                classified: 'productive',
                confidence: 0.96,
                timestamp: daysAgo(i + 1, 10, 0),
            })),
            ...Array.from({ length: 8 }, (_, i) => ({
                userId: 'sup_demo',
                appName: 'Google Chrome',
                windowTitle: 'ProTrackAI - Supervisor Dashboard - localhost:5173',
                url: 'http://localhost:5173/supervisor-dashboard',
                duration: 1800,
                classified: 'productive',
                confidence: 1.0,
                timestamp: daysAgo(i + 1, 14, 0),
            })),
            ...Array.from({ length: 5 }, (_, i) => ({
                userId: 'sup_demo',
                appName: 'Google Chrome',
                windowTitle: 'YouTube - Agile Sprint Planning Best Practices 2024',
                url: 'https://youtube.com/watch?v=agile-tutorial',
                duration: 1800,
                classified: 'productive',
                confidence: 0.86,
                timestamp: daysAgo(i + 1, 11, 0),
            })),
        ];
        const supLogs = generateTimeLogs('sup_demo', 20, false);

        // HR Linda — uses org tools
        const hrActivities = [
            ...Array.from({ length: 10 }, (_, i) => ({
                userId: 'hr_demo',
                appName: 'Google Chrome',
                windowTitle: 'ProTrackAI - HR Dashboard - HR Workforce Intelligence',
                url: 'http://localhost:5173/hr-dashboard',
                duration: 5400,
                classified: 'productive',
                confidence: 1.0,
                timestamp: daysAgo(i + 1, 9, 0),
            })),
            ...Array.from({ length: 6 }, (_, i) => ({
                userId: 'hr_demo',
                appName: 'Google Chrome',
                windowTitle: 'LinkedIn Recruiter - Software Engineering Candidates - MTN Rwanda',
                url: 'https://linkedin.com/talent/hire',
                duration: 3600,
                classified: 'productive',
                confidence: 0.95,
                timestamp: daysAgo(i + 1, 13, 0),
            })),
            ...Array.from({ length: 4 }, (_, i) => ({
                userId: 'hr_demo',
                appName: 'Google Chrome',
                windowTitle: 'YouTube - HR Management Best Practices | Employee Engagement',
                url: 'https://youtube.com/watch?v=hr-tutorial',
                duration: 1800,
                classified: 'productive',
                confidence: 0.87,
                timestamp: daysAgo(i + 2, 15, 0),
            })),
            {
                userId: 'hr_demo',
                appName: 'Google Chrome',
                windowTitle: 'Instagram - Explore Feed',
                url: 'https://instagram.com/explore',
                duration: 900,
                classified: 'non-productive',
                confidence: 0.99,
                timestamp: daysAgo(3, 12, 30),
            },
        ];
        const hrLogs = generateTimeLogs('hr_demo', 20, false);

        await Activity.insertMany([
            ...alexActivities, ...vladActivities, ...sarahActivities,
            ...supActivities, ...hrActivities,
        ]);
        await TimeLog.insertMany([
            ...alexLogs, ...vladLogs, ...sarahLogs,
            ...supLogs, ...hrLogs,
        ]);
        console.log('   ✓ Activities and timelogs inserted');

        // ── Tasks ──────────────────────────────────────
        console.log('📝 Seeding tasks...');
        await Task.insertMany([
            // Alex
            { userId: 'employee_demo', title: 'Refactor AI Classifier Heuristics',         status: 'done',        completed: true,  progress: 100, due: new Date(Date.now() - 3*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'employee_demo', title: 'Integrate Socket.IO Notification System',    status: 'done',        completed: true,  progress: 100, due: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'employee_demo', title: 'Build Employee Self-Evaluation Portal',      status: 'pending', completed: false, progress: 75,  due: new Date(Date.now() + 2*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'employee_demo', title: 'Defense Demo Preparation',                   status: 'pending', completed: false, progress: 60,  due: new Date().toISOString().split('T')[0],                        assignedBy: 'hr_demo' },
            { userId: 'employee_demo', title: 'Write Unit Tests for Productivity Reports',  status: 'pending',     completed: false, progress: 0,   due: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            // Vlad
            { userId: 'vlad_demo', title: 'Optimize MongoDB Aggregation Queries',           status: 'done',        completed: true,  progress: 100, due: new Date(Date.now() - 5*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'vlad_demo', title: 'Set Up CI/CD Pipeline for Backend',              status: 'pending', completed: false, progress: 40,  due: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'vlad_demo', title: 'Document REST API Endpoints',                    status: 'pending',     completed: false, progress: 10,  due: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            // Sarah
            { userId: 'sarah_demo', title: 'Resolve IT Support Tickets — Batch 12',        status: 'done',        completed: true,  progress: 100, due: new Date(Date.now() - 2*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'sarah_demo', title: 'Update Internal IT Knowledge Base',             status: 'pending', completed: false, progress: 30,  due: new Date(Date.now() + 4*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
            { userId: 'sarah_demo', title: 'Network Infrastructure Audit',                  status: 'pending',     completed: false, progress: 0,   due: new Date(Date.now() + 10*86400000).toISOString().split('T')[0], assignedBy: 'sup_demo' },
        ]);
        console.log('   ✓ Tasks inserted');

        // ── Goals ──────────────────────────────────────
        console.log('🎯 Seeding goals...');
        await Goal.insertMany([
            { title: 'Q2 Security Hardening',       description: 'Implement JWT auth hardening, TLS on all endpoints, and input validation across the full API.', target: '100% API coverage secured',    dueDate: daysAgo(-30), assignedTo: 'employee_demo', createdBy: 'sup_demo', progress: 90 },
            { title: 'AI Classifier Accuracy >90%', description: 'Improve the neural network classifier accuracy to exceed 90% on ambiguous cases through data augmentation.', target: '90%+ accuracy',  dueDate: daysAgo(-15), assignedTo: 'employee_demo', createdBy: 'sup_demo', progress: 85 },
            { title: 'Q2 Backend Performance',      description: 'Reduce average API response time below 200ms and optimize all MongoDB queries with proper indexing.', target: '<200ms avg response',    dueDate: daysAgo(-20), assignedTo: 'vlad_demo',     createdBy: 'sup_demo', progress: 70 },
            { title: 'IT Ticket Resolution SLA',    description: 'Resolve 95% of IT support tickets within 24 hours of submission.', target: '95% within 24h',                                            dueDate: daysAgo(-10), assignedTo: 'sarah_demo',    createdBy: 'sup_demo', progress: 65 },
            { title: 'Q2 Team Productivity Target', description: 'Maintain engineering team average productivity score above 75% for the full quarter.', target: '>75% team avg',                          dueDate: daysAgo(-30), assignedTo: 'sup_demo',      createdBy: 'hr_demo',  progress: 80 },
            { title: 'HR Onboarding Process Update',description: 'Update onboarding documentation and digital workflow for new engineering hires.', target: 'Full onboarding package delivered',            dueDate: daysAgo(-20), assignedTo: 'hr_demo',       createdBy: 'hr_demo',  progress: 55 },
        ]);
        console.log('   ✓ Goals inserted');

        // ── Leave Requests ─────────────────────────────
        console.log('🏖️ Seeding leave requests...');
        await Leave.insertMany([
            { userId: 'employee_demo', type: 'vacation', startDate: daysAgo(-10), endDate: daysAgo(-14), reason: 'Annual family vacation.',             status: 'approved', approvedBy: 'sup_demo',  timestamp: daysAgo(20) },
            { userId: 'employee_demo', type: 'sick',     startDate: daysAgo(3),   endDate: daysAgo(3),   reason: 'Flu symptoms, fever.',                status: 'approved', approvedBy: 'sup_demo',  timestamp: daysAgo(4) },
            { userId: 'employee_demo', type: 'other',    startDate: daysAgo(-5),  endDate: daysAgo(-5),  reason: 'Personal matter — family commitment.',status: 'pending',                            timestamp: daysAgo(2) },
            { userId: 'vlad_demo',     type: 'sick',     startDate: daysAgo(5),   endDate: daysAgo(5),   reason: 'Migraine.',                           status: 'approved', approvedBy: 'sup_demo',  timestamp: daysAgo(6) },
            { userId: 'sarah_demo',    type: 'vacation', startDate: daysAgo(-7),  endDate: daysAgo(-10), reason: 'Family holiday.',                     status: 'approved', approvedBy: 'sup_demo',  timestamp: daysAgo(15) },
            { userId: 'sarah_demo',    type: 'other',    startDate: daysAgo(-2),  endDate: daysAgo(-2),  reason: 'Medical appointment.',                status: 'pending',                            timestamp: daysAgo(1) },
        ]);
        console.log('   ✓ Leave requests inserted');

        // ── Feedback & Evaluations ─────────────────────
        console.log('💬 Seeding feedback and evaluations...');
        await Feedback.insertMany([
            { fromUserId: 'sup_demo', toUserId: 'employee_demo', content: 'Alex consistently delivers clean, well-documented code. The AI classifier refactor was excellent — reduced false positives by a significant margin.', rating: 9, type: 'positive' },
            { fromUserId: 'sup_demo', toUserId: 'vlad_demo',     content: "Vlad's backend query optimizations cut dashboard load time in half. Keep up the strong technical output.", rating: 8, type: 'positive' },
            { fromUserId: 'sup_demo', toUserId: 'sarah_demo',    content: 'Sarah should focus on reducing ticket resolution time. Recent SLA metrics show room for improvement.', rating: 6, type: 'constructive' },
            { fromUserId: 'hr_demo',  toUserId: 'sup_demo',      content: "Jesse's leadership of the Engineering team has been outstanding. Team productivity metrics are the best in the organization.", rating: 10, type: 'positive' },
        ]);

        await Eval.insertMany([
            { userId: 'employee_demo', type: 'mid-year', assessment: 'I have completed the AI classifier refactor and Socket.IO integration ahead of schedule. My goal for next quarter is to improve test coverage across all modules.', status: 'completed', hrRating: 9,  reviewedBy: 'hr_demo', timestamp: daysAgo(12), reviewedAt: daysAgo(10) },
            { userId: 'vlad_demo',     type: 'mid-year', assessment: 'Query optimizations are complete. I want to focus on CI/CD pipeline automation in the coming quarter.',                                                          status: 'completed', hrRating: 8,  reviewedBy: 'hr_demo', timestamp: daysAgo(11), reviewedAt: daysAgo(8) },
            { userId: 'sarah_demo',    type: 'mid-year', assessment: 'I am working on improving ticket resolution time. The backlog has been a challenge but I have a new prioritization system in place.',                            status: 'pending',   hrRating: null, reviewedBy: null, timestamp: daysAgo(2), reviewedAt: null },
        ]);
        console.log('   ✓ Feedback and evaluations inserted');

        // ── Notifications ──────────────────────────────
        console.log('🔔 Seeding notifications...');
        await Notification.insertMany([
            { userId: 'employee_demo', targetRoleId: 'employee', message: 'New goal assigned: Q2 Security Hardening',              type: 'goal',     read: false, timestamp: daysAgo(15) },
            { userId: 'employee_demo', targetRoleId: 'employee', message: 'Your leave request (Sick) has been approved.',           type: 'leave',    read: true,  timestamp: daysAgo(3) },
            { userId: 'employee_demo', targetRoleId: 'employee', message: 'Supervisor feedback received — rating: 9/10',            type: 'feedback', read: false, timestamp: daysAgo(10) },
            { userId: 'employee_demo', targetRoleId: 'employee', message: 'New task assigned: Defense Demo Preparation',            type: 'task',     read: false, timestamp: daysAgo(1) },
            { userId: 'vlad_demo',     targetRoleId: 'employee', message: 'New goal assigned: Q2 Backend Performance',             type: 'goal',     read: true,  timestamp: daysAgo(12) },
            { userId: 'vlad_demo',     targetRoleId: 'employee', message: 'New task assigned: Set Up CI/CD Pipeline for Backend',  type: 'task',     read: false, timestamp: daysAgo(5) },
            { userId: 'sarah_demo',    targetRoleId: 'supervisor', message: 'Your self-evaluation is pending HR review.',             type: 'evaluation',     read: false, timestamp: daysAgo(2) },
            { userId: 'sarah_demo',    targetRoleId: 'employee', message: 'New task assigned: Network Infrastructure Audit',       type: 'task',     read: false, timestamp: daysAgo(1) },
            { userId: 'sup_demo',      targetRoleId: 'supervisor', message: 'Sarah submitted a self-evaluation — review required.',  type: 'evaluation',     read: false, timestamp: daysAgo(2) },
            { userId: 'sup_demo',      targetRoleId: 'supervisor', message: 'Leave request from Sarah Uwimana — pending approval.',  type: 'leave',    read: false, timestamp: daysAgo(1) },
            { userId: 'hr_demo',       targetRoleId: 'hr', message: 'Monthly workforce report is ready for download.',       type: 'alert',   read: false, timestamp: daysAgo(1) },
            { userId: 'hr_demo',       targetRoleId: 'hr', message: 'Alex submitted a self-evaluation — review required.',   type: 'evaluation',     read: true,  timestamp: daysAgo(10) },
        ]);
        console.log('   ✓ Notifications inserted');

        // ── Summary ────────────────────────────────────
        console.log('\n🎉 DEFENSE SEED COMPLETE');
        console.log('═══════════════════════════════════════════');
        console.log('  Accounts (all password: password123)');
        console.log('  ─────────────────────────────────────');
        console.log('  👤 Alex (Employee)   employee@demo.com');
        console.log('  👤 Vlad (Employee)   vlad@demo.com');
        console.log('  👤 Sarah (Employee)  sarah@demo.com');
        console.log('  👤 Supervisor        supervisor@demo.com');
        console.log('  👤 Linda (HR)        hr@demo.com');
        console.log('═══════════════════════════════════════════');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
};

seed();
