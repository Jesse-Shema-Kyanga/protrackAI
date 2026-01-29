const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { authMiddleware } = require('../middleware/auth');

const classifier = require('../ai/classifier');

// POST /api/activities/raw - from desktop agent (protected)
router.post('/raw', authMiddleware, async (req, res) => {
  try {
    const { app, title, url, timestamp } = req.body;

    // Security: Only TRACK employees. HR and Supervisors are excluded.
    if (req.user?.role !== 'employee') {
      return res.status(403).json({ error: 'Tracking disabled for administrative roles' });
    }

    const employeeId = req.user?.userId;

    if (!employeeId) return res.status(400).json({ error: 'Not logged in yet' });

    // AI Classification with Temporal Context
    // We now combine App Name + Window Title + URL to give the AI more context

    // --- FIX: App Name Remapping for UWP ---
    let finalAppName = app;
    if (app === 'ApplicationFrameHost') {
      if (title?.toLowerCase().includes('whatsapp')) finalAppName = 'WhatsApp';
      else if (title?.toLowerCase().includes('notepad')) finalAppName = 'Notepad';
    }

    // --- FIX: Strict Clock-In Enforcement ---
    // Check if user is actually clocked in TODAY. If not, ignore this activity.
    // This prevents "Starting Clocked In" issue by discarding agent data until manual clock-in.
    const TimeLog = require('../models/TimeLog'); // Ensure this is required at top level if cheap

    // Check latest log
    const latestLog = await TimeLog.findOne({ userId: employeeId }).sort({ timestamp: -1 });
    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = latestLog ? new Date(latestLog.timestamp).toISOString().split('T')[0] : '';

    if (!latestLog || logDate !== todayStr || latestLog.type !== 'check-in') {
      // User is NOT clocked in for today.

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Require model inside if needed or ensure top level
      const Notification = require('../models/Notification');

      const existingReminder = await Notification.findOne({
        userId: employeeId,
        type: 'clock_reminder',
        timestamp: { $gte: startOfToday }
      });

      if (!existingReminder) {
        await Notification.create({
          userId: employeeId,
          targetRoleId: 'employee',
          type: 'clock_reminder',
          message: 'Work activity detected but you are not clocked in. Please clock in to track your progress.',
          read: false
        });
      }

      // Still ignore the activity data as per Strict Mode
      return res.json({ success: true, ignored: true });
    }

    const textToClassify = `${finalAppName} ${title || ''} ${url || ''}`;

    // Fetch last 3 activities for temporal continuity context
    const recentActivities = await Activity.find({ userId: employeeId })
      .sort({ timestamp: -1 })
      .limit(3)
      .select('classified');

    // Get user role for role-based classification
    const userRole = req.user?.role || null;

    // Call classifier with context
    // Returns object: { category, confidence, reason }
    let { category, confidence } = await classifier.classify(textToClassify, recentActivities, userRole);

    // --- FIX: WhatsApp Policy (Auto-flag if > 1hr) ---
    // --- FIX: WhatsApp Policy (Prompt for Explanation) ---
    if (finalAppName === 'WhatsApp') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const whatsAppStats = await Activity.aggregate([
        {
          $match: {
            userId: employeeId,
            appName: 'WhatsApp',
            timestamp: { $gte: startOfDay }
          }
        },
        { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
      ]);

      const totalSeconds = whatsAppStats[0]?.totalDuration || 0;

      if (totalSeconds > 3600) { // > 1 hour
        // Check if we already asked for explanation TODAY
        // Note: Notification required inside this block
        const Notification = require('../models/Notification');
        const existingPrompt = await Notification.findOne({
          userId: employeeId,
          type: 'whatsapp_prompt',
          timestamp: { $gte: startOfDay }
        });

        if (!existingPrompt) {
          await Notification.create({
            userId: employeeId,
            targetRoleId: 'employee',
            type: 'whatsapp_prompt',
            message: 'High WhatsApp usage detected (>1hr). Please provide an explanation.',
            read: false
          });
        }
        if (category === 'productive') category = 'neutral';
      } else {
        if (category !== 'non-productive') category = 'neutral';
      }
    }

    const newAct = await Activity.create({
      userId: employeeId,
      appName: finalAppName,
      windowTitle: title,
      url,
      duration: 30, // assuming 30s ping
      classified: category,
      confidence: confidence || 0,
      timestamp: new Date(timestamp)
    });

    console.log(`Agent → ${employeeId} [${category}]: ${finalAppName} - ${title} (${(confidence * 100).toFixed(0)}%)`);

    res.json({ success: true, id: newAct._id });
  } catch (err) {
    console.error('Activity save error:', err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// GET /api/activities/review-queue - Fetch items needing manual review
router.get('/review-queue', authMiddleware, async (req, res) => {
  try {
    const items = await Activity.find({ classified: 'review_required' })
      .populate('userId', 'email name')
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(items);
  } catch (err) {
    console.error('Review queue fetch error:', err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// PATCH /api/activities/:id/classify - Manual override by supervisor
router.patch('/:id/classify', authMiddleware, async (req, res) => {
  try {
    const { category } = req.body;
    const { id } = req.params;

    if (!['productive', 'non-productive', 'neutral'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const activity = await Activity.findByIdAndUpdate(id, {
      classified: category,
      isReviewed: true,
      manualOverride: true
    }, { new: true });

    // Optional: Feed back into AI learning here? 
    // For now, just save the manual override.

    res.json({ success: true, activity });
  } catch (err) {
    console.error('Manual classification error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/log-activity', async (req, res) => {
  try {
    const newActivity = new Activity(req.body);
    // Deprecated static classification call
    // newActivity.classified = classifyActivity(newActivity); 
    await newActivity.save();
    res.json({ message: 'Activity logged!', activity: newActivity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;