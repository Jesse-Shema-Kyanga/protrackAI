import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, Grid, CircularProgress, Chip, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Divider, Alert, AlertTitle, List, ListItem, ListItemText
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Warning from '@mui/icons-material/Warning';
import CheckCircle from '@mui/icons-material/CheckCircle';
import axios from 'axios';

const EmployeeRiskProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    useEffect(() => {
        const fetch = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const [tasksRes, userRes, attendanceRes, analyticsRes] = await Promise.all([
                    axios.get(`/api/tasks/${userId}`).catch(() => ({ data: [] })),
                    axios.get(`/api/users/${userId}`).catch(() => ({ data: {} })),
                    axios.get(`/api/time`, { params: { userId } }).catch(() => ({ data: { logs: [], metrics: {} } })),
                    axios.get(`/api/analytics/hr`).catch(() => ({ data: { underperforming: [] } }))
                ]);

                const taskData = Array.isArray(tasksRes.data) ? tasksRes.data : [];
                const allUnderperforming = analyticsRes.data?.underperforming || [];
                const empRecord = allUnderperforming.find(e => e.userId === userId);

                setTasks(taskData);
                setUserInfo(userRes.data);
                setAttendance(attendanceRes.data);
                // Use score from underperforming list for productivity
                setReport(empRecord ? { efficiency: `${empRecord.score}%`, totalTime: null } : { efficiency: 'N/A', totalTime: null });
            } catch (err) {
                console.error('Risk profile error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [userId]);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress color="primary" />
        </Box>
    );

    const efficiency = report?.efficiency || '0%';
    const effNum = parseInt(efficiency) || 0;
    const totalSec = report?.totalTime || 0;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const logs = attendance?.logs || [];
    const metrics = attendance?.metrics || {};

    const statusColor = effNum >= 70 ? 'success' : effNum >= 50 ? 'warning' : 'error';
    const statusLabel = effNum >= 70 ? 'Optimal' : effNum >= 50 ? 'Fair' : 'Critical Risk';

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={4}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                    variant="outlined"
                    sx={{ borderRadius: 2, fontWeight: 'bold' }}
                >
                    Back
                </Button>
                <Box>
                    <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1px', textTransform: 'uppercase' }}>
                        Risk <Box component="span" color="error.main">Profile</Box>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {userInfo?.name || userId} — {userInfo?.dept || 'N/A'} | {userInfo?.team || 'N/A'}
                    </Typography>
                </Box>
            </Box>

            {/* Critical Alert */}
            {effNum < 50 && (
                <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
                    <AlertTitle fontWeight="bold">Performance Risk Active</AlertTitle>
                    This employee's productivity ({efficiency}) is currently below the 50% threshold and is flagged for management review.
                </Alert>
            )}
            {effNum >= 50 && effNum <= 55 && (
                <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
                    <AlertTitle fontWeight="bold">Performance Warning</AlertTitle>
                    This employee's productivity ({efficiency}) is in the warning zone (50–55%). Monitor closely.
                </Alert>
            )}

            {/* KPI Row */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3 }}>
                        <Typography variant="overline" fontWeight="bold" color="textSecondary">Productivity</Typography>
                        <Typography variant="h3" fontWeight="950" color={`${statusColor}.main`}>{efficiency}</Typography>
                        <Chip label={statusLabel} color={statusColor} size="small" sx={{ mt: 0.5, fontWeight: 'bold' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #000', borderRadius: 3 }}>
                        <Typography variant="overline" fontWeight="bold" color="textSecondary">Logged Time (month)</Typography>
                        <Typography variant="h3" fontWeight="950" sx={{ fontSize: '2rem' }}>{formatDuration(totalSec)}</Typography>
                        <Typography variant="caption" color="textSecondary">Total active time this month</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3 }}>
                        <Typography variant="overline" fontWeight="bold" color="textSecondary">Tasks</Typography>
                        <Box display="flex" alignItems="baseline" gap={1}>
                            <Typography variant="h3" fontWeight="950">{completedTasks}</Typography>
                            <Typography variant="h5" color="textSecondary">/ {completedTasks + pendingTasks}</Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">{pendingTasks} pending</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Attendance History */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="950" gutterBottom>Attendance History</Typography>
                        <Box display="flex" gap={3} mb={3}>
                            <Box textAlign="center">
                                <Typography variant="h5" fontWeight="bold" color="success.main">{metrics.present || 0}</Typography>
                                <Typography variant="caption" color="textSecondary">Present</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box textAlign="center">
                                <Typography variant="h5" fontWeight="bold" color="warning.main">{metrics.late || 0}</Typography>
                                <Typography variant="caption" color="textSecondary">Late</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box textAlign="center">
                                <Typography variant="h5" fontWeight="bold" color="error.main">{metrics.absent || 0}</Typography>
                                <Typography variant="caption" color="textSecondary">Absent</Typography>
                            </Box>
                        </Box>
                        <TableContainer sx={{ maxHeight: 320 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Clock In</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Clock Out</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Justification</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Hours</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.slice(0, 15).map((log, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{log.date}</TableCell>
                                            <TableCell>{log.checkInTime}</TableCell>
                                            <TableCell>{log.checkOutTime || '—'}</TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                                    {log.checkOutReason || (log.checkOutTime ? 'End of Day' : '—')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{log.hours !== '--' ? `${log.hours}h` : '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={(log.status || 'present').toUpperCase()}
                                                    size="small"
                                                    color={log.status === 'late' ? 'warning' : log.status === 'absent' ? 'error' : 'success'}
                                                    sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">No attendance records found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Activity & Pending Tasks */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                        <Typography variant="h6" fontWeight="950" gutterBottom>Recent Activity</Typography>
                        <List dense>
                            {(report?.recentActivities || []).slice(0, 6).map((act, i) => (
                                <ListItem key={i} sx={{ px: 0, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <ListItemText
                                        primary={act.appName}
                                        secondary={new Date(act.timestamp).toLocaleTimeString()}
                                        primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                                    />
                                    <Chip
                                        label={act.classified}
                                        size="small"
                                        color={act.classified === 'productive' ? 'success' : act.classified === 'non-productive' ? 'error' : 'warning'}
                                        sx={{ fontWeight: 'bold', fontSize: '0.6rem', textTransform: 'uppercase' }}
                                    />
                                </ListItem>
                            ))}
                            {(!report?.recentActivities || report.recentActivities.length === 0) && (
                                <Box sx={{ py: 2, textAlign: 'center' }}>
                                    <Typography variant="body2" color="textSecondary">No recent activity.</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="950" gutterBottom>Pending Tasks</Typography>
                        <List dense>
                            {tasks.filter(t => !t.completed).slice(0, 5).map((task, i) => (
                                <ListItem key={i} sx={{ px: 0 }}>
                                    <Warning color="warning" fontSize="small" sx={{ mr: 1 }} />
                                    <ListItemText
                                        primary={task.title}
                                        secondary={`Due: ${new Date(task.due).toLocaleDateString()}`}
                                        primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                                    />
                                </ListItem>
                            ))}
                            {tasks.filter(t => !t.completed).length === 0 && (
                                <Box sx={{ py: 2, textAlign: 'center' }}>
                                    <CheckCircle color="success" sx={{ mb: 0.5 }} />
                                    <Typography variant="body2" color="textSecondary">No pending tasks.</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EmployeeRiskProfile;
