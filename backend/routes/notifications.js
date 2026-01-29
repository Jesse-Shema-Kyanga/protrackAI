const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const TimeLog = require('../models/TimeLog');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get notifications for a user based on their role and team
router.get('/', async (req, res) => {
    try {
        const { userId, role, team, dept } = req.query;
        let query = {};

        const currentUserId = req.user.userId || userId;
        const currentRole = req.user.role || role;

        if (currentRole === 'employee') {
            query.userId = currentUserId;
            query.targetRoleId = 'employee';

            // AUTO-RESOLVE: If user is currently checked-in, mark pending clock_reminders as read
            if (currentUserId) {
                const latestLog = await TimeLog.findOne({ userId: currentUserId }).sort({ timestamp: -1 });
                if (latestLog && latestLog.type === 'check-in') {
                    await Notification.updateMany({
                        userId: currentUserId,
                        type: 'clock_reminder',
                        read: false
                    }, { read: true });
                }
            }
        } else if (currentRole === 'supervisor') {
            query.$or = [
                { targetRoleId: 'supervisor', team: team }, // Team alerts
                { userId: currentUserId, targetRoleId: { $in: ['supervisor', 'employee'] } } // Personal alerts
            ];
        } else if (currentRole === 'hr') {
            query.$or = [
                { targetRoleId: 'hr' }, // Global HR alerts
                { userId: currentUserId, targetRoleId: 'hr' } // Personal HR alerts
            ];
            if (dept) {
                query.$or[0].dept = dept;
            }
        }

        const notifications = await Notification.find(query)
            .sort({ timestamp: -1 })
            .limit(50);

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count for a user
router.get('/unread-count', async (req, res) => {
    try {
        const { userId, role, team, dept } = req.query;
        let query = {};

        const currentUserId = req.user.userId || userId;
        const currentRole = req.user.role || role;

        if (currentRole === 'employee') {
            query.userId = currentUserId;
            query.targetRoleId = 'employee';
        } else if (currentRole === 'supervisor') {
            query.$or = [
                { targetRoleId: 'supervisor', team: team },
                { userId: currentUserId, targetRoleId: { $in: ['supervisor', 'employee'] } }
            ];
        } else if (currentRole === 'hr') {
            query.$or = [
                { targetRoleId: 'hr' },
                { userId: currentUserId, targetRoleId: 'hr' }
            ];
            if (dept) query.$or[0].dept = dept;
        }

        query.read = false;
        const count = await Notification.countDocuments(query);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark ALL notifications as read for a user
router.put('/mark-all-read', async (req, res) => {
    try {
        const { userId } = req.body;
        // In a real app, we'd use the session user, but query param/body works for now
        // Better: use req.user.userId from authMiddleware
        const targetId = req.user?.userId || userId;

        await Notification.updateMany({ userId: targetId, read: false }, { read: true });
        res.json({ success: true, message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark single notification as read
router.put('/:id/read', async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit explanation for a flagged notification (e.g. WhatsApp usage)
router.post('/explain', async (req, res) => {
    try {
        const { notificationId, explanation, userId } = req.body;
        console.log("Explanation received:", req.body);

        // 1. Mark the prompt notification as read
        const prompt = await Notification.findByIdAndUpdate(notificationId, { read: true });

        if (!prompt) return res.status(404).json({ error: 'Notification not found' });

        // 2. Find User to get name and supervisor info (assumes user structure)
        // For simplicity, we create an alert for 'supervisor' role.
        // In robust app, we'd lookup user.reportsTo. 
        // Here we just broadcast to team supervisors or just 'supervisor' role in team.

        // Create Alert for Supervisor
        const user = await require('../models/User').findOne({ id: userId }).select('team dept');
        await Notification.create({
            userId: userId, // It's about this user
            targetRoleId: 'supervisor', // For supervisors
            type: 'alert',
            message: `Explanation for WhatsApp Usage from User: "${explanation}"`,
            read: false,
            team: user?.team,
            dept: user?.dept,
            timestamp: new Date()
        });

        res.json({ success: true, message: 'Explanation submitted to supervisor' });
    } catch (err) {
        console.error("Explanation error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
