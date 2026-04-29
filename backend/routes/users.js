const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const TimeLog = require('../models/TimeLog');
const Task = require('../models/Task');
const Eval = require('../models/Eval');
const Activity = require('../models/Activity');

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { role, team: queryTeam } = req.query;
  let query = {};

  let effectiveTeam = queryTeam;
  if (req.user.role === 'supervisor') {
    const sup = await User.findOne({ id: req.user.id });
    effectiveTeam = sup?.team || queryTeam;
  }

  if (effectiveTeam) {
    const escaped = effectiveTeam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    query.team = { $regex: new RegExp(`^${escaped}$`, 'i') };
  }

  if (req.user.role === 'supervisor') {
    console.log(`[Users Debug] Supervisor: ${req.user.id}, Team: ${effectiveTeam}, Query:`, JSON.stringify(query));
  }

  if (role) query.role = role;
  const users = await User.find(query).select('id name email dept role team');
  // Only filter out filters if specifically asking for employees, otherwise unexpected behavior
  // Admin needs to see all users; otherwise, filter out supervisors for regular team views
  if (req.user.role === 'admin' || role === 'employee' || role === 'hr') {
    res.json(users);
  } else {
    res.json(users.filter(u => u.role !== 'supervisor'));
  }
});

router.get('/:id',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const user = await User.findOne({ id: req.params.id }).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.put('/:id',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
    body('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('id').optional().notEmpty().withMessage('New ID cannot be empty').trim(),
    validate
  ],
  async (req, res) => {
    try {
      const oldId = req.params.id;
      const { name, email, id: newId, team, dept, pos, role } = req.body;

      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (newId) updates.id = newId;
      if (team) updates.team = team;
      if (dept) updates.dept = dept;
      if (pos) updates.pos = pos;
      if (req.body.avatar) updates.avatar = req.body.avatar;

      if (role && req.user.role === 'admin') {
          updates.role = role;
      }

      const user = await User.findOneAndUpdate({ id: oldId }, updates, { new: true });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Cascade Update if ID changed
      if (newId && newId !== oldId) {
        console.log(`[ID Change] Migrating ${oldId} -> ${newId}`);
        await Promise.all([
          TimeLog.updateMany({ userId: oldId }, { userId: newId }),
          Task.updateMany({ userId: oldId }, { userId: newId }),
          Eval.updateMany({ userId: oldId }, { userId: newId }),
          Activity.updateMany({ userId: oldId }, { userId: newId })
        ]);
      }

      res.json(user);
    } catch (err) {
      console.error('Update User Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ---------------------------------------------------------
// Delete User (Admin Only)
// ---------------------------------------------------------
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const user = await User.findOneAndDelete({ id: req.params.id });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Delete User Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ---------------------------------------------------------
// Password Update with bcrypt
// ---------------------------------------------------------
router.put('/:id/password',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validate
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findOne({ id: req.params.id });

      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Current password incorrect' });
      }

      // Update password (will be hashed by pre-save hook)
      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Password update error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
// ---------------------------------------------------------

module.exports = router;
