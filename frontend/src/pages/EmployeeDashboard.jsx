import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Chip, Button
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

    const handleAttendanceToggle = async () => {
        setActionLoading(true);
        try {
            const nextType = isCheckedIn ? 'check-out' : 'check-in';
            const logRes = await axios.post('/api/time/log-time', { userId: user.id, type: nextType });

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
                        <Typography variant="h2" fontWeight="900">{(totalSec / 3600).toFixed(1)}h</Typography>
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
