const express = require('express');
const router = express.Router();
const Eval = require('../models/Eval');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

// Protect all evaluation routes
router.use(authMiddleware);

router.post('/',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('type').notEmpty().withMessage('Evaluation type is required'),
    body('assessment').notEmpty().withMessage('Assessment content is required'),
    body('areasImprovement').optional().isString(),
    body('rating').optional().isInt({ min: 1, max: 10 }).withMessage('Self rating must be between 1 and 10'),
    validate
  ],
  async (req, res) => {
    const newEval = new Eval(req.body);
    await newEval.save();

    // Notify HR of new submission
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: req.body.userId,
      targetRoleId: 'hr',
      type: 'evaluation',
      message: `New Performance Self-Evaluation submitted by ${req.user.name || req.body.userId}`,
      link: '/evaluations',
      dept: req.user.dept,
      team: req.user.team
    });

    res.json({ message: 'Self-eval saved!' });
  });

router.get('/:userId', async (req, res) => {
  const evals = await Eval.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(5);
  res.json(evals);
});

router.get('/', async (req, res) => {
  try {
    const { cycle, dept, status, hr, team, supId } = req.query;
    let query = {};

    if (cycle) query.type = cycle;
    if (status) query.status = status;

    if (!hr) {
      if (!team || !supId) {
        return res.status(400).json({ error: 'Missing team/supId for supervisor view' });
      }
      const teamUsers = await User.find({ team, role: 'employee' }).select('id');
      query.userId = { $in: teamUsers.map(u => u.id) };
    } else if (dept) {
      const users = await User.find({ dept }).select('id');
      query.userId = { $in: users.map(u => u.id) };
    }

    const evals = await Eval.find(query)
      .sort({ timestamp: -1 })
      .lean();

    // Manual population because userId is String, not ObjectId
    const userIds = [...new Set(evals.map(e => e.userId))];
    const users = await User.find({ id: { $in: userIds } }).select('id name dept');
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

    const total = await Eval.countDocuments();
    const pending = await Eval.countDocuments({ status: 'pending' });
    const submissionRate = total ? Math.round(((total - pending) / total) * 100) : 0;

    // ---------------------------------------------------------
    // ✔️ CLAUDE'S SNIPPET (Real average review time calc)
    // ---------------------------------------------------------
    const completedEvals = await Eval.find({
      status: 'completed',
      reviewedAt: { $exists: true },
      timestamp: { $exists: true }
    }).select('reviewedAt timestamp');

    const avgReviewTime = completedEvals.length > 0
      ? completedEvals.reduce((sum, e) => {
        const reviewTimeHours = (new Date(e.reviewedAt) - new Date(e.timestamp)) / (1000 * 60 * 60);
        return sum + reviewTimeHours;
      }, 0) / completedEvals.length
      : 0;
    // ---------------------------------------------------------

    res.json({
      evals: evals.map(e => ({
        _id: e._id,
        userId: e.userId, // Keep raw ID just in case
        userName: userMap[e.userId]?.name || 'Unknown',
        dept: userMap[e.userId]?.dept || '-',
        type: e.type,
        timestamp: e.timestamp,
        status: e.status,
        assessment: e.assessment, // Include these for details view
        areasImprovement: e.areasImprovement,
        rating: e.rating
      })),
      submissionRate,
      avgReviewTime: Number(avgReviewTime.toFixed(1)),
      pendingCount: pending
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/review',
  [
    param('id').notEmpty().withMessage('Evaluation ID is required'),
    body('hrComment').notEmpty().withMessage('HR Comment is required'),
    body('hrRating').isInt({ min: 1, max: 10 }).withMessage('HR Rating must be between 1 and 10'),
    body('reviewedBy').notEmpty().withMessage('Reviewer ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { hrComment, hrRating, reviewedBy } = req.body;
      const updated = await Eval.findByIdAndUpdate(
        req.params.id,
        { status: 'completed', hrComment, hrRating, reviewedBy, reviewedAt: new Date() },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Evaluation not found' });

      // Notify Employee of audit result
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: updated.userId, // Recipient of the notification
        targetRoleId: 'employee', // Feedback is usually to employees
        type: 'evaluation',
        message: `Your performance evaluation has been audited and reviewed.`,
        link: '/feedback',
        team: updated.team || req.user.team,
        dept: updated.dept || req.user.dept
      });
      // Employees view their evals in Feedback/Self-Eval tab

      res.json({ message: 'Review submitted', eval: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

module.exports = router;
