const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const TimeLog = require('../models/TimeLog');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');
const { maskUrl } = require('../utils/privacy');

// Protect all analytics routes
router.use(authMiddleware);

router.get('/departments', async (req, res) => {
  try {
    const depts = await User.distinct('dept');
    res.json(depts.filter(d => d).map(name => ({ name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/hr', async (req, res) => {
  try {
    const { period = 'month', department } = req.query;
    const now = new Date();
    let startDate = new Date(now);
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else startDate.setMonth(now.getMonth() - 1);

    let userMatch = {};
    if (department) userMatch.dept = department;
    const usersInScope = await User.find(userMatch).select('id');
    const userIds = usersInScope.map(u => u.id);
    const staffCount = await User.countDocuments({ ...userMatch, role: 'employee' });

    if (userIds.length === 0) {
      return res.json({ prodRatio: 0, topProductive: [], topNonProductive: [], departments: [] });
    }

    const activityMatch = { userId: { $in: userIds }, timestamp: { $gte: startDate } };

    // Overall productivity
    const overall = await Activity.aggregate([
      { $match: activityMatch },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
          productiveDuration: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      }
    ]);

    const totalDur = overall[0]?.totalDuration || 0;
    const prodDur = overall[0]?.productiveDuration || 0;
    const prodRatio = totalDur > 0 ? Math.round((prodDur / totalDur) * 100) : 0;

    // FIXED: Top productive apps (was empty array)
    const topApps = await Activity.aggregate([
      { $match: activityMatch },
      {
        $group: {
          _id: { $ifNull: ['$appName', '$url'] },
          duration: { $sum: '$duration' },
          classified: { $first: '$classified' }
        }
      },
      { $sort: { duration: -1 } },
      { $limit: 20 }
    ]);

    // Privacy-conscious formatting: Use maskUrl utility
    const formatName = (app) => {
      if (!app._id) return 'Unknown';
      return maskUrl(app._id);
    };

    const topProductive = topApps
      .filter(a => a.classified === 'productive')
      .slice(0, 5)
      .map(a => ({
        name: formatName(a),
        duration: a.duration,
        percent: totalDur > 0 ? Math.round((a.duration / totalDur) * 100) : 0
      }));

    const topNonProductive = topApps
      .filter(a => a.classified === 'non-productive')
      .slice(0, 5)
      .map(a => ({
        name: formatName(a),
        duration: a.duration,
        percent: totalDur > 0 ? Math.round((a.duration / totalDur) * 100) : 0
      }));

    // FIXED: Departmental breakdown (was empty array)
    const deptStats = await Activity.aggregate([
      { $match: activityMatch },
      { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.dept': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$user.dept',
          total: { $sum: '$duration' },
          prod: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      },
      {
        $project: {
          name: '$_id',
          prod: { $round: [{ $multiply: [{ $divide: ['$prod', { $max: ['$total', 1] }] }, 100] }, 0] },
          nonProdHours: { $round: [{ $divide: [{ $subtract: ['$total', '$prod'] }, 3600] }, 1] },
          totalDuration: '$total',
          loggedHours: { $round: [{ $divide: ['$total', 3600] }, 1] },
          trend: { $literal: 0 }
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Team-level breakdown for HR (NEW)
    const teamStats = await Activity.aggregate([
      { $match: activityMatch },
      { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.team': { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: '$user.team',
          total: { $sum: '$duration' },
          prod: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      },
      {
        $project: {
          name: '$_id',
          prod: { $round: [{ $multiply: [{ $divide: ['$prod', { $max: ['$total', 1] }] }, 100] }, 0] },
          totalDuration: '$total',
          loggedHours: { $round: [{ $divide: ['$total', 3600] }, 1] }
        }
      },
      { $sort: { prod: -1 } }
    ]);

    const attendanceRate = staffCount > 0 ? Math.round((new Set(timeLogs.map(l => l.userId)).size / staffCount) * 100) : 0;
    const onTimeRate = timeLogs.length > 0 ? Math.round((onTimeLogs.length / timeLogs.length) * 100) : 0;

    // Identify underperforming workers across the organization
    const underperforming = teamStats
      .filter(t => t.prod < 50)
      .map(t => ({ name: t.name, type: 'team', score: t.prod, reason: 'Low Team Efficiency' }));

    // Also check individual employees if needed, but for HR, team/dept risks are usually more relevant.
    // Let's add top 5 individual risks too.
    const individualActivities = await Activity.aggregate([
      { $match: activityMatch },
      {
        $group: {
          _id: '$userId',
          total: { $sum: '$duration' },
          prod: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      },
      {
        $project: {
          userId: '$_id',
          prod: { $round: [{ $multiply: [{ $divide: ['$prod', { $max: ['$total', 1] }] }, 100] }, 0] },
          total: '$total'
        }
      },
      { $match: { prod: { $lt: 50 }, total: { $gt: 3600 } } }, // Only if they have > 1h activity
      { $sort: { prod: 1 } },
      { $limit: 10 }
    ]);

    const userRisks = await Promise.all(individualActivities.map(async (a) => {
      const u = await User.findOne({ id: a.userId }).select('name dept team');
      return { name: u?.name || a.userId, dept: u?.dept, team: u?.team, score: a.prod, type: 'individual' };
    }));

    res.json({
      prodRatio,
      staffCount,
      onTimeRate,
      attendanceRate,
      topProductive,
      topNonProductive,
      departments: deptStats,
      teams: teamStats,
      underperforming: userRisks
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/supervisor', async (req, res) => {
  try {
    const { period = 'month', supId, team } = req.query;

    if (!supId || !team) {
      return res.status(400).json({ error: 'supId and team required' });
    }

    // ROBUSTNESS: Always fetch the latest team info for supervisors from the DB
    // to handle cases where the token is stale after a team change.
    const currentUser = await User.findOne({ id: supId || req.user.id });
    const effectiveTeam = currentUser?.team || team;

    if (!effectiveTeam) return res.status(400).json({ error: 'Team context required' });

    const escapedTeam = effectiveTeam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const teamUsers = await User.find({
      team: { $regex: new RegExp(`^${escapedTeam}$`, 'i') },
      role: 'employee'
    }).select('id name');
    const userIds = teamUsers.map(u => u.id);

    if (userIds.length === 0) {
      return res.json({
        productivity: 0,
        productivityTrend: 0,
        taskCompletion: 0,
        taskTrend: 0,
        totalHours: 0,
        openTasks: 0,
        topPerformer: { name: 'N/A', prod: 0 },
        atRisk: { name: 'N/A', prod: 0 },
        alerts: []
      });
    }

    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    if (period === 'today') {
      startDate = new Date(now).setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate - 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate);
    } else {
      // MONTH
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, startDate.getDate());
      prevEndDate = new Date(startDate);
    }

    // CURRENT PERIOD productivity
    const currentActivities = await Activity.aggregate([
      { $match: { userId: { $in: userIds }, timestamp: { $gte: new Date(startDate) } } },
      {
        $group: {
          _id: '$userId',
          totalDuration: { $sum: '$duration' },
          prodDuration: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      }
    ]);

    // PREVIOUS PERIOD productivity (for trends)
    const prevActivities = await Activity.aggregate([
      { $match: { userId: { $in: userIds }, timestamp: { $gte: new Date(prevStartDate), $lt: new Date(prevEndDate) } } },
      {
        $group: {
          _id: '$userId',
          totalDuration: { $sum: '$duration' },
          prodDuration: { $sum: { $cond: [{ $eq: ['$classified', 'productive'] }, '$duration', 0] } }
        }
      }
    ]);

    const userProd = currentActivities.map(a => ({
      userId: a._id,
      name: teamUsers.find(u => u.id === a._id)?.name || 'Unknown',
      productivity: a.totalDuration > 0 ? Math.round((a.prodDuration / a.totalDuration) * 100) : 0
    }));

    const avgProductivity = userProd.length > 0
      ? Math.round(userProd.reduce((s, u) => s + u.productivity, 0) / userProd.length)
      : 0;

    // FIXED: Calculate productivity trend (was hardcoded 0)
    const prevTotalDur = prevActivities.reduce((s, a) => s + a.totalDuration, 0);
    const prevProdDur = prevActivities.reduce((s, a) => s + a.prodDuration, 0);
    const prevAvgProd = prevTotalDur > 0 ? Math.round((prevProdDur / prevTotalDur) * 100) : 0;
    const productivityTrend = avgProductivity - prevAvgProd;

    // Top performer & At Risk
    const sortedByProd = [...userProd].sort((a, b) => b.productivity - a.productivity);
    const topPerformer = sortedByProd[0] || { name: 'N/A', productivity: 0 };

    // FIXED: At Risk = productivity < 50% AND has significant activity
    const atRiskUser = sortedByProd.find(u => u.productivity < 50) || sortedByProd[sortedByProd.length - 1];
    const atRisk = atRiskUser || { name: 'N/A', productivity: 0 };

    // TASKS
    const currentTasks = await Task.find({ userId: { $in: userIds } });
    const prevTasks = await Task.find({
      userId: { $in: userIds },
      timestamp: { $gte: new Date(prevStartDate), $lt: new Date(prevEndDate) }
    });

    const openTasks = currentTasks.filter(t => !t.completed && new Date(t.due) >= new Date()).length;
    const completedTasks = currentTasks.filter(t => t.completed).length;
    const taskCompletion = currentTasks.length > 0 ? Math.round((completedTasks / currentTasks.length) * 100) : 0;

    // FIXED: Calculate task trend (was hardcoded 0)
    const prevCompleted = prevTasks.filter(t => t.completed).length;
    const prevTaskCompletion = prevTasks.length > 0 ? Math.round((prevCompleted / prevTasks.length) * 100) : 0;
    const taskTrend = taskCompletion - prevTaskCompletion;

    const totalSeconds = currentActivities.reduce((s, a) => s + a.totalDuration, 0);
    const totalHours = Math.round(totalSeconds / 3600);

    // Alerts
    const alerts = [];
    const today = new Date().toISOString().split('T')[0];

    // GAP DETECTION ALERTS
    const todayLogs = await TimeLog.find({
      userId: { $in: userIds },
      type: 'check-in',
      timestamp: { $gte: new Date(today) }
    });

    for (const log of todayLogs) {
      const firstAct = await Activity.findOne({
        userId: log.userId,
        timestamp: { $gte: new Date(today) }
      }).sort({ timestamp: 1 });

      if (firstAct) {
        const gapMins = Math.round((firstAct.timestamp - log.timestamp) / (1000 * 60));
        if (gapMins > 45) { // 45+ minute gap is suspicious
          const userName = teamUsers.find(u => u.id === log.userId)?.name || log.userId;
          alerts.push(`Gap Alert: ${userName} started work ${gapMins}m AFTER clocking in`);
        }
      }
    }

    // WHATSAPP ABUSE DETECTION
    const whatsappActivity = await Activity.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          timestamp: { $gte: new Date(today) },
          $or: [
            { appName: /whatsapp/i },
            { url: /whatsapp/i }
          ]
        }
      },
      {
        $group: {
          _id: '$userId',
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    whatsappActivity.forEach(wa => {
      const mins = Math.round(wa.totalDuration / 60);
      if (mins > 60) {
        const userName = teamUsers.find(u => u.id === wa._id)?.name || wa._id;
        alerts.push(`WhatsApp Warning: ${userName} spent ${mins}m on WhatsApp today`);
      }
    });

    currentTasks.filter(t => !t.completed && new Date(t.due) < new Date()).slice(0, 5).forEach(t => {
      const userName = teamUsers.find(u => u.id === t.userId)?.name || t.userId;
      alerts.push(`Overdue: "${t.title}" by ${userName}`);
    });

    // Add Underperforming alerts
    const underperforming = userProd.filter(p => p.productivity < 50);
    underperforming.forEach(p => {
      const act = currentActivities.find(a => a._id === p.userId);
      if (act && act.totalDuration > 3600) { // Only alert if > 1h logged
          alerts.push(`Critical Performance Risk: ${p.name} (${p.productivity}% productivity)`);
      }
    });

    res.json({
      productivity: avgProductivity,
      productivityTrend,
      taskCompletion,
      taskTrend,
      totalHours,
      totalSeconds,
      openTasks,
      topPerformer: { name: topPerformer.name, prod: topPerformer.productivity },
      atRisk: { name: atRisk.name, prod: atRisk.productivity },
      alerts: alerts.slice(0, 8),
      userProd,
      underperforming
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;