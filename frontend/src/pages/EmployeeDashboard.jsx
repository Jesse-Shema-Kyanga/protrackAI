import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Chip, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
    Alert, AlertTitle
} from '@mui/material';
import ReactJoyride from 'react-joyride';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import AuthContext from '../context/AuthContext';


ChartJS.register(ArcElement, Tooltip, Legend);

const EmployeeDashboard = () => {
    const { user } = useContext(AuthContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [awayReasonOpen, setAwayReasonOpen] = useState(false);
    const [awayReason, setAwayReason] = useState('End of Day');
    const [customReason, setCustomReason] = useState('');

    const fetchDashboardData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const userId = user.id;

            // Fetch all data in parallel
            const [reportRes, tasksRes, feedbackRes, attendanceRes] = await Promise.all([
                axios.get(`/api/reports?userId=${userId}&period=week`).catch(e => ({ data: {} })),
                axios.get(`/api/tasks/${userId}`).catch(e => ({ data: [] })),
                axios.get(`/api/feedback/${userId}`).catch(e => ({ data: [] })),
                axios.get(`/api/time?userId=${userId}`).catch(e => ({ data: {} }))
            ]);

            setData({
                report: reportRes.data,
                tasks: tasksRes.data,
                feedback: feedbackRes.data,
                attendance: attendanceRes.data
            });

            // Set initial status from attendance data
            setIsCheckedIn(attendanceRes.data.realTimeStatus === 'check-in');
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const handleAttendanceToggle = () => {
        if (isCheckedIn) {
            // If checked in, we want to clock out, so open the justification dialog
            setAwayReasonOpen(true);
        } else {
            // Clock in immediately
            submitTimeLog('check-in');
        }
    };

    const submitTimeLog = async (nextType, reason = '') => {
        setActionLoading(true);
        setAwayReasonOpen(false);
        try {
            const logRes = await axios.post('/api/time/log-time', { 
                userId: user.id, 
                type: nextType,
                reason: reason
            });

            if (logRes.data.success || logRes.data.message) {
                // Optimistic update + fetch fresh data to sync
                setIsCheckedIn(nextType === 'check-in');
                await fetchDashboardData();
            }
        } catch (err) {
            console.error("Attendance error:", err);
            alert("Attendance action failed. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress color="primary" /></Box>;
    if (!data) return <Typography color="error" align="center" mt={5}>Failed to load dashboard data. Please check your connection.</Typography>;

    // Calculations
    const efficiency = data.report.efficiency || '0%';
    const effNum = parseInt(efficiency) || 0;
    const totalSec = data.report.totalTime || 0;
    const tasksToday = (data.tasks || []).filter(t => t.completed && t.timestamp && t.timestamp.startsWith(new Date().toISOString().split('T')[0])).length;
    const tasksPending = (data.tasks || []).filter(t => !t.completed).length;

    // Productivity Pie Chart
    const prodSec = data?.report?.productiveTime || 0;
    const neutralSec = data?.report?.neutralTime || 0;
    const nonProdSec = data?.report?.nonProductiveTime || 0;

    const chartData = {
        labels: ['Productive', 'Neutral', 'Non-Productive'],
        datasets: [{
            data: [prodSec, neutralSec, nonProdSec],
            backgroundColor: ['#4caf50', '#333333', '#f44336'], // Green, Gray, Red
            hoverOffset: 4,
            borderWidth: 0,
            cutout: '80%'
        }],
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    return (
        <Box sx={{ py: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={6}>
                <Box>
                    <Typography variant="h4" sx={{ mb: 1, fontWeight: 900 }}>
                        Hello, {user?.name?.split(' ')[0] || 'Team Member'} 👋
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Here's your productivity breakdown for the current sprint.
                    </Typography>
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <Button
                        variant="contained"
                        color={isCheckedIn ? "error" : "primary"}
                        onClick={handleAttendanceToggle}
                        disabled={actionLoading}
                        sx={{
                            fontWeight: 'bold',
                            borderRadius: 2,
                            px: 4,
                            height: 48,
                            bgcolor: isCheckedIn ? '#000' : '#ffcc00',
                            color: isCheckedIn ? '#fff' : '#000',
                            '&:hover': { bgcolor: isCheckedIn ? '#333' : '#e6b800' }
                        }}
                    >
                        {actionLoading ? <CircularProgress size={24} color="inherit" /> : (isCheckedIn ? "Clock Out" : "Clock In")}
                    </Button>
                    <Chip
                        label={isCheckedIn ? "Live Tracking Active" : "Tracking Paused"}
                        color={isCheckedIn ? "success" : "default"}
                        variant="outlined"
                        sx={{ fontWeight: 'bold', borderRadius: 2, borderStyle: 'dashed' }}
                    />
                </Box>
            </Box>

            {/* Away Justification Dialog */}
            <Dialog open={awayReasonOpen} onClose={() => setAwayReasonOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Pause Tracking / Clock Out</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" mb={2} mt={1}>
                        Please provide a reason or justification for stepping away from the system.
                    </Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Reason for Away Time</InputLabel>
                        <Select
                            value={awayReason}
                            label="Reason for Away Time"
                            onChange={(e) => setAwayReason(e.target.value)}
                        >
                            <MenuItem value="End of Day">End of Day (Clock Out)</MenuItem>
                            <MenuItem value="Lunch Break">Lunch Break</MenuItem>
                            <MenuItem value="Meeting (Offline)">Meeting (Offline)</MenuItem>
                            <MenuItem value="Quick Break">Quick Break (15m)</MenuItem>
                            <MenuItem value="Other">Other (Custom)</MenuItem>
                        </Select>
                    </FormControl>
                    {awayReason === 'Other' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Please Specify"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="e.g., Doctor appointment"
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setAwayReasonOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        disabled={awayReason === 'Other' && !customReason.trim()}
                        onClick={() => submitTimeLog('check-out', awayReason === 'Other' ? customReason : awayReason)}
                    >
                        Confirm Away
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Early Productivity Warnings */}
            {totalSec > 3600 && effNum >= 50 && effNum <= 55 && (
                <Alert severity="warning" sx={{ mb: 4, borderRadius: 2, border: '1px solid #ff9800', bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
                    <AlertTitle sx={{ fontWeight: 'bold' }}>Performance Warning</AlertTitle>
                    Your productivity ({efficiency}) is dropping close to the 50% threshold. Please refocus on core tasks to avoid falling into the performance risk category.
                </Alert>
            )}
            {totalSec > 3600 && effNum < 50 && (
                <Alert severity="error" sx={{ mb: 4, borderRadius: 2, border: '1px solid #f44336', bgcolor: 'rgba(244, 67, 54, 0.05)' }}>
                    <AlertTitle sx={{ fontWeight: 'bold' }}>Critical Performance Risk</AlertTitle>
                    Your productivity ({efficiency}) has fallen below the 50% baseline. You have been flagged for review on the management dashboard. <strong>Supervisor visibility is active.</strong>
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* KPI Cards */}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper sx={{ p: 3, borderBottom: '6px solid #ffcc00', borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>Productivity Score</Typography>
                        <Typography variant="h2" fontWeight="900" color="primary">{efficiency}</Typography>
                        <Typography variant="caption" color="textSecondary">Daily performance score</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper sx={{ p: 3, borderBottom: '6px solid #000', borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>Daily Target</Typography>
                        <Box display="flex" alignItems="baseline" gap={1}>
                            <Typography variant="h2" fontWeight="900">{tasksToday}</Typography>
                            <Typography variant="h5" color="textSecondary">/ {tasksToday + tasksPending}</Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">Tasks completed today</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper sx={{ p: 3, borderBottom: '6px solid #ffcc00', borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>Work Hours</Typography>
                        <Typography variant="h2" fontWeight="900" sx={{ fontSize: { xs: '2rem', lg: '3.75rem' } }}>{formatDuration(totalSec)}</Typography>
                        <Typography variant="caption" color="textSecondary">Total logged this week</Typography>
                    </Paper>
                </Grid>

                {/* Main Content Area */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h5" fontWeight="900" gutterBottom sx={{ mb: 4, letterSpacing: '-1px' }}>
                            Activity Distribution
                        </Typography>
                        <Grid container spacing={4} alignItems="center">
                            <Grid size={{ xs: 12, sm: 5 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Doughnut
                                        data={chartData}
                                        options={{
                                            plugins: {
                                                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => {
                                                            const label = context.label || '';
                                                            const value = context.parsed || 0;
                                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                                            return `${label}: ${percentage}%`;
                                                        }
                                                    }
                                                }
                                            },
                                            cutout: '80%'
                                        }}
                                    />
                                    <Box sx={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        textAlign: 'center', pointerEvents: 'none'
                                    }}>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>{efficiency}</Typography>
                                        <Typography variant="caption">Productive</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 7 }}>
                                <Typography variant="h6" gutterBottom>Recent Insights</Typography>
                                <List dense>
                                    {(data.report.recentActivities || []).slice(0, 5).map((act, i) => (
                                        <ListItem key={i} sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                            <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{act.appName}</Typography>
                                                    <Typography variant="caption" color="textSecondary">{new Date(act.timestamp).toLocaleTimeString()}</Typography>
                                                </Box>
                                                <Chip
                                                    label={act.classified}
                                                    size="small"
                                                    color={act.classified === 'productive' ? 'success' : (act.classified === 'non-productive' ? 'error' : 'warning')}
                                                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
                                                />
                                            </Box>
                                        </ListItem>
                                    ))}
                                    {(!data.report.recentActivities || data.report.recentActivities.length === 0) && (
                                        <Typography color="textSecondary">No recent activity detected.</Typography>
                                    )}
                                </List>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Sidebar Cards */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 3, borderLeft: '6px solid #ffcc00', borderRadius: 2 }}>
                                <Typography variant="h6" gutterBottom>Upcoming Focus</Typography>
                                <List dense>
                                    {(data.tasks || []).filter(t => !t.completed).slice(0, 3).map((task, i) => (
                                        <ListItem key={i} sx={{ px: 0 }}>
                                            <ListItemText
                                                primary={task.title}
                                                secondary={`Due: ${new Date(task.due).toLocaleDateString()}`}
                                                primaryTypographyProps={{ fontWeight: 'bold' }}
                                            />
                                        </ListItem>
                                    ))}
                                    {(data.tasks || []).filter(t => !t.completed).length === 0 && (
                                        <Typography color="textSecondary">Great job! No pending tasks.</Typography>
                                    )}
                                </List>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{
                                p: 3,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 204, 0, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                color: 'text.primary',
                                borderRadius: 2,
                                borderLeft: '4px solid #ffcc00'
                            }}>
                                <Typography variant="h6" color="primary" gutterBottom>Feedback Highlight</Typography>
                                {data.feedback?.length > 0 ? (
                                    <Box>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                                            "{data.feedback[0].content}"
                                        </Typography>
                                        <Typography variant="caption" color="gray">- {data.feedback[0].from || 'Supervisor'}</Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="gray">No recent feedback.</Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EmployeeDashboard;
