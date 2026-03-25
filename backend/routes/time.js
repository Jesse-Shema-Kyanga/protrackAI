const express = require('express');
const router = express.Router();
const TimeLog = require('../models/TimeLog');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Leave = require('../models/Leave');
const { authMiddleware } = require('../middleware/auth');

// Protect all time tracking routes
router.use(authMiddleware);
const User = require('../models/User');

// Helper to get attendance data
const getAttendance = async (req, res) => {
  try {
    const { team, userId, startDate, endDate } = req.query;
    let matchQuery = {};
    let expectedUsers = [];

    if (team || req.user.role === 'supervisor') {
      const sup = await User.findOne({ id: req.user.id });
      const effectiveTeam = team || sup?.team;

      expectedUsers = await User.find({
        team: { $regex: new RegExp(`^${effectiveTeam}$`, 'i') },
        role: 'employee'
      }).select('id name dept');
      matchQuery.userId = { $in: expectedUsers.map(u => u.id) };
    } else if (userId) {
      matchQuery.userId = userId;
      const user = await User.findOne({ id: userId }).select('id name dept');
      if (user) expectedUsers = [user];
    } else if (req.user.role === 'hr') {
      // HR Global View
      expectedUsers = await User.find({ role: 'employee' }).select('id name dept');
      matchQuery.userId = { $in: expectedUsers.map(u => u.id) };
    } else {
      return res.status(400).json({ error: 'Provide team or userId' });
    }

    if (startDate) matchQuery.timestamp = { ...matchQuery.timestamp, $gte: new Date(startDate) };
    if (endDate) matchQuery.timestamp = { ...matchQuery.timestamp, $lte: new Date(endDate) };

    const rawLogs = await TimeLog.find(matchQuery).sort({ timestamp: -1 }).lean();

    // Get user names for logs
    const userIds = [...new Set(rawLogs.map(l => l.userId))];
    const users = await User.find({ id: { $in: userIds } }).select('id name');
    const userMap = {};
    users.forEach(u => userMap[u.id] = u.name);

    // ABSENCE DETECTION: Compare expected vs actual
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCheckIns = rawLogs.filter(l =>
      l.type === 'check-in' &&
      l.timestamp.toISOString().split('T')[0] === todayStr
    );
    const checkedInUserIds = new Set(todayCheckIns.map(l => l.userId));

    const absentUsers = [];

    for (const u of expectedUsers) {
      if (!checkedInUserIds.has(u.id)) {
        const onLeave = await Leave.findOne({
          userId: u.id,
          status: 'approved',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        });
        if (!onLeave) absentUsers.push(u);
      }
    }

    // Create notifications for absent employees (only if it's a workday and past 10 AM)
    const now = new Date();
    const isWorkday = now.getDay() >= 1 && now.getDay() <= 5; // Mon-Fri
    const isPastCutoff = now.getHours() >= 17; // After 5 PM (shift end)

    if (isWorkday && isPastCutoff && team) {
      for (const absentUser of absentUsers) {
        // Check if notification already exists for today
        const existingNotif = await Notification.findOne({
          userId: absentUser.id,
          type: 'absent',
          timestamp: { $gte: new Date(todayStr) }
        });

        if (!existingNotif) {
          await Notification.create({
            userId: absentUser.id,
            targetRoleId: 'supervisor',
            type: 'absent',
            message: `${absentUser.name} has not checked in today`,
            team: team,
            dept: absentUser.dept
          });
        }
      }
    }

    // Format logs with calculated fields
    const logs = await Promise.all(rawLogs.map(async (log) => {
      const checkInLog = log.type === 'check-in' ? log : null;
      if (!checkInLog) return null;

      const checkOutLog = rawLogs.find(l =>
        l.userId === log.userId &&
        l.type === 'check-out' &&
        l.timestamp.toDateString() === log.timestamp.toDateString()
      );

      // Find FIRST AI Activity for this user on this day
      const dayStart = new Date(log.timestamp);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(log.timestamp);
      dayEnd.setHours(23, 59, 59, 999);

      const firstActivity = await Activity.findOne({
        userId: log.userId,
        timestamp: { $gte: dayStart, $lte: dayEnd }
      }).sort({ timestamp: 1 }).select('timestamp');

      let hours = 0;
      if (checkInLog && checkOutLog) {
        hours = ((new Date(checkOutLog.timestamp) - new Date(checkInLog.timestamp)) / (1000 * 60 * 60)).toFixed(1);
      }

      let startGap = '--';
      if (firstActivity && checkInLog) {
        const gapMs = firstActivity.timestamp - checkInLog.timestamp;
        const gapMins = Math.round(gapMs / (1000 * 60));
        startGap = gapMins > 0 ? `${gapMins}m` : '0m';
      }

      return {
        user: userMap[log.userId] || log.userId,
        userId: log.userId,
        date: log.timestamp.toISOString().split('T')[0],
        checkInTime: log.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: checkOutLog ? new Date(checkOutLog.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
        firstActivity: firstActivity ? new Date(firstActivity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--',
        startGap: startGap,
        hours: hours || '--',
        status: log.status,
        timestamp: log.timestamp
      };
    }));

    const finalLogs = logs.filter(l => l !== null);

    console.log(`[Attendance Debug] Team: ${team}, Expected Users: ${expectedUsers.length}, Logs: ${rawLogs.length}`);

    // Calculate metrics
    // Correct way to count unique attendance per day
    const uniquePresent = new Set(rawLogs.filter(l => l.type === 'check-in' && l.status === 'present').map(l => `${l.userId}-${l.timestamp.toISOString().split('T')[0]}`));
    const uniqueLate = new Set(rawLogs.filter(l => l.type === 'check-in' && l.status === 'late').map(l => `${l.userId}-${l.timestamp.toISOString().split('T')[0]}`));

    const present = uniquePresent.size;
    const late = uniqueLate.size;
    const absent = absentUsers.length; // Absence logic is already per-day

    // Monthly stats (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyLogs = rawLogs.filter(l => l.timestamp >= thirtyDaysAgo && l.type === 'check-in');
    const monthlyLates = monthlyLogs.filter(l => l.status === 'late').length;

    // Calculate monthly absences from notifications
    const monthlyAbsenceNotifs = await Notification.countDocuments({
      type: 'absent',
      team: team,
      timestamp: { $gte: thirtyDaysAgo }
    });

    // Count employees with >2 late arrivals this month
    const latesByUser = {};
    monthlyLogs.filter(l => l.status === 'late').forEach(l => {
      latesByUser[l.userId] = (latesByUser[l.userId] || 0) + 1;
    });
    const employeesOver2 = Object.values(latesByUser).filter(count => count > 2).length;

    const totalExpected = expectedUsers.length;

    // Calculate number of working days in period
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get unique days in the logs
    const uniqueDays = new Set(rawLogs.map(l => l.timestamp.toISOString().split('T')[0]));
    const numDays = Math.max(1, uniqueDays.size);

    // Potential slots = total employees * days in period
    const totalPotentialSlots = totalExpected * numDays;

    // Calculate average hours
    const logsWithHours = finalLogs.filter(l => l.hours !== '--' && !isNaN(parseFloat(l.hours)));
    const totalHoursAgg = logsWithHours.reduce((sum, l) => sum + parseFloat(l.hours), 0);
    const avgDaily = logsWithHours.length > 0 ? (totalHoursAgg / logsWithHours.length).toFixed(1) : 0;
    const avgWeekly = (avgDaily * 5).toFixed(1);

    const totalOvertime = logsWithHours.reduce((sum, l) => {
      const hours = parseFloat(l.hours);
      return sum + (hours > 8 ? hours - 8 : 0);
    }, 0);

    const metrics = {
      present,
      late,
      absent,
      attendanceRate: totalPotentialSlots > 0 ? Math.min(100, Math.round(((present + late) / totalPotentialSlots) * 100)) : 0,
      lateRate: totalPotentialSlots > 0 ? Math.min(100, Math.round((late / totalPotentialSlots) * 100)) : 0,
      monthlyAbsences: monthlyAbsenceNotifs,
      monthlyLates,
      employeesOver2,
      avgDaily: parseFloat(avgDaily),
      avgWeekly: parseFloat(avgWeekly),
      totalOvertime: parseFloat(totalOvertime.toFixed(1))
    };
    const alerts = [];

    // Pattern Detection: Focus on recurring issues (3+ events)
    Object.entries(latesByUser).forEach(([userId, count]) => {
      const userName = userMap[userId] || userId;
      if (count >= 3) {
        alerts.push(`Chronic Late: ${userName} (${count}x this month)`);
      } else if (count > 0 && todayStr === logs.find(l => l.userId === userId && l.status === 'late')?.date) {
        // Only alert for single late if it happened today, to keep it relevant
        alerts.push(`${userName} was late today (Grace period: 30m)`);
      }
    });

    // Pattern Detection for Absences
    const absencesByUser = await Notification.aggregate([
      { $match: { type: 'absent', team: team, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    absencesByUser.forEach(a => {
      const userName = userMap[a._id] || a._id;
      if (a.count >= 2) { // 2+ absences in a month is a pattern
        alerts.push(`Chronic Absence: ${userName} (${a.count}x this month)`);
      }
    });

    // Alert for large starting gaps (over 60 mins)
    finalLogs.forEach(l => {
      const gapMatch = l.startGap.match(/(\d+)m/);
      if (gapMatch && parseInt(gapMatch[1]) > 60) {
        alerts.push(`${l.user} started work ${l.startGap} late after clock-in`);
      }
    });

    // Get REAL-TIME status (most recent log ever)
    const latestRawLog = await TimeLog.findOne({ userId: matchQuery.userId || userId }).sort({ timestamp: -1 });

    // Logic: If last log is not from today, reset to checked-out
    let realTimeStatus = 'check-out';
    if (latestRawLog) {
      const logDate = new Date(latestRawLog.timestamp).toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];
      if (logDate === todayDate) {
        realTimeStatus = latestRawLog.type;
      }
    }

    res.json({ logs: finalLogs, metrics, alerts, realTimeStatus });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/', getAttendance);
router.get('/attendance', getAttendance);


router.post('/log-time', async (req, res) => {
  try {
    const { userId, type, status, reason } = req.body;
    if (!userId || !type) return res.status(400).json({ error: 'Missing userId or type' });

    let finalStatus = status;
    if (type === 'check-in') {
      // Auto-resolve pending clock-in reminders since user is now clocking in
      await Notification.updateMany(
        { userId: userId, type: 'clock_reminder', read: false },
        { read: true }
      );

      if (!status) {
        const now = new Date();
        const gracePeriod = new Date(now).setHours(9, 30, 0, 0); // 9:30 AM
        finalStatus = now > gracePeriod ? 'late' : 'present';

        // Create notification for late arrival
        if (finalStatus === 'late') {
          const user = await User.findOne({ id: userId }).select('name team dept');
          if (user) {
            await Notification.create({
              userId: userId,
              targetRoleId: 'supervisor',
              type: 'late',
              message: `${user.name} checked in late at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
              team: user.team,
              dept: user.dept
            });
          }
        }
      }
    }

    const newLog = new TimeLog({ userId, type, status: finalStatus, reason });
    await newLog.save();
    res.json({ message: 'Time logged!', log: newLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.post('/seed-time', async (req, res) => {
  try {
    const { team } = req.body;
    const users = await User.find({ team }).select('id');
    if (users.length === 0) return res.status(400).json({ error: 'No users in team' });

    const seedData = [];
    const now = new Date();
    const today = new Date(now).setHours(0, 0, 0, 0);

    users.forEach(user => {
      const checkIn = new Date(today + 9 * 3600000);
      seedData.push({ userId: user.id, type: 'check-in', status: 'present', timestamp: checkIn });
    });

    await TimeLog.insertMany(seedData);
    res.json({ message: `Seeded ${seedData.length} logs for team ${team}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;