const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Protect all feedback routes
router.use(authMiddleware);

router.post('/',
  [
    body('fromUserId').notEmpty().withMessage('From User ID is required'),
    body('toUserId').notEmpty().withMessage('To User ID is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('rating').optional().isInt({ min: 1, max: 10 }).withMessage('Rating must be between 1 and 10'),
    validate
  ],
  async (req, res) => {
    const newFeedback = new Feedback(req.body);
    await newFeedback.save();

    const { toUserId, type } = req.body;

    // Create Notification for employee
    // Assuming req.user.id is the ID of the user submitting the feedback (supervisor)
    // and toUserId is the ID of the employee receiving the feedback.
    // The notification should be sent if the feedback is not for the sender themselves.
    if (toUserId !== req.user.id) {
      const recipient = await require('../models/User').findOne({ id: toUserId }).select('role');
      await Notification.create({
        userId: toUserId,
        targetRoleId: recipient?.role || 'employee',
        type: 'feedback',
        message: `New Feedback Received: ${type.replace(/_/g, ' ').toUpperCase()}`,
        link: '/feedback'
      });
    }

    res.status(201).json(newFeedback);
  });

router.get('/:userId', async (req, res) => {
  const feedbacks = await Feedback.find({ toUserId: req.params.userId })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  // Manual population
  const userIds = [...new Set(feedbacks.map(f => f.fromUserId).filter(Boolean))];
  const users = await require('../models/User').find({ id: { $in: userIds } }).select('id name');
  const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

  const formatted = feedbacks.map(f => ({
    ...f,
    fromUserName: userMap[f.fromUserId]?.name || 'Anonymous'
  }));

  res.json(formatted);
});

module.exports = router;