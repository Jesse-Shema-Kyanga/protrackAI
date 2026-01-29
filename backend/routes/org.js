const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Public access (for Signup) to fetch all Departments & Teams
router.get('/', async (req, res) => {
    try {
        const orgs = await Organization.find();
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Add a department
router.post('/departments', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { name, description } = req.body;
        const newDept = await Organization.create({ name, description, teams: [] });
        res.json(newDept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Add a team to a department
router.post('/teams', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { deptName, teamName } = req.body;
        const dept = await Organization.findOne({ name: deptName });
        if (!dept) return res.status(404).json({ error: 'Department not found' });

        if (dept.teams.includes(teamName)) return res.status(400).json({ error: 'Team already exists' });

        dept.teams.push(teamName);
        await dept.save();
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Delete a department
router.delete('/departments/:name', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        await Organization.findOneAndDelete({ name: req.params.name });
        res.json({ message: 'Department deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin/HR: Get organizational metrics (headcounts)
router.get('/metrics', authMiddleware, async (req, res) => {
    try {
        const depts = await Organization.find();
        const metrics = await Promise.all(depts.map(async (d) => {
            const staffCount = await User.countDocuments({ dept: d.name, role: 'employee' });
            return {
                name: d.name,
                teams: d.teams.length,
                staff: staffCount
            };
        }));
        res.json(metrics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Rename a Team
router.patch('/teams/rename', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { deptName, oldName, newName } = req.body;
        const dept = await Organization.findOne({ name: deptName });
        if (!dept) return res.status(404).json({ error: 'Department not found' });

        const teamIdx = dept.teams.indexOf(oldName);
        if (teamIdx === -1) return res.status(404).json({ error: 'Team not found' });

        dept.teams[teamIdx] = newName;
        await dept.save();

        // Sync Users
        await User.updateMany({ dept: deptName, team: oldName }, { $set: { team: newName } });

        res.json({ message: 'Team renamed and users synced' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Move a Team to another Department
router.patch('/teams/move', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { teamName, fromDept, toDept } = req.body;

        const source = await Organization.findOne({ name: fromDept });
        const target = await Organization.findOne({ name: toDept });

        if (!source || !target) return res.status(404).json({ error: 'Source or target department not found' });

        source.teams = source.teams.filter(t => t !== teamName);
        if (!target.teams.includes(teamName)) target.teams.push(teamName);

        await source.save();
        await target.save();

        // Sync Users
        await User.updateMany({ dept: fromDept, team: teamName }, { $set: { dept: toDept } });

        res.json({ message: 'Team moved and users synced' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Delete a Team
router.delete('/teams/:deptName/:teamName', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { deptName, teamName } = req.params;
        const dept = await Organization.findOne({ name: deptName });
        if (!dept) return res.status(404).json({ error: 'Department not found' });

        dept.teams = dept.teams.filter(t => t !== teamName);
        await dept.save();

        // Note: We don't delete users, just set their team to null
        await User.updateMany({ dept: deptName, team: teamName }, { $set: { team: "" } });

        res.json({ message: 'Team removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Get all employees for reassignment
router.get('/users', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const users = await User.find({ role: { $in: ['employee', 'supervisor'] } }).select('id name email role dept team');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HR Only: Reassign a User
router.patch('/users/:id/reassign', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR only' });
        const { dept, team } = req.body;
        const user = await User.findOneAndUpdate({ id: req.params.id }, { $set: { dept, team } }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
