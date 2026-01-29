const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');

// Protect all goal routes
router.use(authMiddleware);

router.get('/',
  async (req, res) => {
    try {
      const { role, id: userId, team } = req.user;

      let query = {};
      if (role === 'supervisor') {
        const sup = await User.findOne({ id: userId });
        const effectiveTeam = sup?.team || team;
        const teamUsers = await User.find({ team: effectiveTeam }).select('id');
        query.assignedTo = { $in: [...teamUsers.map(u => u.id), userId] };
      } else {
        query.assignedTo = userId;
      }

      const goals = await Goal.find(query).sort({ dueDate: 1 }).lean();

      // Manual population of assigned names
      const assignedIds = [...new Set(goals.map(g => g.assignedTo))];
      const users = await User.find({ id: { $in: assignedIds } }).select('id name');
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

      const goalsWithName = goals.map(g => ({
        ...g,
        assignedName: userMap[g.assignedTo] || g.assignedTo
      }));

      res.json(goalsWithName);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.post('/',
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').notEmpty().withMessage('Description is required').trim(),
    body('target').notEmpty().withMessage('Target is required').trim(),
    body('assignedTo').notEmpty().withMessage('Assigned To is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { id: userId, role } = req.user;
      const { title, description, target, assignedTo: originalAssignedTo, dueDate } = req.body;

      let finalAssignedTo = originalAssignedTo;
      // If employee, force assignedTo to be self
      if (role === 'employee') {
        finalAssignedTo = userId;
      }

      const goal = new Goal({
        title,
        description,
        target,
        createdBy: userId, // Assuming createdBy is the field for who created it
        assignedTo: finalAssignedTo,
        dueDate: dueDate // Use dueDate from req.body
      });

      await goal.save();

      // Create Notification for recipient if assigned to someone else
      if (finalAssignedTo !== userId) {
        const recipient = await User.findOne({ id: finalAssignedTo }).select('role');
        await Notification.create({
          userId: finalAssignedTo,
          targetRoleId: recipient?.role || 'employee',
          type: 'goal',
          message: `New Strategic Objective: "${title}"`,
          link: '/goals'
        });
      }

      res.status(201).json(goal);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

router.put('/:id',
  [
    param('id').notEmpty().withMessage('Goal ID is required'),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    validate
  ],
  async (req, res) => {
    try {
      const { id: userId, role } = req.user;
      const { progress, status } = req.body;

      const goal = await Goal.findById(req.params.id);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      if (role === 'employee' && goal.assignedTo !== userId) {
        return res.status(403).json({ error: 'Cannot update other users goals' });
      }

      // If employee, they can mainly update progress
      const updates = { ...req.body };
      if (progress !== undefined) {
        updates.progress = progress;
        // Auto-update status based on progress if not explicitly sent
        if (!status) {
          if (progress >= 100) updates.status = 'done';
          else if (progress > 0) updates.status = 'active';
        }
      }

      const updated = await Goal.findByIdAndUpdate(req.params.id, updates, { new: true });

      // Notify supervisor of completion
      if (updated.status === 'done' && goal.status !== 'done' && updated.createdBy !== userId) {
        const empUser = await User.findOne({ id: updated.assignedTo }).select('name team dept');
        await Notification.create({
          userId: updated.assignedTo,
          targetRoleId: 'supervisor',
          type: 'goal',
          message: `Strategic Target Hit: ${empUser?.name} completed goal "${updated.title}"`,
          team: empUser?.team,
          dept: empUser?.dept
        });
      }

      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

router.delete('/:id', async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    // Allow delete if Supervisor OR if Employee owns the goal
    if (role !== 'supervisor' && goal.assignedTo !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this goal' });
    }

    await Goal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample goals for development/testing
router.post('/seed-goals', async (req, res) => {
  try {
    // Get all employees
    const employees = await User.find({ role: 'employee' }).select('id name');

    if (employees.length === 0) {
      return res.status(400).json({ success: false, error: 'No employees found. Create users first.' });
    }

    const goalTemplates = [
      { title: 'Increase Productivity', description: 'Improve overall work efficiency', target: '85% productivity rate' },
      { title: 'Complete Training Modules', description: 'Finish all required training courses', target: '100% completion' },
      { title: 'Reduce Late Arrivals', description: 'Improve punctuality', target: '0 late arrivals' },
      { title: 'Team Collaboration', description: 'Enhance team communication', target: '90% team engagement' },
      { title: 'Code Quality Improvement', description: 'Reduce bugs and improve code reviews', target: '95% code quality score' }
    ];

    const seedData = [];

    employees.forEach((emp, index) => {
      // Assign 2-3 goals per employee
      const numGoals = 2 + (index % 2); // 2 or 3 goals

      for (let i = 0; i < numGoals; i++) {
        const template = goalTemplates[i % goalTemplates.length];
        const daysAhead = 30 + (i * 30); // 30, 60, 90 days

        seedData.push({
          ...template,
          assignedTo: emp.id,
          createdBy: 'system',
          dueDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
          progress: Math.floor(Math.random() * 70) // Random progress 0-70%
        });
      }
    });

    await Goal.insertMany(seedData);

    res.json({
      success: true,
      message: `Successfully created ${seedData.length} sample goals for ${employees.length} employees`
    });
  } catch (err) {
    console.error('Seed goals error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;