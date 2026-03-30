import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, Select, MenuItem, FormControl, Button,
    List, ListItem, ListItemText, CircularProgress, Chip, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tabs, Tab
} from '@mui/material';
import {
    TrendingUp, TrendingDown, Assessment, Warning, CheckCircle,
    Star, AccessTime, AssignmentTurnedIn, GetApp, Speed
} from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const SupervisorDashboard = () => {
    const { user } = useContext(AuthContext);
    const [period, setPeriod] = useState('month');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const res = await axios.get(`/api/analytics/supervisor`, {
                    params: {
                        supId: user.id || user.userId,
                        team: user.team,
                        period,
                        start: period === 'custom' ? startDate : undefined,
                        end: period === 'custom' ? endDate : undefined
                    }
                }).catch(e => ({ data: null }));

                if (res.data) setAnalytics(res.data);
            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, period, startDate, endDate]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress color="primary" /></Box>;
    if (!analytics) return <Typography color="error" align="center" mt={5}>No team data available. Consult HR to join a team.</Typography>;

    // Chart Data
    const chartData = {
        labels: (analytics.userProd || []).map(u => u.name),
        datasets: [
            {
                label: 'Productivity %',
                data: (analytics.userProd || []).map(u => u.productivity),
                backgroundColor: (analytics.userProd || []).map(u =>
                    u.productivity >= 70 ? '#4caf50' : u.productivity >= 40 ? '#ffcc00' : '#f44336'
                ),
                borderRadius: 4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Productivity: ${context.raw}%`
                }
            }
        },
        scales: {
            y: { beginAtZero: true, max: 100 }
        },
        maintainAspectRatio: false
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    const pulseKeyframes = `
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
        @keyframes pulse-away {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 193, 7, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }
    `;

    return (
        <Box>
            <style>{pulseKeyframes}</style>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Box>
                    <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                        Team <Box component="span" color="primary.main">Command</Box>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">Operational Management for Unit: <strong>{user.team}</strong></Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="custom">Custom Range</MenuItem>
                        </Select>
                    </FormControl>
                    {period === 'custom' && (
                        <Box display="flex" gap={1} alignItems="center">
                            <TextField
                                type="date"
                                size="small"
                                label="Start"
                                InputLabelProps={{ shrink: true }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                sx={{ width: 140 }}
                            />
                            <TextField
                                type="date"
                                size="small"
                                label="End"
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                sx={{ width: 140 }}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* KPI Row */}
            <Grid container spacing={4} mb={6}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="overline" fontWeight="bold">Productivity</Typography>
                            <Speed color="primary" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{analytics.productivity}%</Typography>
                        <Typography variant="caption" color={analytics.productivityTrend >= 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                            {analytics.productivityTrend >= 0 ? '+' : ''}{analytics.productivityTrend}% vs Last Period
                        </Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #000', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="overline" fontWeight="bold">Total Hours</Typography>
                            <AccessTime color="inherit" />
                        </Box>
                        <Typography variant="h3" fontWeight="950" sx={{ fontSize: { xs: '2rem', lg: '3rem' } }}>
                            {formatDuration(analytics.totalSeconds || analytics.totalHours * 3600)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">Cumulative Team Output</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="overline" fontWeight="bold">Completion</Typography>
                            <AssignmentTurnedIn color="primary" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{analytics.taskCompletion}%</Typography>
                        <Typography variant="caption" color="textSecondary">{analytics.openTasks} Active Tasks</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #000', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="overline" fontWeight="bold">Attendance</Typography>
                            <Assessment color="inherit" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{analytics.attendance || 0}%</Typography>
                        <Typography variant="caption" color="textSecondary">Punctuality-Weighted Score</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Hub Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
                    <Tab label="Performance Analytics" sx={{ fontWeight: 'bold' }} />
                    <Tab label="Live Team Status" sx={{ fontWeight: 'bold' }} />
                </Tabs>
            </Box>

            <Grid container spacing={4}>
                {/* Main Content Areas */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {activeTab === 0 && (
                        <Paper sx={{ p: 4, borderRadius: 3, mb: 4 }}>
                            <Typography variant="h5" fontWeight="950" mb={4}>Team Member Productivity</Typography>
                            <Box sx={{ height: 400, width: '100%' }}>
                                <Bar data={chartData} options={chartOptions} />
                            </Box>
                        </Paper>
                    )}

                    {activeTab === 1 && (
                        <Paper sx={{ p: 4, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight="950" mb={3}>Operational Status Roster</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Efficiency</TableCell>
                                            <TableCell align="left" sx={{ fontWeight: 'bold' }}>Current Action / Justification</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(analytics.userProd || []).map((u, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{
                                                            width: 10, height: 10, borderRadius: '50%',
                                                            bgcolor: u.liveStatus === 'check-in' ? '#4caf50' : '#ffc107',
                                                            animation: u.liveStatus === 'check-in' ? 'pulse 2s infinite' : 'pulse-away 2s infinite'
                                                        }} />
                                                        <Typography variant="caption" fontWeight="bold" sx={{ color: u.liveStatus === 'check-in' ? '#4caf50' : '#ffc107', textTransform: 'uppercase' }}>
                                                            {u.liveStatus === 'check-in' ? 'Checked In' : 'Away'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{u.name}</TableCell>
                                                <TableCell align="center">
                                                    <Chip 
                                                        label={`${u.productivity}%`} 
                                                        size="small" 
                                                        color={u.productivity >= 70 ? 'success' : u.productivity >= 40 ? 'warning' : 'error'}
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="left">
                                                    <Chip 
                                                        label={u.lastCheckOutReason || (u.liveStatus === 'check-in' ? 'Active' : 'Reason not provided')}
                                                        size="small"
                                                        variant="outlined"
                                                        color={u.liveStatus === 'check-in' ? 'success' : 'warning'}
                                                        sx={{ 
                                                            fontWeight: 'bold', 
                                                            textTransform: 'uppercase',
                                                            fontSize: '0.65rem',
                                                            px: 1,
                                                            bgcolor: u.liveStatus === 'check-in' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)'
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Grid>

                {/* Alerts & Top Performer */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#000', color: '#ffcc00', mb: 3 }}>
                        <Typography variant="overline" fontWeight="bold">Unit Top Performer</Typography>
                        <Box display="flex" alignItems="center" gap={2} mt={1}>
                            <Star color="inherit" />
                            <Box>
                                <Typography variant="h6" fontWeight="bold">{analytics.topPerformer.name}</Typography>
                                <Typography variant="body2">{analytics.topPerformer.prod}% Efficiency</Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {analytics.underperforming?.length > 0 && (
                        <Paper sx={{ p: 3, borderRadius: 3, border: '2px solid #f44336', mb: 3, bgcolor: 'rgba(244, 67, 54, 0.05)' }}>
                            <Typography variant="overline" fontWeight="bold" color="error.main">Performance Risk</Typography>
                            <Box sx={{ mt: 2 }}>
                                {analytics.underperforming.map((p, i) => (
                                    <Box
                                        key={i}
                                        onClick={() => window.location.href = `/employee-risk/${p.userId || p.name}`}
                                        sx={{
                                            p: 1.5, mb: 1, borderRadius: 2, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'error.light',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'error.main', color: '#fff', '& *': { color: '#fff !important' } }
                                        }}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2" fontWeight="bold">{p.name}</Typography>
                                            <Typography variant="caption" fontWeight="bold" color="error.main">
                                                {p.score}% {p.type === 'attendance' ? 'ATT' : 'PROD'}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                            Critical {p.type === 'attendance' ? 'Attendance' : 'Productivity'} drop — Click to drilldown →
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    )}

                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="950" gutterBottom>Critical Operations Alerts</Typography>
                        {analytics.alerts.length > 0 ? (
                            <List dense>
                                {analytics.alerts.map((alert, i) => (
                                    <ListItem key={i} sx={{ borderLeft: '4px solid #f44336', mb: 1, bgcolor: 'action.hover' }}>
                                        <ListItemText
                                            primary={alert}
                                            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 'bold' }}
                                        />
                                        <Warning color="error" fontSize="small" />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                                <Typography variant="body2" color="textSecondary">All systems nominal. No alerts.</Typography>
                            </Box>
                        )}
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2, borderRadius: 2, fontWeight: 'bold' }}
                            onClick={() => window.location.href = '/tasks'}
                        >
                            Assign New Mission
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SupervisorDashboard;
