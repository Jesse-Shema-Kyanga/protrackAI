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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GOLD   = '#FFCC00';
const BLACK  = '#000000';
const DARK   = '#111111';
const MID    = '#444444';
const LIGHT  = '#888888';
const RULE   = '#DDDDDD';
const BG_ALT = '#F7F7F7';
const GREEN  = '#2E7D32';
const RED    = '#C62828';
const AMBER  = '#F9A825';

const PAGE_W = 595;
const PAGE_H = 842;
const L      = 45;
const R      = 550;
const COL_W  = R - L;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const drawSectionHeader = (doc, label, y) => {
  doc.rect(L, y, COL_W, 22).fill(DARK);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(GOLD)
    .text(label.toUpperCase(), L + 10, y + 6, { width: COL_W - 20, lineBreak: false });
  return y + 28;
};

const rule = (doc, y, color = RULE) => {
  doc.rect(L, y, COL_W, 0.5).fill(color);
  return y + 8;
};

const drawKPI = (doc, label, value, x, y, w, accent) => {
  w = w || 110; accent = accent || GOLD;
  doc.rect(x, y, w, 72).fill('#FAFAFA');
  doc.rect(x, y + 70, w, 2).fill(accent);
  doc.rect(x, y, w, 72).stroke(RULE);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(LIGHT)
    .text(label, x + 8, y + 10, { width: w - 16, lineBreak: false });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(DARK)
    .text(value, x + 8, y + 26, { width: w - 16, lineBreak: false });
};

