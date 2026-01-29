const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

// Protect all task routes
router.use(authMiddleware);
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

const User = require('../models/User');

// Protect all task routes
router.use(authMiddleware);

const Notification = require('../models/Notification');

router.get('/', async (req, res) => {
  try {
    const { team, supId, status, userId: filterUserId } = req.query;
    let query = {};

    // ROBUSTNESS: Always fetch the supervisor's actual team from the DB
    if (supId || req.user.role === 'supervisor') {
      const sup = await User.findOne({ id: supId || req.user.id });
      const effectiveTeam = team || sup?.team;
      const teamUsers = await User.find({ team: effectiveTeam }).select('id');
      const teamUserIds = teamUsers.map(u => u.id);
      // See team's tasks OR tasks assigned to the supervisor themselves
      query.userId = { $in: [...teamUserIds, supId || req.user.id] };
    } else {
      // SECURITY: Default to requesting user if no filters
      query.userId = filterUserId || req.user.id;
    }

    if (status) query.status = status;

    const tasks = await Task.find(query).sort({ due: 1 }).lean();

    // Manual population of user names
    const userIds = [...new Set(tasks.map(t => t.userId))];
    const users = await User.find({ id: { $in: userIds } }).select('id name');
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

    const tasksWithName = tasks.map(t => ({
      ...t,
      userName: userMap[t.userId] || t.userId
    }));

    const active = tasks.filter(t => !t.completed).length;
    const overdueTasks = tasks.filter(t => new Date(t.due) < new Date() && !t.completed);
    const overdue = overdueTasks.length;

    // ... (rest of notification logic)
    if (overdue > 0) {
      for (const t of overdueTasks) {
        const exists = await Notification.findOne({ userId: t.userId, type: 'overdue', message: { $regex: t.title } });
        if (!exists) {
          await Notification.create({
            userId: t.userId,
            targetRoleId: 'employee',
            type: 'overdue',
            message: `Task Overdue: "${t.title}" was due on ${t.due}`
          });
          // Also notify supervisor
          const empUser = await User.findOne({ id: t.userId }).select('team dept name');
          await Notification.create({
            userId: t.userId,
            targetRoleId: 'supervisor',
            type: 'overdue',
            message: `Employee Task Overdue: ${empUser?.name || t.userId}'s task "${t.title}" is late`,
            team: empUser?.team,
            dept: empUser?.dept
          });
        }
      }
    }

    const done = tasks.filter(t => t.completed).length;
    res.json({ tasks: tasksWithName, metrics: { active, onTrack: active - overdue, overdue, done } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    validate
  ],
  async (req, res) => {
    const tasks = await Task.find({ userId: req.params.userId }).sort({ due: 1 });
    res.json(tasks);
  });

router.post('/',
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('assignedTo').notEmpty().withMessage('Assigned To ID is required'),
    body('description').optional().trim(),
    body('due').isISO8601().withMessage('Due date must be a valid ISO 8601 date').optional(),
    validate
  ],
  async (req, res) => {
    const { title, description, assignedTo, due } = req.body;

    const task = new Task({
      title,
      description,
      userId: assignedTo,
      assignedBy: req.user.id,
      due
    });

    await task.save();

    // Create Notification for recipient
    if (assignedTo !== req.user.id) {
      const recipient = await User.findOne({ id: assignedTo }).select('role');
      await Notification.create({
        userId: assignedTo,
        targetRoleId: recipient?.role || 'employee',
        type: 'task',
        message: `New Task Assigned: "${title}"`,
        link: '/tasks'
      });
    }

    // Emit Real-time Update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('task-update', { type: 'new', task });
    }

    res.status(201).json(task);
  });

router.put('/:id',
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty').trim(),
    body('description').optional().trim(),
    body('due').optional().isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
    body('status').optional().isIn(['pending', 'in-progress', 'done']).withMessage('Invalid status'),
    body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
    validate
  ],
  async (req, res) => {
    const updates = req.body;
    const oldTask = await Task.findById(req.params.id);
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Notify supervisor of completion
    if (task.completed && (!oldTask || !oldTask.completed) && task.assignedBy !== req.user.id) {
      const empUser = await User.findOne({ id: task.userId }).select('name team dept');
      await Notification.create({
        userId: task.userId,
        targetRoleId: 'supervisor',
        type: 'task',
        message: `Goal Achieved: ${empUser?.name} completed task "${task.title}"`,
        team: empUser?.team,
        dept: empUser?.dept
      });
    }

    res.json({ message: 'Updated!', task });
  });

router.delete('/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted!' });
});

router.post('/seed-tasks', async (req, res) => {
  try {
    const { team } = req.body;
    const users = await User.find({ team }).select('id');
    const seedData = [];
    users.forEach(user => {
      for (let i = 0; i < 3; i++) {
        seedData.push({
          userId: user.id,
          title: `Task ${i + 1} for ${user.id}`,
          due: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: i % 2 ? 'pending' : 'done',
          completed: i % 2 === 0,
          progress: i % 2 === 0 ? 100 : Math.floor(Math.random() * 70)
        });
      }
    });
    await Task.insertMany(seedData);
    res.json({ message: `Seeded ${seedData.length} tasks for ${team}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;