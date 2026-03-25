const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/leaves');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

router.use(authMiddleware);

// Request Leave (Employee) - Now supports file uploads
router.post('/', upload.single('proofDocument'), async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;
        
        let proofDocumentPath = null;
        if (req.file) {
            // Store the relative path to be served statically
            proofDocumentPath = `/uploads/leaves/${req.file.filename}`;
        }

        const leave = new Leave({
            userId: req.user.userId,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            proofDocument: proofDocumentPath,
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