const drawCover = async (doc, title, subtitle, detail) => {
  doc.rect(0, 0, PAGE_W, 8).fill(GOLD);
  doc.rect(0, 8, PAGE_W, 90).fill(DARK);

  // Logo
  doc.rect(L, 18, 60, 62).fill('#222222');
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('MTN', L + 15, 46, { lineBreak: false });
  try {
    const response = await axios.get('https://logonoid.com/images/mtn-logo.jpg', { responseType: 'arraybuffer' });
    doc.image(Buffer.from(response.data, 'binary'), L, 18, { width: 60, height: 62 });
  } catch (_) {}

  // Company name ABOVE the report title
  doc.fontSize(8).font('Helvetica-Bold').fillColor(GOLD)
    .text('MTN RWANDA', L + 72, 20, { width: COL_W - 72, lineBreak: false });
  // Report title below company name
  doc.fontSize(17).font('Helvetica-Bold').fillColor('#FFFFFF')
    .text(title, L + 72, 34, { width: COL_W - 72, lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor('#BBBBBB')
    .text(subtitle, L + 72, 60, { width: COL_W - 72, lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor('#888888')
    .text(detail, L + 72, 74, { width: COL_W - 72, lineBreak: false });

  doc.rect(0, 98, PAGE_W, 3).fill(GOLD);
};

const drawFooter = (doc, generatedOn) => {
  doc.rect(0, PAGE_H - 28, PAGE_W, 28).fill(DARK);
  doc.fontSize(7).font('Helvetica').fillColor('#888888')
    .text('ProTrackAI — MTN Rwanda Corporate Performance Management', L, PAGE_H - 18, { align: 'center', width: COL_W });
  doc.fillColor(LIGHT)
    .text('Generated: ' + generatedOn, L, PAGE_H - 18, { align: 'right', width: COL_W });
};

// ─ Duration Formatter ─────────────────────────────────────────────────────────
const formatDuration = (secs) => {
  if (!secs || secs <= 0) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// ─ Closing Signature Page ─────────────────────────────────────────────────────
const drawSignaturePage = (doc, requesterName, generatedOn) => {
  doc.addPage();
  // Full divider line near top
  doc.rect(L, 80, COL_W, 0.5).fill(RULE);

  // Left: Prepared by
  doc.fontSize(9).font('Helvetica').fillColor(LIGHT).text('Prepared by', L, 100, { lineBreak: false });
  doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK).text(requesterName, L, 116, { lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor(LIGHT).text('Date: ' + generatedOn.toLocaleDateString('en-GB'), L, 136, { lineBreak: false });

  // Right: Approved by
  const approvedX = L + COL_W / 2 + 30;
  doc.fontSize(9).font('Helvetica').fillColor(LIGHT).text('Approved by', approvedX, 100, { lineBreak: false });
  doc.rect(approvedX, 125, 185, 0.5).fill(DARK);
  doc.fontSize(8.5).font('Helvetica').fillColor(LIGHT).text('Date: _______________', approvedX, 134, { lineBreak: false });

  drawFooter(doc, generatedOn.toLocaleString());
};

const infoRow = (doc, label, value, x, y, valColor) => {
  valColor = valColor || MID;
  doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text(label, x, y, { lineBreak: false });
  doc.fontSize(8).font('Helvetica').fillColor(valColor).text(value, x + 90, y, { lineBreak: false });
};

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/reports  (JSON stats)
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId param' });

    const activities = await Activity.find({ userId }).sort({ timestamp: -1 }).limit(100);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyActivities = await Activity.find({ userId, timestamp: { $gte: today } }).sort({ timestamp: -1 });

    const src               = dailyActivities.length > 5 ? dailyActivities : activities;
    const totalTime         = src.reduce((s, a) => s + a.duration, 0);
    const productiveTime    = src.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
    const neutralTime       = src.filter(a => ['neutral', 'unknown', 'review_required'].includes(a.classified)).reduce((s, a) => s + a.duration, 0);
    const nonProductiveTime = src.filter(a => a.classified === 'non-productive').reduce((s, a) => s + a.duration, 0);
    const efficiency        = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) + '%' : '0%';
    const sanitized         = sanitizeActivities(activities.slice(0, 50), 'employee');

    res.json({ efficiency, totalTime, productiveTime, neutralTime, nonProductiveTime, recentActivities: sanitized, domainBreakdown: aggregateByDomain(activities) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/reports/pdf  (Employee PDF)
// ════════════════════════════════════════════════════════════════════════════
router.get('/pdf', async (req, res) => {
  try {
    const { userId, period = 'month', reportType = 'all' } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId param' });

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    let startDate, endDate = new Date();
    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start);
      endDate   = new Date(req.query.end); endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const activities = await Activity.find({ userId, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: -1 });
    const timeLogs   = await TimeLog.find({ userId, timestamp: { $gte: startDate, $lte: endDate } });
    const goals      = await Goal.find({ assignedTo: userId, createdAt: { $gte: startDate, $lte: endDate } });
    const tasks      = await Task.find({ userId, timestamp: { $gte: startDate, $lte: endDate } });

    const totalDuration      = activities.reduce((s, a) => s + a.duration, 0);
    const prodDuration       = activities.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
    const productivityRate   = totalDuration > 0 ? Math.round((prodDuration / totalDuration) * 100) : 0;
    const topApps            = aggregateByDomain(activities.filter(a => a.classified === 'productive')).slice(0, 3).map(d => ({ name: d.domain, hoursForm: formatDuration(d.totalDuration) }));
    const checkIns           = timeLogs.filter(l => l.type === 'check-in');
    const presentCount       = checkIns.filter(l => l.status === 'present').length;
    const lateCount          = checkIns.filter(l => l.status === 'late').length;
    const attendanceScore    = checkIns.length > 0 ? Math.round((presentCount / checkIns.length) * 100) : 0;
    const completedGoals     = goals.filter(g => g.progress === 100).length;
    const goalSuccessRate    = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
    const completedTasks     = tasks.filter(t => t.completed).length;
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const auditLogs = await Promise.all(checkIns.slice(0, 7).map(async (log) => {
      const ds = new Date(log.timestamp); ds.setHours(0,0,0,0);
      const de = new Date(log.timestamp); de.setHours(23,59,59,999);
      const fa = await Activity.findOne({ userId, timestamp: { $gte: ds, $lte: de } }).sort({ timestamp: 1 });
      const gapNum = fa ? Math.max(0, Math.round((fa.timestamp - log.timestamp) / 60000)) : null;
      return {
        date:   log.timestamp.toLocaleDateString('en-GB'),
        in:     log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        act:    fa ? fa.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        gap:    gapNum !== null ? gapNum + 'm' : '—',
        gapNum: gapNum || 0,
        status: (log.status || 'present').toUpperCase()
      };
    }));

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ProTrackAI_Employee_Report_' + userId + '.pdf');
    doc.pipe(res);

    const rLabel = reportType === 'all' ? 'EMPLOYEE PERFORMANCE REPORT' : reportType.toUpperCase() + ' REPORT';
    await drawCover(doc, rLabel,
      'MTN Rwanda — Official Performance Audit Document',
      'Period: ' + period.toUpperCase() + '  ·  From: ' + startDate.toLocaleDateString('en-GB') + '  ·  To: ' + endDate.toLocaleDateString('en-GB')
    );

    let y = 110;

    // Employee Profile
    y = drawSectionHeader(doc, 'Employee Profile', y);
    infoRow(doc, 'Full Name',   user.name,          L + 10, y);
    infoRow(doc, 'Employee ID', user.id,             R / 2 + 10, y);
    y += 14;
    infoRow(doc, 'Department',  user.dept || 'N/A',  L + 10, y);
    infoRow(doc, 'Team',        user.team || 'N/A',  R / 2 + 10, y);
    y += 14;
    infoRow(doc, 'Report Type', reportType.toUpperCase(), L + 10, y);
    infoRow(doc, 'Role',        (user.role || 'employee').toUpperCase(), R / 2 + 10, y);
    y += 18;
    y = rule(doc, y);

    // ── Numbered Performance Data Table ──────────────────────────────────
    y = drawSectionHeader(doc, 'Performance Summary', y);
    y += 4;

    // Table header row
    const PC = { sn: L, metric: L + 30, value: L + 280, status: L + 390 };
    doc.rect(L, y, COL_W, 18).fill('#EEEEEE');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
    doc.text('SN',     PC.sn     + 4, y + 4, { lineBreak: false });
    doc.text('METRIC', PC.metric + 4, y + 4, { lineBreak: false });
    doc.text('VALUE',  PC.value  + 4, y + 4, { lineBreak: false });
    doc.text('STATUS', PC.status + 4, y + 4, { lineBreak: false });
    y += 20;

    const empRows = [];
    if (reportType === 'all' || reportType === 'productivity') {
      empRows.push({ n: 1, metric: 'Productivity Rate',   value: productivityRate + '%',     color: productivityRate >= 70 ? GREEN : productivityRate >= 40 ? AMBER : RED, status: productivityRate >= 70 ? 'OPTIMAL' : productivityRate >= 40 ? 'FAIR' : 'CRITICAL' });
      empRows.push({ n: 2, metric: 'Goal Success Rate',   value: goalSuccessRate + '%',      color: GOLD,  status: goalSuccessRate >= 70 ? 'ON TRACK' : 'BELOW TARGET' });
      empRows.push({ n: 3, metric: 'Task Completion Rate',value: taskCompletionRate + '%',   color: GOLD,  status: taskCompletionRate >= 70 ? 'ON TRACK' : 'BELOW TARGET' });
      empRows.push({ n: 4, metric: 'Top Productive Tool', value: topApps.length ? topApps[0].name + ' (' + topApps[0].hoursForm + ')' : '—', color: MID, status: '—' });
    }
    if (reportType === 'all' || reportType === 'attendance') {
      empRows.push({ n: empRows.length + 1, metric: 'Attendance Score',  value: attendanceScore + '%',   color: attendanceScore >= 80 ? GREEN : AMBER, status: attendanceScore >= 80 ? 'GOOD' : 'NEEDS ATTENTION' });
      empRows.push({ n: empRows.length + 1, metric: 'On-Time Check-ins', value: presentCount + ' / ' + checkIns.length, color: MID, status: lateCount > 0 ? lateCount + ' LATE' : 'CLEAN' });
      empRows.push({ n: empRows.length + 1, metric: 'Absence Flags',     value: timeLogs.filter(l => l.status === 'absent').length + ' record(s)', color: MID, status: '—' });
    }

    empRows.forEach((row, ri) => {
      if (ri % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text('#' + row.n,     PC.sn     + 4, y + 2, { lineBreak: false });
      doc.font('Helvetica').fillColor(MID).text(row.metric,                           PC.metric + 4, y + 2, { lineBreak: false, width: 240 });
      doc.fillColor(row.color).font('Helvetica-Bold').text(row.value,                 PC.value  + 4, y + 2, { lineBreak: false });
      doc.fillColor(row.color).text(row.status,                                        PC.status + 4, y + 2, { lineBreak: false });
      y += 16;
    });

    y += 8;
    y = rule(doc, y);

    // ── Attendance Audit Table ────────────────────────────────────────────
    if (reportType === 'all' || reportType === 'attendance') {
      y = drawSectionHeader(doc, 'AI Attendance Audit — Shift Gap Analysis', y);
      y += 4;

      const AC = { date: L, cin: L + 90, act: L + 175, gap: L + 265, status: L + 350 };
      doc.rect(L, y, COL_W, 16).fill('#EEEEEE');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
      ['DATE', 'CLOCK IN', 'FIRST ACTIVITY', 'GAP', 'STATUS'].forEach((h, i) => {
        const xs = [AC.date, AC.cin, AC.act, AC.gap, AC.status];
        doc.text(h, xs[i] + 4, y + 4, { lineBreak: false });
      });
      y += 18;

      auditLogs.forEach((l, i) => {
        if (i % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
        doc.fontSize(8).font('Helvetica').fillColor(MID);
        doc.text(l.date,   AC.date   + 4, y + 2, { lineBreak: false });
        doc.text(l.in,     AC.cin    + 4, y + 2, { lineBreak: false });
        doc.text(l.act,    AC.act    + 4, y + 2, { lineBreak: false });
        doc.fillColor(l.gapNum > 60 ? RED : MID).text(l.gap, AC.gap + 4, y + 2, { lineBreak: false });
        const sc = l.status === 'LATE' ? AMBER : l.status === 'ABSENT' ? RED : GREEN;
        doc.fillColor(sc).font('Helvetica-Bold').text(l.status, AC.status + 4, y + 2, { lineBreak: false });
        y += 16;
      });
      if (!auditLogs.length) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(LIGHT).text('No check-in records found.', L + 10, y);
        y += 16;
      }
      y += 8;
      y = rule(doc, y);
    }

    // Disclaimer
    doc.rect(L, y, COL_W, 32).fill(BG_ALT);
    doc.rect(L, y, 3, 32).fill(GOLD);
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(LIGHT)
      .text('This document is electronically generated and constitutes an official MTN Rwanda performance record for appraisal and compliance purposes. Unauthorized reproduction is prohibited.', L + 10, y + 8, { width: COL_W - 16 });

    drawFooter(doc, now.toLocaleString());
    drawSignaturePage(doc, req.user.name || user.name, now);
    doc.end();

  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/reports/team-pdf  (Supervisor Team PDF)
// ════════════════════════════════════════════════════════════════════════════
router.get('/team-pdf', async (req, res) => {
  try {
    const { period = 'month', reportType = 'all' } = req.query;
    const supervisor = await User.findOne({ id: req.user.id });
    if (!supervisor || supervisor.role !== 'supervisor') return res.status(403).json({ error: 'Only supervisors can generate team reports' });

    const team = supervisor.team;
    if (!team) return res.status(400).json({ error: 'No team associated with this supervisor' });

    const teamEmployees = await User.find({ team: { $regex: new RegExp('^' + team + '$', 'i') }, role: 'employee' }).select('id name dept');
    if (!teamEmployees.length) return res.status(404).json({ error: 'No employees found in your team' });

    const employeeIds = teamEmployees.map(e => e.id);
    const now = new Date();
    let startDate, endDate = new Date();
    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start); endDate = new Date(req.query.end); endDate.setHours(23,59,59,999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const allActivities = await Activity.find({ userId: { $in: employeeIds }, timestamp: { $gte: startDate, $lte: endDate } });
    const allTimeLogs   = await TimeLog.find({ userId: { $in: employeeIds }, timestamp: { $gte: startDate, $lte: endDate } });
    const allTasks      = await Task.find({ userId: { $in: employeeIds }, timestamp: { $gte: startDate, $lte: endDate } });

    const teamStats = teamEmployees.map(emp => {
      const ua = allActivities.filter(a => a.userId === emp.id);
      const ul = allTimeLogs.filter(l => l.userId === emp.id);
      const ut = allTasks.filter(t => t.userId === emp.id);
      const tot = ua.reduce((s, a) => s + a.duration, 0);
      const prd = ua.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
      const chk = ul.filter(l => l.type === 'check-in');
      const prs = chk.filter(l => l.status === 'present').length;
      const cmp = ut.filter(t => t.completed).length;
      return { name: emp.name, id: emp.id, productivity: tot > 0 ? Math.round((prd / tot) * 100) : 0, durationRaw: tot, durationForm: formatDuration(tot), attendance: chk.length > 0 ? Math.round((prs / chk.length) * 100) : 0, tasks: ut.length > 0 ? Math.round((cmp / ut.length) * 100) : 0 };
    }).sort((a, b) => b.productivity - a.productivity);

    const teamAvgProd  = teamStats.length ? Math.round(teamStats.reduce((s, a) => s + a.productivity, 0) / teamStats.length) : 0;
    const teamTotalSecs = teamStats.reduce((s, a) => s + a.durationRaw, 0);
    const topMember    = teamStats[0] || null;

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Team_Report_' + team.replace(/\s+/g, '_') + '.pdf');
    doc.pipe(res);

    await drawCover(doc, 'TEAM PERFORMANCE EXECUTIVE SUMMARY',
      'MTN Rwanda — Unit: ' + team,
      'Period: ' + period.toUpperCase() + '  ·  From: ' + startDate.toLocaleDateString('en-GB') + '  ·  To: ' + endDate.toLocaleDateString('en-GB')
    );

    let y = 110;

    // ── Team Summary Row ─────────────────────────────────────────────────
    y = drawSectionHeader(doc, 'Team Overview', y);
    y += 4;
    const kW2 = Math.floor(COL_W / 4) - 4;
    drawKPI(doc, 'TEAM PRODUCTIVITY',  teamAvgProd + '%',        L,              y, kW2, teamAvgProd >= 70 ? GREEN : teamAvgProd >= 40 ? AMBER : RED);
    drawKPI(doc, 'TOTAL MAN-HOURS',    formatDuration(teamTotalSecs),       L + kW2 + 4,   y, kW2, GOLD);
    drawKPI(doc, 'TEAM SIZE',          teamStats.length + '',     L + (kW2+4)*2, y, kW2, GOLD);
    y += 80; // Adjusted y to account for KPI boxes
    y = rule(doc, y);

    // ── Numbered Employee Table ───────────────────────────────────────
    y = drawSectionHeader(doc, 'Employee Roster & Performance — ' + reportType.toUpperCase(), y);
    y += 4;

    const TC = { sn: L, name: L + 22, id: L + 140, prod: L + 220, hrs: L + 290, att: L + 345, task: L + 400, st: L + 455 };
    doc.rect(L, y, COL_W, 18).fill('#EEEEEE');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
    doc.text('SN',       TC.sn   + 2, y + 4, { lineBreak: false });
    doc.text('EMPLOYEE', TC.name + 4, y + 4, { lineBreak: false });
    doc.text('ID',       TC.id   + 4, y + 4, { lineBreak: false });
    if (reportType === 'all' || reportType === 'productivity') {
      doc.text('PROD %', TC.prod + 4, y + 4, { lineBreak: false });
      doc.text('HRS',    TC.hrs  + 4, y + 4, { lineBreak: false });
      doc.text('TASKS',  TC.task + 4, y + 4, { lineBreak: false });
    }
    if (reportType === 'all' || reportType === 'attendance') doc.text('ATT %', TC.att + 4, y + 4, { lineBreak: false });
    doc.text('STATUS',   TC.st   + 4, y + 4, { lineBreak: false });
    y += 20;

    teamStats.forEach((stat, i) => {
      if (i % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
      const pc = stat.productivity >= 75 ? GREEN : stat.productivity >= 50 ? AMBER : RED;
      const sl = stat.productivity >= 70 ? 'OPTIMAL' : stat.productivity >= 40 ? 'FAIR' : 'CRITICAL';
      doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text('#' + (i + 1), TC.sn + 2, y + 2, { lineBreak: false });
      doc.font('Helvetica').fillColor(MID);
      doc.text(stat.name.length > 16 ? stat.name.slice(0, 14) + '…' : stat.name, TC.name + 4, y + 2, { lineBreak: false });
      doc.fillColor(LIGHT).text(stat.id, TC.id + 4, y + 2, { lineBreak: false });
      if (reportType === 'all' || reportType === 'productivity') {
        doc.fillColor(pc).font('Helvetica-Bold').text(stat.productivity + '%', TC.prod + 4, y + 2, { lineBreak: false });
        doc.fillColor(MID).font('Helvetica').text(stat.durationForm, TC.hrs + 4, y + 2, { lineBreak: false });
        doc.text(stat.tasks + '%', TC.task + 4, y + 2, { lineBreak: false });
      }
      if (reportType === 'all' || reportType === 'attendance') {
        doc.fillColor(stat.attendance >= 80 ? GREEN : AMBER).text(stat.attendance + '%', TC.att + 4, y + 2, { lineBreak: false });
      }
      doc.fillColor(pc).font('Helvetica-Bold').text(sl, TC.st + 4, y + 2, { lineBreak: false });
      y += 16;
    });

    y += 10;
    y = rule(doc, y);

    doc.rect(L, y, COL_W, 28).fill(BG_ALT);
    doc.rect(L, y, 3, 28).fill(GOLD);
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(LIGHT)
      .text('Confidential team performance record generated by ProTrackAI. For internal use only. MTN Rwanda Operational Excellence Division.', L + 10, y + 8, { width: COL_W - 16 });

    drawFooter(doc, now.toLocaleString());
    drawSignaturePage(doc, req.user.name || supervisor.name, now);
    doc.end();

  } catch (err) {
    console.error('Team PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/reports/hr-pdf  (HR Workforce PDF)
// ════════════════════════════════════════════════════════════════════════════
router.get('/hr-pdf', async (req, res) => {
  try {
    const { period = 'month', reportType = 'all' } = req.query;
    if (req.user.role !== 'hr') return res.status(403).json({ error: 'Only HR can generate organization-wide reports' });

    const now = new Date();
    let startDate, endDate = new Date();
    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start); endDate = new Date(req.query.end); endDate.setHours(23,59,59,999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const allUsers      = await User.find({}).select('id name dept team role');
    const allActivities = await Activity.find({ timestamp: { $gte: startDate, $lte: endDate } });

    const totalStaff    = allUsers.filter(u => u.role === 'employee').length;
    const totalDuration = allActivities.reduce((s, a) => s + a.duration, 0);
    const prodDuration  = allActivities.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
    const avgEfficiency = totalDuration > 10 ? Math.round((prodDuration / totalDuration) * 100) : 0;

    const departments = [...new Set(allUsers.map(u => u.dept).filter(d => d))];
    const deptStats   = departments.map(d => {
      const ids  = allUsers.filter(u => u.dept === d).map(u => u.id);
      const acts = allActivities.filter(a => ids.includes(a.userId));
      const tot  = acts.reduce((s, a) => s + a.duration, 0);
      const prd  = acts.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
      return { name: d, count: ids.length, prod: tot > 0 ? Math.round((prd / tot) * 100) : 0, durationForm: formatDuration(tot) };
    }).sort((a, b) => b.prod - a.prod);

    const teams     = [...new Set(allUsers.map(u => u.team).filter(t => t))];
    const teamStats = teams.map(t => {
      const ids  = allUsers.filter(u => u.team === t).map(u => u.id);
      const acts = allActivities.filter(a => ids.includes(a.userId));
      const tot  = acts.reduce((s, a) => s + a.duration, 0);
      const prd  = acts.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
      return { name: t, prod: tot > 0 ? Math.round((prd / tot) * 100) : 0, durationForm: formatDuration(tot) };
    }).sort((a, b) => b.prod - a.prod);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ProTrackAI_Workforce_Audit.pdf');
    doc.pipe(res);

    const hrLabel = reportType === 'all' ? 'WORKFORCE PERFORMANCE AUDIT' : reportType.toUpperCase() + ' ORGANIZATIONAL REPORT';
    await drawCover(doc, hrLabel,
      'MTN Rwanda — HR Executive Summary',
      'Period: ' + period.toUpperCase() + '  ·  From: ' + startDate.toLocaleDateString('en-GB') + '  ·  To: ' + endDate.toLocaleDateString('en-GB')
    );

    let y = 110;

    // ── Org Summary Row ────────────────────────────────────────────────────
    y = drawSectionHeader(doc, 'Organization Summary', y);
    y += 4;
    const orgSummary = [
      ['Active Workforce', totalStaff + ' employees'],
      ['Org Efficiency', avgEfficiency + '%'],
      ['Total Logged Time', formatDuration(totalDuration)],
      ['Departments', departments.length + ''],
      ['Teams', teams.length + ''],
    ];
    orgSummary.forEach(([lbl, val], i) => {
      if (i % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text(lbl, L + 6, y + 2, { lineBreak: false });
      doc.font('Helvetica').fillColor(DARK).text(val, L + 180, y + 2, { lineBreak: false });
      y += 16;
    });
    y += 8;
    y = rule(doc, y);

    // Department table
    if (reportType === 'all' || reportType === 'productivity') {
      y = drawSectionHeader(doc, 'Departmental Performance Analysis', y);
      y += 4;

      const DC = { sn: L, name: L + 22, bar: L + 210, pct: L + 312, hrs: L + 382, cnt: L + 455 };
      doc.rect(L, y, COL_W, 18).fill('#EEEEEE');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
      doc.text('SN',         DC.sn   + 2, y + 4, { lineBreak: false });
      doc.text('DEPARTMENT', DC.name + 4, y + 4, { lineBreak: false });
      doc.text('EFFICIENCY', DC.bar  + 4, y + 4, { lineBreak: false });
      doc.text('HRS',        DC.hrs  + 4, y + 4, { lineBreak: false });
      doc.text('HEADCOUNT',  DC.cnt  + 4, y + 4, { lineBreak: false });
      y += 20;

      deptStats.slice(0, 10).forEach((d, i) => {
        if (i % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
        const dc = d.prod >= 75 ? GREEN : d.prod >= 50 ? AMBER : RED;
        const barMaxW = 70;
        const barW    = Math.round((d.prod / 100) * barMaxW);
        doc.rect(DC.bar + 4, y + 6, barMaxW, 4).fill(RULE);
        doc.rect(DC.bar + 4, y + 6, barW, 4).fill(dc);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text('#' + (i + 1), DC.sn + 2, y + 2, { lineBreak: false });
        doc.font('Helvetica').fillColor(MID).text(d.name, DC.name + 4, y + 2, { lineBreak: false });
        doc.fillColor(dc).font('Helvetica-Bold').text(d.prod + '%', DC.bar + barMaxW + 8, y + 2, { lineBreak: false });
        doc.fillColor(MID).font('Helvetica').text(d.durationForm, DC.hrs + 4, y + 2, { lineBreak: false });
        doc.text(d.count + '', DC.cnt + 4, y + 2, { lineBreak: false });
        y += 16;
      });

      y += 8;
      y = rule(doc, y);
    }

    // Team benchmarks
    if (reportType === 'all' || reportType === 'productivity') {
      const topN = Math.min(10, teamStats.length);
      y = drawSectionHeader(doc, 'Team Benchmarks — Top ' + topN + ' Units', y);
      y += 4;

      const TC2 = { sn: L, name: L + 22, prod: L + 280, hrs: L + 430 };
      doc.rect(L, y, COL_W, 18).fill('#EEEEEE');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
      doc.text('SN',             TC2.sn   + 2, y + 4, { lineBreak: false });
      doc.text('TEAM / UNIT',    TC2.name + 4, y + 4, { lineBreak: false });
      doc.text('EFFICIENCY RATING', TC2.prod + 4, y + 4, { lineBreak: false });
      doc.text('TOTAL HRS',     TC2.hrs  + 4, y + 4, { lineBreak: false });
      y += 20;

      teamStats.slice(0, 10).forEach((t, i) => {
        if (i % 2 === 1) doc.rect(L, y - 1, COL_W, 16).fill(BG_ALT);
        const tc = t.prod >= 75 ? GREEN : t.prod >= 50 ? AMBER : RED;
        const tl = t.prod >= 70 ? 'OPTIMAL' : t.prod >= 40 ? 'FAIR' : 'CRITICAL';
        doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT).text('#' + (i + 1), TC2.sn + 2, y + 2, { lineBreak: false });
        doc.font('Helvetica').fillColor(MID).text(t.name, TC2.name + 4, y + 2, { lineBreak: false });
        doc.fillColor(tc).font('Helvetica-Bold').text(t.prod + '%  (' + tl + ')', TC2.prod + 4, y + 2, { lineBreak: false });
        doc.fillColor(MID).font('Helvetica').text(t.durationForm, TC2.hrs + 4, y + 2, { lineBreak: false });
        y += 16;
      });

      y += 8;
      y = rule(doc, y);
    }

    // Disclaimer
    doc.rect(L, y, COL_W, 28).fill(BG_ALT);
    doc.rect(L, y, 3, 28).fill(GOLD);
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(LIGHT)
      .text('Confidential. This workforce audit is generated automatically by ProTrackAI and constitutes an official internal record. Restricted to authorized HR personnel. MTN Rwanda Organizational Excellence Division.', L + 10, y + 8, { width: COL_W - 16 });

    drawFooter(doc, now.toLocaleString());
    drawSignaturePage(doc, req.user.name, now);
    doc.end();

  } catch (err) {
    console.error('HR PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

module.exports = router;