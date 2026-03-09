const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const TimeLog = require('../models/TimeLog');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');
const { sanitizeActivities, aggregateByDomain } = require('../utils/privacy');
const PDFDocument = require('pdfkit');
const axios = require('axios');

// Fetch MTN Logo once to avoid repeated network calls if possible, but for dynamic PDFs we fetch as needed or use a local cache
const fetchMTNLogo = async () => {
  try {
    const response = await axios.get('https://logonoid.com/images/mtn-logo.jpg', { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (err) {
    console.error('Failed to fetch MTN logo:', err);
    return null;
  }
};

// Protect all report routes
router.use(authMiddleware);

/**
 * Basic activity report (JSON)
 * GET /api/reports?userId=...
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId param' });
    }

    const activities = await Activity.find({ userId }).sort({ timestamp: -1 }).limit(100);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyActivities = await Activity.find({ userId, timestamp: { $gte: today } }).sort({ timestamp: -1 });

    // Fallback to last 100 if no activity today, for a starter view
    const sourceActivities = dailyActivities.length > 5 ? dailyActivities : activities;
    const totalTime = sourceActivities.reduce((sum, a) => sum + a.duration, 0);
    const productiveTime = sourceActivities.filter(a => a.classified === 'productive').reduce((sum, a) => sum + a.duration, 0);
    const neutralTime = sourceActivities.filter(a => ['neutral', 'unknown', 'review_required'].includes(a.classified)).reduce((sum, a) => sum + a.duration, 0);
    const nonProductiveTime = sourceActivities.filter(a => a.classified === 'non-productive').reduce((sum, a) => sum + a.duration, 0);

    // Heartier rounding: integers look more "live" if they skip around
    const efficiency = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) + '%' : '0%';

    // Employees see full URLs, but we still sanitize for consistency
    const sanitized = sanitizeActivities(activities.slice(0, 50), 'employee');

    res.json({
      efficiency,
      totalTime,
      productiveTime,
      neutralTime,
      nonProductiveTime,
      recentActivities: sanitized,
      domainBreakdown: aggregateByDomain(activities)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate comprehensive PDF performance report
 * GET /api/reports/pdf?userId=...&period=month
 */
router.get('/pdf', async (req, res) => {
  try {
    const { userId, period = 'month' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId param' });
    }

    // Get user info
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = new Date();

    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start);
      endDate = new Date(req.query.end);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // day
    }

    // Fetch data
    const activities = await Activity.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: -1 });

    const timeLogs = await TimeLog.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const goals = await Goal.find({
      assignedTo: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const tasks = await Task.find({
      userId: userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Calculate metrics
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const productiveDuration = activities.filter(a => a.classified === 'productive').reduce((sum, a) => sum + a.duration, 0);
    const productivityRate = totalDuration > 0 ? Math.round((productiveDuration / totalDuration) * 100) : 0;

    // Top 3 productive apps
    const domainStats = aggregateByDomain(activities.filter(a => a.classified === 'productive'));
    const topApps = domainStats.slice(0, 3).map(d => ({
      name: d.domain,
      hours: (d.totalDuration / 3600).toFixed(1)
    }));

    // Attendance score
    const checkIns = timeLogs.filter(l => l.type === 'check-in');
    const presentCount = checkIns.filter(l => l.status === 'present').length;
    const lateCount = checkIns.filter(l => l.status === 'late').length;
    const attendanceScore = checkIns.length > 0 ? Math.round((presentCount / checkIns.length) * 100) : 0;

    // Goal success rate
    const completedGoals = goals.filter(g => g.progress === 100).length;
    const goalSuccessRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

    // Task completion rate
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Header branding
    doc.rect(0, 0, 612, 10).fill('#ffcc00'); // Top yellow bar

    doc.moveDown(2);
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#000')
      .text('ProTrackAI Performance Report', { align: 'center' });

    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text('MTN RWANDA PERFORMANCE AUDIT', { align: 'center' });

    // Fetch and draw logo if available
    const logoBuffer = await fetchMTNLogo();
    if (logoBuffer) {
      doc.image(logoBuffer, 50, 40, { width: 40 });
    }

    // Pre-calculate Audit Logs before streaming to avoid database wait during pipe
    const recentCheckIns = checkIns.slice(0, 5);
    const auditLogs = await Promise.all(recentCheckIns.map(async (log) => {
      const dayStart = new Date(log.timestamp); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(log.timestamp); dayEnd.setHours(23, 59, 59, 999);
      const firstAct = await Activity.findOne({ userId, timestamp: { $gte: dayStart, $lte: dayEnd } }).sort({ timestamp: 1 });
      let gapStr = '--';
      if (firstAct) {
        const gapMins = Math.round((firstAct.timestamp - log.timestamp) / (1000 * 60));
        gapStr = gapMins > 0 ? `${gapMins}m` : '0m';
      }
      return {
        date: log.timestamp.toLocaleDateString(),
        in: log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        act: firstAct ? firstAct.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
        gap: gapStr,
        status: log.status
      };
    }));

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ProTrack_Report_${userId}.pdf`);
    doc.pipe(res);

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#999')
      .text(`Generated on: ${now.toLocaleString()}`, { align: 'right' });

    doc.moveDown(1);
    doc.rect(50, doc.y, 512, 1).fill('#eee');
    doc.moveDown(1);

    // Two-column layout for Employee Info
    const startY = doc.y;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
      .text('Employee Identity', 50, startY);

    doc.fontSize(10).font('Helvetica').fillColor('#444')
      .text(`Full Name: ${user.name}`, 50, startY + 25)
      .text(`Employee ID: ${user.id}`, 50, startY + 40)
      .text(`Department: ${user.dept || 'N/A'}`, 50, startY + 55);

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
      .text('Report Context', 350, startY);

    doc.fontSize(10).font('Helvetica').fillColor('#444')
      .text(`Period: ${period.toUpperCase()}`, 350, startY + 25)
      .text(`From: ${startDate.toLocaleDateString()}`, 350, startY + 40)
      .text(`To: ${now.toLocaleDateString()}`, 350, startY + 55);

    doc.moveDown(5);
    doc.rect(50, doc.y, 512, 1).fill('#eee');
    doc.moveDown(1);

    // KPI Section with MTN Branded progress bars
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
      .text('Key Performance Indicators');
    doc.moveDown(1.5);

    const kpiY = doc.y;

    const drawKPIBox = (label, value, x, y, color) => {
      doc.rect(x, y, 115, 70).fillAndStroke('#fff', '#eee');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#666').text(label, x + 10, y + 10);
      doc.fontSize(20).font('Helvetica-Bold').fillColor(color).text(value, x + 10, y + 25);
      // Modern bottom bar
      doc.rect(x, y + 68, 115, 2).fill(color);
    };

    drawKPIBox('PRODUCTIVITY', `${productivityRate}%`, 50, kpiY, '#000');
    drawKPIBox('ATTENDANCE', `${attendanceScore}%`, 175, kpiY, '#ffcc00');
    drawKPIBox('GOAL SUCCESS', `${goalSuccessRate}%`, 300, kpiY, '#000');
    drawKPIBox('TASK COMPLETION', `${taskCompletionRate}%`, 425, kpiY, '#ffcc00');

    doc.moveDown(6);

    // Details Sections
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
      .text('Detailed Performance Breakdown');
    doc.moveDown(1);

    // Columns for Apps and Attendance details
    const detailY = doc.y;

    doc.fontSize(12).font('Helvetica-Bold').text('Top Productive Tools', 50, detailY);
    if (topApps.length > 0) {
      topApps.forEach((app, i) => {
        doc.fontSize(10).font('Helvetica').fillColor('#333')
          .text(`${i + 1}. ${app.name} (${app.hours} hrs)`, 50, detailY + 20 + (i * 15));
      });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#999').text('No data captured', 50, detailY + 20);
    }

    doc.fontSize(12).font('Helvetica-Bold').text('Attendance Summary', 350, detailY);
    doc.fontSize(10).font('Helvetica').fillColor('#444')
      .text(`Total Logs: ${checkIns.length}`, 350, detailY + 20)
      .text(`Punctuality: ${presentCount} On-time`, 350, detailY + 35)
      .text(`Late Arrivals: ${lateCount} Incident(s)`, 350, detailY + 50)
      .text(`Absence Flags: ${timeLogs.filter(l => l.status === 'absent').length} Record(s)`, 350, detailY + 65);

    doc.moveDown(5);

    // AI Attendance Audit (Gap Analysis)
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('AI Attendance Audit & Shift Analysis');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666')
      .text('Date', 50, doc.y)
      .text('Clock-In', 120, doc.y)
      .text('First Activity', 220, doc.y)
      .text('Gap Detected', 320, doc.y)
      .text('Integrity Status', 420, doc.y);
    doc.moveDown(0.5);
    doc.rect(50, doc.y, 512, 1).fill('#eee');
    doc.moveDown(0.5);

    auditLogs.forEach(l => {
      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#444')
        .text(l.date, 50, rowY)
        .text(l.in, 120, rowY)
        .text(l.act, 220, rowY)
        .fillColor(parseInt(l.gap) > 60 ? '#d32f2f' : '#444').text(l.gap, 320, rowY)
        .fillColor('#444').text((l.status || 'present').toUpperCase(), 420, rowY);
      doc.moveDown(1);
    });

    doc.moveDown(2);

    doc.moveDown(6);

    // Compliance Statement
    doc.rect(50, doc.y, 512, 40).fill('#f9f9f9');
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666')
      .text('This document is electronically generated and serves as an official record for performance appraisal purposes. Data is collected via direct activity monitoring and AI classification.', 60, doc.y - 32, { width: 490 });

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#ccc')
      .text('ProTrackAI v1.0 | MTN Rwanda Corporate Performance Management', 50, 750, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      // If headers were already sent (streaming), just end the response
      res.end();
    }
  }
});

/**
 * Generate comprehensive TEAM performance report for supervisors
 * GET /api/reports/team-pdf?period=month
 */
router.get('/team-pdf', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const supId = req.user.id;

    // Get supervisor team info reliably
    const supervisor = await User.findOne({ id: supId });
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(403).json({ error: 'Only supervisors can generate team reports' });
    }

    const team = supervisor.team;
    if (!team) return res.status(400).json({ error: 'No team associated with this supervisor' });

    // Fetch all employees in the team
    const teamEmployees = await User.find({
      team: { $regex: new RegExp(`^${team}$`, 'i') },
      role: 'employee'
    }).select('id name dept');

    if (teamEmployees.length === 0) {
      return res.status(404).json({ error: 'No employees found in your team' });
    }

    const employeeIds = teamEmployees.map(e => e.id);

    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = new Date();

    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start);
      endDate = new Date(req.query.end);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // day
    }

    // Aggregate data for all employees at once to be efficient
    const allActivities = await Activity.find({
      userId: { $in: employeeIds },
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const allTimeLogs = await TimeLog.find({
      userId: { $in: employeeIds },
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const allTasks = await Task.find({
      userId: { $in: employeeIds },
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Per-user metrics map
    const teamStats = teamEmployees.map(emp => {
      const userActivities = allActivities.filter(a => a.userId === emp.id);
      const userLogs = allTimeLogs.filter(l => l.userId === emp.id);
      const userTasks = allTasks.filter(t => t.userId === emp.id);

      // Productivity
      const totalDur = userActivities.reduce((sum, a) => sum + a.duration, 0);
      const prodDur = userActivities.filter(a => a.classified === 'productive').reduce((sum, a) => sum + a.duration, 0);
      const prodRate = totalDur > 0 ? Math.round((prodDur / totalDur) * 100) : 0;

      // Attendance
      const checkIns = userLogs.filter(l => l.type === 'check-in');
      const present = checkIns.filter(l => l.status === 'present').length;
      const attRate = checkIns.length > 0 ? Math.round((present / checkIns.length) * 100) : 0;

      // Tasks
      const completedTasks = userTasks.filter(t => t.completed).length;
      const taskRate = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;

      return {
        id: emp.id,
        name: emp.name,
        productivity: prodRate,
        hours: (totalDur / 3600).toFixed(1),
        attendance: attRate,
        tasks: taskRate,
        taskCount: userTasks.length
      };
    });

    // Generate PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Team_Report_${team.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 15).fill('#ffcc00');
    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('Team Performance Executive Summary', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('MTN RWANDA CORPORATE AUDIT', { align: 'center' });

    // Logo for Team Report
    const logoBufferTeam = await fetchMTNLogo();
    if (logoBufferTeam) {
      doc.image(logoBufferTeam, 40, 35, { width: 45 });
    }
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Team: ${team} | Period: ${period.toUpperCase()}`, { align: 'center' });
    doc.text(`Generated on: ${now.toLocaleString()}`, { align: 'center' });

    doc.moveDown(2);
    doc.rect(40, doc.y, 515, 1).fill('#eee');
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('Employee Name', 40, tableTop);
    doc.text('ID', 160, tableTop);
    doc.text('Prod %', 230, tableTop);
    doc.text('Att %', 350, tableTop);
    doc.text('Tasks', 420, tableTop);
    doc.text('Rating', 490, tableTop);

    doc.moveDown(0.5);
    doc.rect(40, doc.y, 515, 1).fill('#ffcc00'); // MTN Gold line
    doc.moveDown(0.5);

    // Table Rows
    teamStats.forEach((stat, i) => {
      const y = doc.y;

      // Alternate background
      if (i % 2 === 1) {
        doc.rect(40, y - 2, 515, 15).fill('#f9f9f9');
      }

      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(stat.name, 40, y);
      doc.text(stat.id, 160, y);

      // Color coded productivity
      const prodColor = stat.productivity >= 75 ? '#2e7d32' : stat.productivity >= 50 ? '#f9a825' : '#d32f2f';
      doc.fillColor(prodColor).text(`${stat.productivity}%`, 230, y);

      doc.fillColor('#333').text(stat.hours, 300, y);
      doc.text(`${stat.attendance}%`, 350, y);
      doc.text(`${stat.tasks}%`, 420, y);

      const statusText = stat.productivity >= 70 ? 'Optimal' : stat.productivity >= 40 ? 'Fair' : 'Critical';
      doc.fillColor(prodColor).text(statusText, 490, y);

      doc.moveDown(0.8);
    });

    doc.moveDown(2);
    doc.rect(40, doc.y, 515, 1).fill('#eee');
    doc.moveDown(1);

    // Summary Metrics
    const teamAvgProd = Math.round(teamStats.reduce((s, a) => s + a.productivity, 0) / teamStats.length);
    const teamTotalHrs = teamStats.reduce((s, a) => s + parseFloat(a.hours), 0).toFixed(1);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('Team Aggregates');
    doc.fontSize(10).font('Helvetica').fillColor('#444');
    doc.text(`Overall Team Productivity: ${teamAvgProd}%`, 40, doc.y + 10);
    doc.text(`Cumulative Man-Hours: ${teamTotalHrs} hrs`, 40, doc.y + 5);
    doc.text(`Team Size: ${teamStats.length} Members`, 40, doc.y + 5);

    doc.moveDown(5);
    doc.fontSize(8).fillColor('#999').text('This report is a consolidated team performance record generated by ProTrackAI.', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('Team PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  }
});

/**
 * Generate comprehensive ORGANIZATION-WIDE performance report for HR
 * GET /api/reports/hr-pdf?period=month
 */
router.get('/hr-pdf', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Only HR can generate organization-wide reports' });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = new Date();

    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start);
      endDate = new Date(req.query.end);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch all workforce data in one scope
    const allUsers = await User.find({}).select('id name dept team role');
    const allActivities = await Activity.find({ timestamp: { $gte: startDate, $lte: endDate } });

    // 1. Overall Metrics
    const totalStaff = allUsers.filter(u => u.role === 'employee').length;
    const totalDuration = allActivities.reduce((sum, a) => sum + a.duration, 0);
    const prodDuration = allActivities.filter(a => a.classified === 'productive').reduce((sum, a) => sum + a.duration, 0);
    const avgEfficiency = totalDuration > 10 ? Math.round((prodDuration / totalDuration) * 100) : 0;

    // 2. Department Metrics
    const departments = [...new Set(allUsers.map(u => u.dept).filter(d => d))];
    const deptStats = departments.map(d => {
      const deptUserIds = allUsers.filter(u => u.dept === d).map(u => u.id);
      const acts = allActivities.filter(a => deptUserIds.includes(a.userId));
      const tot = acts.reduce((s, a) => s + a.duration, 0);
      const prd = acts.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
      return {
        name: d,
        count: deptUserIds.length,
        prod: tot > 0 ? Math.round((prd / tot) * 100) : 0,
        hours: Math.round(tot / 3600)
      };
    }).sort((a, b) => b.prod - a.prod);

    // 3. Team Metrics
    const teams = [...new Set(allUsers.map(u => u.team).filter(t => t))];
    const teamStats = teams.map(t => {
      const teamUserIds = allUsers.filter(u => u.team === t).map(u => u.id);
      const acts = allActivities.filter(a => teamUserIds.includes(a.userId));
      const tot = acts.reduce((s, a) => s + a.duration, 0);
      const prd = acts.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
      return {
        name: t,
        prod: tot > 0 ? Math.round((prd / tot) * 100) : 0,
        hours: Math.round(tot / 3600)
      };
    }).sort((a, b) => b.prod - a.prod);

    // Generate PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ProTrackAI_Workforce_Report.pdf');
    doc.pipe(res);

    // Header (MTN Style Gold/Black)
    doc.rect(0, 0, 595, 20).fill('#ffcc00');
    doc.moveDown(2);
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#000').text('MTN RWANDA: WORKFORCE PERFORMANCE AUDIT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`EXECUTIVE SUMMARY | PERIOD: ${period.toUpperCase()}`, { align: 'center' });
    doc.text(`Generated: ${now.toLocaleString()}`, { align: 'center' });

    // Draw MTN Logo for HR
    const logoBufferHR = await fetchMTNLogo();
    if (logoBufferHR) {
      doc.image(logoBufferHR, 40, 45, { width: 50 });
    }

    doc.moveDown(2);
    doc.rect(40, doc.y, 515, 1).fill('#ffcc00');
    doc.moveDown(1.5);

    // Master KPIs
    const kpiY = doc.y;
    doc.rect(40, kpiY, 160, 60).stroke('#eee');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('ACTIVE WORKFORCE', 50, kpiY + 10);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text(totalStaff.toString(), 50, kpiY + 25);

    doc.rect(215, kpiY, 160, 60).stroke('#eee');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('ORG EFFICIENCY', 225, kpiY + 10);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffcc00').text(`${avgEfficiency}%`, 225, kpiY + 25);

    doc.rect(390, kpiY, 160, 60).stroke('#eee');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('TOTAL LOGGED HRS', 400, kpiY + 10);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text(Math.round(totalDuration / 3600).toString(), 400, kpiY + 25);

    doc.moveDown(5);

    // Departmental Analysis
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Departmental Performance Analysis');
    doc.moveDown(1);

    // Simple table for depts
    doc.fontSize(10).font('Helvetica-Bold').text('Department Name', 50, doc.y);
    doc.text('Productivity %', 250, doc.y - 12);
    doc.text('Total Hours', 350, doc.y - 12);
    doc.text('Staff Count', 450, doc.y - 12);
    doc.moveDown(0.5);
    doc.rect(40, doc.y, 515, 1).fill('#333');
    doc.moveDown(0.5);

    deptStats.slice(0, 10).forEach(d => {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor('#333').text(d.name, 50, y);
      doc.text(`${d.prod}%`, 250, y);
      doc.text(`${d.hours}h`, 350, y);
      doc.text(d.count.toString(), 450, y);
      doc.moveDown(0.8);
    });

    doc.moveDown(3);

    // Team Benchmarks
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Team Benchmarks (Top 10 Units)');
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold').text('Unit / Team Name', 50, doc.y);
    doc.text('Efficiency Rating', 350, doc.y - 12);
    doc.text('Total Output', 450, doc.y - 12);
    doc.moveDown(0.5);
    doc.rect(40, doc.y, 515, 1).fill('#333');
    doc.moveDown(0.5);

    teamStats.slice(0, 10).forEach(t => {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor('#333').text(t.name, 50, y);
      const color = t.prod >= 75 ? '#2e7d32' : t.prod >= 50 ? '#f9a825' : '#d32f2f';
      doc.fillColor(color).text(`${t.prod}%`, 350, y);
      doc.fillColor('#333').text(`${t.hours}h`, 450, y);
      doc.moveDown(0.8);
    });

    doc.moveDown(5);
    doc.fontSize(8).fillColor('#999').text('This document is a confidential workforce performance record generated automatically by the ProTrackAI system.', { align: 'center' });
    doc.text('MTN Rwanda Organizational Excellence Division.', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('HR PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

module.exports = router;