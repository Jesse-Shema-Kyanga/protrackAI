const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Request Leave (Employee)
router.post('/', async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;
        const leave = new Leave({
            userId: req.user.userId,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            status: 'pending'
        });
        await leave.save();

        // Notify Supervisor
        await Notification.create({
            userId: req.user.userId,
            targetRoleId: 'supervisor',
            type: 'leave',
            message: `New Leave Request from ${req.user.name || req.user.userId}`,
            link: '/leave',
            team: req.user.team,
            dept: req.user.dept
        });

        res.status(201).json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Leave Requests (Filter by user or team)
router.get('/', async (req, res) => {
    try {
        const { userId, team } = req.query;
        let query = {};

        if (userId) query.userId = userId;
        // If supervisor wants to see team requests, we'd need a more complex join, 
        // but for now, we filter by supervisor's known user list or just all for simplicity in MVP

        const leaves = await Leave.find(query).sort({ timestamp: -1 });
        res.json(leaves);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve/Decline (Supervisor/HR)
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const leave = await Leave.findByIdAndUpdate(req.params.id, {
            status,
            approvedBy: req.user.userId
        }, { new: true });

        // Notify Employee
        await Notification.create({
            userId: leave.userId,
            targetRoleId: 'employee',
            type: 'leave',
            message: `Your leave request has been ${status}`,
            link: '/leave',
            team: req.user.team, // Use supervisor's team/dept for context
            dept: req.user.dept
        });

        res.json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
