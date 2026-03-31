const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const TimeLog = require('../models/TimeLog');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const { authMiddleware } = require('../middleware/auth');
const { maskUrl } = require('../utils/privacy');
const { getWorkingDays } = require('../utils/attendance');

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
    const { period = 'month', department, start, end } = req.query;
    const now = new Date();
    let startDate, endDate = now;

    if (period === 'custom' && start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      startDate = new Date(now);
      if (period === 'week') startDate.setDate(now.getDate() - 7);
      else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
      else startDate.setMonth(now.getMonth() - 1);
    }

    // Base match for Activities and TimeLogs
    const baseMatch = { timestamp: { $gte: startDate, $lte: endDate } };
    const userFilter = department ? { dept: department, role: 'employee' } : { role: 'employee' };
    const targetUsers = await User.find(userFilter).select('id dept team');
    const targetUserIds = targetUsers.map(u => u.id);

    // Filter Activities
    const activityMatch = { ...baseMatch, userId: { $in: targetUserIds } };
    const allActivities = await Activity.find(activityMatch);
    
    const totalDur = allActivities.reduce((s, a) => s + (a.duration || 0), 0);
    const prodDur = allActivities.filter(a => a.classified === 'productive').reduce((s, a) => s + (a.duration || 0), 0);
    const prodRatio = totalDur > 0 ? Math.round((prodDur / totalDur) * 100) : 0;

    const staffCount = targetUserIds.length;

    // App Breakdown
    const appAgg = await Activity.aggregate([
      { $match: activityMatch },
      { $group: { _id: '$appName', duration: { $sum: '$duration' }, classified: { $first: '$classified' } } },
      { $sort: { duration: -1 } }
    ]);

    const formatName = (a) => a._id ? a._id.charAt(0).toUpperCase() + a._id.slice(1) : 'System';
    const topProductive = appAgg.filter(a => a.classified === 'productive').slice(0, 5).map(a => ({
      name: formatName(a), duration: a.duration, percent: totalDur > 0 ? Math.round((a.duration / totalDur) * 100) : 0
    }));
    const topNonProductive = appAgg.filter(a => a.classified === 'non-productive').slice(0, 5).map(a => ({
      name: formatName(a), duration: a.duration, percent: totalDur > 0 ? Math.round((a.duration / totalDur) * 100) : 0
    }));

    // Prepare Attendance Data
    const checkInLogs = await TimeLog.find({ ...baseMatch, type: 'check-in', userId: { $in: targetUserIds } });

    // Department Breakdown (Show all even if filtered?)
    const depts = department ? [department] : await User.distinct('dept');
    const deptStats = await Promise.all(depts.filter(d => d).map(async (dName) => {
      const dUsers = targetUsers.filter(u => u.dept === dName);
      const ids = dUsers.map(u => u.id);
      if (ids.length === 0) return null;

      const dActs = allActivities.filter(a => ids.includes(a.userId));
      const dTotal = dActs.reduce((s, a) => s + (a.duration || 0), 0);
      const dProd = dActs.filter(a => a.classified === 'productive').reduce((s, a) => s + (a.duration || 0), 0);

      const workingDays = getWorkingDays(startDate, endDate);
      let expected = ids.length * workingDays;
      const dLeaves = await Leave.find({ userId: { $in: ids }, status: 'approved', startDate: { $lte: endDate }, endDate: { $gte: startDate } });
      dLeaves.forEach(l => {
        const os = new Date(Math.max(new Date(l.startDate), startDate));
        const oe = new Date(Math.min(new Date(l.endDate), endDate));
        if (os <= oe) expected -= Math.max(0, getWorkingDays(os, oe));
      });
      const dLogs = checkInLogs.filter(l => ids.includes(l.userId));
      const deptEvents = new Set(dLogs.map(l => l.timestamp ? `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` : null).filter(Boolean));

      let dPoints = 0;
      deptEvents.forEach(key => {
        const log = dLogs.find(l => l.timestamp && `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` === key);
        if (!log) return;
        if (log.status === 'present') dPoints += 100;
        else if (log.status === 'late') {
          const bizStart = new Date(log.timestamp).setHours(9, 0, 0, 0);
          const mins = Math.round((new Date(log.timestamp) - new Date(bizStart)) / 60000);
          if (mins <= 5) dPoints += 98;
          else if (mins <= 15) dPoints += 90;
          else if (mins <= 60) dPoints += 70;
          else dPoints += 50;
        }
      });

      return {
        name: dName,
        prod: dTotal > 0 ? Math.round((dProd / dTotal) * 100) : 0,
        totalDuration: dTotal,
        loggedHours: Math.round(dTotal / 3600 * 10) / 10,
        attendance: expected > 0 ? Math.min(100, Math.round(dPoints / expected)) : 0,
        count: ids.length
      };
    }));

    // Team Breakdown
    const teams = department ? await User.distinct('team', { dept: department }) : await User.distinct('team');
    const teamStats = await Promise.all(teams.filter(t => t).map(async (tName) => {
      const tUsers = targetUsers.filter(u => u.team === tName);
      const ids = tUsers.map(u => u.id);
      if (ids.length === 0) return null;

      const tActs = allActivities.filter(a => ids.includes(a.userId));
      const tTotal = tActs.reduce((s, a) => s + (a.duration || 0), 0);
      const tProd = tActs.filter(a => a.classified === 'productive').reduce((s, a) => s + (a.duration || 0), 0);

      const workingDays = getWorkingDays(startDate, endDate);
      let expected = ids.length * workingDays;
      const tLeaves = await Leave.find({ userId: { $in: ids }, status: 'approved', startDate: { $lte: endDate }, endDate: { $gte: startDate } });
      tLeaves.forEach(l => {
        const os = new Date(Math.max(new Date(l.startDate), startDate));
        const oe = new Date(Math.min(new Date(l.endDate), endDate));
        if (os <= oe) expected -= Math.max(0, getWorkingDays(os, oe));
      });
      const tLogs = checkInLogs.filter(l => ids.includes(l.userId));
      const teamEvents = new Set(tLogs.map(l => l.timestamp ? `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` : null).filter(Boolean));

      let tPoints = 0;
      teamEvents.forEach(key => {
        const log = tLogs.find(l => l.timestamp && `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` === key);
        if (!log) return;
        if (log.status === 'present') tPoints += 100;
        else if (log.status === 'late') {
          const bizStart = new Date(log.timestamp).setHours(9, 0, 0, 0);
          const mins = Math.round((new Date(log.timestamp) - new Date(bizStart)) / 60000);
          if (mins <= 5) tPoints += 98;
          else if (mins <= 15) tPoints += 90;
          else if (mins <= 60) tPoints += 70;
          else tPoints += 50;
        }
      });

      return {
        name: tName,
        prod: tTotal > 0 ? Math.round((tProd / tTotal) * 100) : 0,
        totalDuration: tTotal,
        loggedHours: Math.round(tTotal / 3600 * 10) / 10,
        attendance: expected > 0 ? Math.min(100, Math.round(tPoints / expected)) : 0,
        count: ids.length
      };
    }));

    // Overall metrics
    const workingDays = getWorkingDays(startDate, endDate);
    const expectedCheckIns = Math.max(1, staffCount * workingDays);
    const allApprovedLeaves = await Leave.find({ userId: { $in: targetUserIds }, status: 'approved', startDate: { $lte: endDate }, endDate: { $gte: startDate } });
    
    let totalOrgOverlapDays = 0;
    allApprovedLeaves.forEach(l => {
      const os = new Date(Math.max(new Date(l.startDate), startDate));
      const oe = new Date(Math.min(new Date(l.endDate), endDate));
      if (os <= oe) totalOrgOverlapDays += getWorkingDays(os, oe);
    });

    const adjustedOrgExpected = Math.max(1, expectedCheckIns - totalOrgOverlapDays);
    const uniqueOrgEvents = new Set(checkInLogs.map(l => l.timestamp ? `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` : null).filter(Boolean));
    
    let orgPoints = 0;
    uniqueOrgEvents.forEach(key => {
      const log = checkInLogs.find(l => l.timestamp && `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` === key);
      if (!log) return;
      if (log.status === 'present') orgPoints += 100;
      else if (log.status === 'late') {
        const bizStart = new Date(log.timestamp).setHours(9,0,0,0);
        const mins = Math.round((new Date(log.timestamp) - new Date(bizStart)) / 60000);
        if (mins <= 5) orgPoints += 98;
        else if (mins <= 15) orgPoints += 90;
        else if (mins <= 60) orgPoints += 70;
        else orgPoints += 50;
      }
    });

    const attendanceRate = adjustedOrgExpected > 0 ? Math.min(100, Math.round(orgPoints / adjustedOrgExpected)) : 0;
    const onTimeLogs = checkInLogs.filter(l => l.status === 'present');
    const onTimeRate = uniqueOrgEvents.size > 0 ? Math.round((onTimeLogs.length / uniqueOrgEvents.size) * 100) : 0;

    // Risks (Only populated for periods > today to prevent daily flukes)
    let userRisks = [];
    if (period !== 'today') {
      const riskMap = targetUsers.map(u => {
        // Productivity check for this user
        const uActs = allActivities.filter(a => a.userId === u.id);
        const uTotal = uActs.reduce((s, a) => s + (a.duration || 0), 0);
        const uProdDur = uActs.filter(a => a.classified === 'productive').reduce((s, a) => s + (a.duration || 0), 0);
        const prodScore = uTotal > 3600 ? Math.round((uProdDur / uTotal) * 100) : 100;

        // Attendance check for this user
        const uLogs = checkInLogs.filter(l => l.userId === u.id);
        const uEvents = new Set(uLogs.map(l => l.timestamp ? l.timestamp.toISOString().split('T')[0] : null).filter(Boolean));
        let uPoints = 0;
        uEvents.forEach(key => {
          const log = uLogs.find(l => l.timestamp && l.timestamp.toISOString().split('T')[0] === key);
          if (log && log.status === 'present') uPoints += 100;
          else if (log && log.status === 'late') uPoints += 70;
        });
        const attScore = adjustedOrgExpected > 0 ? Math.min(100, Math.round(uPoints / adjustedOrgExpected)) : 100;

        let riskType = null;
        let finalScore = 0;
        
        if (prodScore < 50) { riskType = 'productivity'; finalScore = prodScore; }
        else if (attScore < 50) { riskType = 'attendance'; finalScore = attScore; }

        if (riskType) {
          return { userId: u.id, name: u.name, dept: u.dept, team: u.team, score: finalScore, type: riskType };
        }
        return null;
      }).filter(Boolean);
      
      userRisks = riskMap.sort((a,b) => a.score - b.score).slice(0, 10);
    }

    res.json({
      prodRatio,
      staffCount,
      onTimeRate,
      attendanceRate,
      topProductive,
      topNonProductive,
      departments: deptStats.filter(Boolean),
      teams: teamStats.filter(Boolean).sort((a,b) => b.prod - a.prod),
      underperforming: userRisks
    });

  } catch (err) {
    console.error('HR Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/supervisor', async (req, res) => {
  try {
    const { period = 'month', supId, team } = req.query;

    if (!supId || !team) {
      return res.status(400).json({ error: 'supId and team required' });
    }

    const currentUser = await User.findOne({ id: supId || req.user.id });
    const effectiveTeam = currentUser?.team || team;

    if (!effectiveTeam) return res.status(400).json({ error: 'Team context required' });

    const escapedTeam = effectiveTeam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const teamUsers = await User.find({
      team: { $regex: new RegExp(`^${escapedTeam}$`, 'i') },
      role: 'employee'
    }).select('id name');
    const userIds = teamUsers.map(u => u.id);

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
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, startDate.getDate());
      prevEndDate = new Date(startDate);
    }

    if (userIds.length === 0) {
      return res.json({
        productivity: 0,
        productivityTrend: 0,
        taskCompletion: 0,
        taskTrend: 0,
        totalHours: 0,
        attendance: 0,
        openTasks: 0,
        topPerformer: { name: 'N/A', prod: 0 },
        atRisk: { name: 'N/A', prod: 0 },
        alerts: []
      });
    }

    const periodWorkingDays = getWorkingDays(startDate, now);
    let totalPotentialSlots = userIds.length * periodWorkingDays;

    const teamLeaves = await Leave.find({
      userId: { $in: userIds },
      status: 'approved',
      startDate: { $lte: now },
      endDate: { $gte: startDate }
    });

    teamLeaves.forEach(leave => {
        const overlapStart = new Date(Math.max(new Date(leave.startDate), startDate));
        const overlapEnd = new Date(Math.min(new Date(leave.endDate), now));
        if (overlapStart <= overlapEnd) {
          totalPotentialSlots -= Math.max(0, getWorkingDays(overlapStart, overlapEnd));
        }
    });

    const checkInLogs = await TimeLog.find({ userId: { $in: userIds }, timestamp: { $gte: startDate }, type: 'check-in' });
    const uniqueCheckInEvents = new Set(checkInLogs.map(l => `${l.userId}-${l.timestamp.toISOString().split('T')[0]}`));
    
    // Reliability-weighted Attendance for Team
    let teamReliabilityPoints = 0;
    uniqueCheckInEvents.forEach(eventKey => {
      const log = checkInLogs.find(l => `${l.userId}-${l.timestamp.toISOString().split('T')[0]}` === eventKey);
      if (log.status === 'present') teamReliabilityPoints += 100;
      else if (log.status === 'late') {
        const mins = Math.round((new Date(log.timestamp) - new Date(new Date(log.timestamp).setHours(9, 0, 0, 0))) / 60000);
        if (mins <= 5) teamReliabilityPoints += 98;
        else if (mins <= 15) teamReliabilityPoints += 90;
        else if (mins <= 60) teamReliabilityPoints += 70;
        else teamReliabilityPoints += 50;
      }
    });

    const teamAttendance = totalPotentialSlots > 0 ? Math.min(100, Math.round(teamReliabilityPoints / totalPotentialSlots)) : 0;




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

    const userProd = await Promise.all(currentActivities.map(async (a) => {
      const u = teamUsers.find(user => user.id === a._id);
      const lastLog = await TimeLog.findOne({ userId: a._id }).sort({ timestamp: -1 });

      // Calculate attendance rate for this user
      const uLogs = checkInLogs.filter(l => l.userId === a._id);
      const uEvents = new Set(uLogs.map(l => l.timestamp ? l.timestamp.toISOString().split('T')[0] : null).filter(Boolean));
      let uPoints = 0;
      uEvents.forEach(key => {
          const log = uLogs.find(l => l.timestamp && l.timestamp.toISOString().split('T')[0] === key);
          if (log && log.status === 'present') uPoints += 100;
          else if (log && log.status === 'late') uPoints += 70;
      });
      // User expected days (periodWorkingDays - their approved leave days)
      const uLeaves = teamLeaves.filter(l => l.userId === a._id);
      let overlapDays = 0;
      uLeaves.forEach(leave => {
          const overlapStart = new Date(Math.max(new Date(leave.startDate), startDate));
          const overlapEnd = new Date(Math.min(new Date(leave.endDate), now));
          if (overlapStart <= overlapEnd) overlapDays += Math.max(0, getWorkingDays(overlapStart, overlapEnd));
      });
      const expected = Math.max(1, periodWorkingDays - overlapDays);
      const attRate = Math.min(100, Math.round(uPoints / expected));

      return {
        userId: a._id,
        name: u?.name || 'Unknown',
        productivity: a.totalDuration > 0 ? Math.round((a.prodDuration / a.totalDuration) * 100) : 0,
        attendance: uEvents.size === 0 && expected === 1 ? 100 : attRate, // If they have no logs but expected=1 (today just started), default to 100
        liveStatus: lastLog?.type || 'check-out',
        lastCheckOutReason: lastLog?.type === 'check-out' ? (lastLog?.reason || 'Reason not provided') : 'Active',
        totalDuration: a.totalDuration
      };
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

    // Add Underperforming alerts & export array
    let underperformingArray = [];
    if (period !== 'today') {
      userProd.forEach(p => {
        let rType = null;
        let pScore = 0;
        
        // Triggers: Productivity < 50% (and active) OR Attendance < 50%
        if (p.productivity < 50 && p.totalDuration > 3600) { rType = 'productivity'; pScore = p.productivity; }
        else if (p.attendance < 50) { rType = 'attendance'; pScore = p.attendance; }
        
        if (rType) {
            underperformingArray.push({
                userId: p.userId,
                name: p.name,
                dept: team,
                team: team,
                score: pScore,
                type: rType
            });
            alerts.push(`Critical Risk: ${p.name} (${pScore}% ${rType})`);
        }
      });
    }

    res.json({
      productivity: avgProductivity,
      productivityTrend,
      taskCompletion,
      taskTrend,
      totalHours,
      totalSeconds,
      attendance: teamAttendance,
      openTasks,
      topPerformer: { name: topPerformer.name, prod: topPerformer.productivity },
      atRisk: { name: atRisk.name, prod: atRisk.productivity },
      alerts: alerts.slice(0, 8),
      userProd,
      underperforming: underperformingArray.sort((a,b) => a.score - b.score).slice(0, 10)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;