import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, Select, MenuItem, FormControl, Button,
    List, ListItem, ListItemText, CircularProgress, Chip, TextField
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

    const handleDownloadTeamPDF = async () => {
        try {
            let urlParams = `period=${period}`;
            if (period === 'custom' && startDate && endDate) {
                urlParams = `start=${startDate}&end=${endDate}`;
            }
            const response = await axios.get(`/api/reports/team-pdf?${urlParams}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `MTN_Team_Executive_Audit_${user.team}_${period}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("PDF Download Error:", err);
            alert("Failed to generate team report.");
        }
    };

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

    return (
        <Box>
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
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<GetApp />}
                        sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
                        onClick={handleDownloadTeamPDF}
                    >
                        Export
                    </Button>
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
                        <Typography variant="h3" fontWeight="950">{analytics.totalHours}</Typography>
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
                            <Typography variant="overline" fontWeight="bold">Compliance</Typography>
                            <Assessment color="inherit" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{analytics.alerts.length === 0 ? '100' : '85'}%</Typography>
                        <Typography variant="caption" color={analytics.alerts.length > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                            {analytics.alerts.length} Active Alerts
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                {/* Performance Chart */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, height: '100%' }}>
                        <Typography variant="h5" fontWeight="950" mb={4}>Team Member Performance</Typography>
                        <Box sx={{ height: 300, width: '100%' }}>
                            <Bar data={chartData} options={chartOptions} />
                        </Box>
                    </Paper>
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
