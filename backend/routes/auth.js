const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { body } = require('express-validator');
const validate = require('../middleware/validate');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail().trim(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log('--- Login Attempt ---');
      console.log('Email:', email);

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      // Compare password using bcrypt
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          team: user.team,
          name: user.name,
          email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Return user data (without password) and token
      const { password: _, ...safeUser } = user.toObject();
      res.json({
        success: true,
        user: safeUser,
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }
  });

router.post('/signup',
  [
    body('id').notEmpty().withMessage('User ID is required').trim(),
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['employee', 'supervisor', 'hr', 'admin']).withMessage('Invalid role'),
    validate
  ],
  async (req, res) => {
    try {
      const { id, name, email, password, role, team, dept, pos } = req.body;
      console.log(`[Signup Debug] Request body:`, JSON.stringify(req.body));

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ id }, { email }] });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'User ID or email already exists' });
      }

      // Create new user (password will be hashed by pre-save hook)
      const assignedRole = role || 'employee';
      const newUser = new User({ id, name, email, password, role: assignedRole, team, dept, pos });
      await newUser.save();

      res.json({ success: true, message: 'User created successfully' });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

/**
 * Get current user profile (via token)
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;