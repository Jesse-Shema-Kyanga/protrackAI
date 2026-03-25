import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Grid, Paper, Typography, Box, Select, MenuItem, FormControl, Button,
    List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress, TextField
} from '@mui/material';
import Assessment from '@mui/icons-material/Assessment';
import Warning from '@mui/icons-material/Warning';
import CheckCircle from '@mui/icons-material/CheckCircle';
import GetApp from '@mui/icons-material/GetApp';
import Groups from '@mui/icons-material/Groups';
import Business from '@mui/icons-material/Business';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Speed from '@mui/icons-material/Speed';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const HRDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [period, setPeriod] = useState('month');
    const [analytics, setAnalytics] = useState(null);
    const [evals, setEvals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // 1. HR Analytics - Standardized route: /api/analytics/hr
                const params = { period };
                if (period === 'custom' && startDate && endDate) {
                    params.start = startDate;
                    params.end = endDate;
                }
                const analyticsRes = await axios.get(`/api/analytics/hr`, { params }).catch(e => ({ data: { departments: [], teams: [], prodRatio: 0 } }));

                // 2. Evaluations
                const evalsRes = await axios.get('/api/evals?hr=true').catch(e => ({ data: { pendingCount: 0 } }));

                setAnalytics(analyticsRes.data);
                setEvals(evalsRes.data);
            } catch (err) {
                console.error("HR Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, period, startDate, endDate]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress color="primary" /></Box>;
    if (!analytics || !evals) return <Typography color="error" align="center" mt={5}>No workforce data available. Please check your connection.</Typography>;

    // KPIs Calculations
    const totalEmployees = analytics.staffCount || 0;
    const prodRatio = analytics.prodRatio || 0;
    const pendingEvals = evals.pendingCount || 0;
    const deptCount = (analytics.departments || []).length || 0;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Box>
                    <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                        Executive <Box component="span" color="primary.main">Oversight</Box>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">Official Workforce Management Console - MTN Rwanda</Typography>
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="quarter">This Quarter</MenuItem>
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
                                sx={{ width: 150 }}
                            />
                            <TextField
                                type="date"
                                size="small"
                                label="End"
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                sx={{ width: 150 }}
                            />
                        </Box>
                    )}
                    <Button
                        variant="contained"
                        color="secondary"
                        sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
                        onClick={() => navigate('/org-management')}
                    >
                        Architecture
                    </Button>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={4} mb={6}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3, position: 'relative' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="overline" fontWeight="bold" color="textSecondary">Active Staff</Typography>
                            <Groups color="primary" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{totalEmployees}</Typography>
                        <Typography variant="caption" color="textSecondary">Current Reporting Units</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #000', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="overline" fontWeight="bold" color="textSecondary">Org. Efficiency</Typography>
                            <Speed color="inherit" />
                        </Box>
                        <Typography variant="h3" fontWeight="950" color={prodRatio >= 70 ? 'success.main' : 'warning.main'}>
                            {prodRatio}%
                        </Typography>
                        <Chip
                            label={prodRatio >= 70 ? 'Optimal' : 'Discussion Advised'}
                            size="small"
                            color={prodRatio >= 70 ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ mt: 0.5, fontWeight: 'bold' }}
                        />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #ffcc00', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="overline" fontWeight="bold" color="textSecondary">Strategic Pulse</Typography>
                            <TrendingUp color="primary" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{pendingEvals}</Typography>
                        <Typography variant="caption" color={pendingEvals > 0 ? "error.main" : "success.main"} fontWeight="bold">
                            {pendingEvals > 0 ? 'Pending Audit' : 'Complete'}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, borderTop: '6px solid #000', borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="overline" fontWeight="bold" color="textSecondary">Departments</Typography>
                            <Business color="inherit" />
                        </Box>
                        <Typography variant="h3" fontWeight="950">{deptCount}</Typography>
                        <Typography variant="caption" color="textSecondary">Active Vertical Segments</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Attendance & Participation Row */}
            <Grid container spacing={4} mb={6}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', borderLeft: '8px solid #ffcc00' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h6" fontWeight="950">Workforce Attendance</Typography>
                                <Typography variant="body2" color="textSecondary">System Participation Ratio</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="950" color="primary">{analytics.attendanceRate || 0}%</Typography>
                        </Box>
                        <Box sx={{ height: 8, width: '100%', bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${analytics.attendanceRate || 0}%`, bgcolor: 'primary.main' }} />
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', borderLeft: '8px solid #000' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h6" fontWeight="950">Punctuality Score</Typography>
                                <Typography variant="body2" color="textSecondary">On-Time Check-in Discipline</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="950">{analytics.onTimeRate || 0}%</Typography>
                        </Box>
                        <Box sx={{ height: 8, width: '100%', bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${analytics.onTimeRate || 0}%`, bgcolor: 'black' }} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                {/* Team Benchmarks Table */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, height: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                            <Typography variant="h5" fontWeight="900">Team Performance Benchmarks</Typography>
                            <Button size="small" onClick={() => navigate('/hr-analytics')}>Drill Down →</Button>
                        </Box>
                        <TableContainer sx={{ maxHeight: 400 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Team Name</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Efficiency</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Output</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(analytics.teams || []).map((team) => (
                                        <TableRow key={team.name} hover>
                                            <TableCell fontWeight="bold">{team.name}</TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Box sx={{ width: '100%', mr: 1 }}>
                                                        <Box sx={{ height: 8, width: '100%', bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                                            <Box sx={{ height: '100%', width: `${team.prod}%`, bgcolor: team.prod >= 70 ? 'success.main' : 'warning.main' }} />
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="body2">{team.prod}%</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{team.loggedHours}h</TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={team.prod >= 70 ? 'Elite' : team.prod >= 40 ? 'Fair' : 'Critical'}
                                                    color={team.prod >= 70 ? 'success' : team.prod >= 40 ? 'warning' : 'error'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!analytics.teams || analytics.teams.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">No team-level data found yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Top Tools / Alerts Column */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'secondary.main', color: 'secondary.contrastText', mb: 4 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Workforce Summary</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                            Overall organizational pulse is {prodRatio >= 70 ? 'Stable' : 'Volatile'}.
                            {prodRatio < 60 ? ' Multiple teams are performing below the corporate target.' : ' Performance is aligned with quarterly KPIs.'}
                        </Typography>
                        <Button
                            variant="outlined"
                            color="inherit"
                            fullWidth
                            sx={{ borderRadius: 2, fontWeight: 'bold' }}
                            onClick={() => navigate('/evaluations')}
                        >
                            Review {pendingEvals} Pending Audits
                        </Button>
                    </Paper>

                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Resource Efficiency Analysis</Typography>
                        <List dense>
                            {analytics.topNonProductive?.slice(0, 3).map((app, i) => (
                                <ListItem key={i} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={app.name}
                                        secondary={`${app.hours}h Logged - Policy Review Recommended`}
                                        primaryTypographyProps={{ fontWeight: 'bold' }}
                                    />
                                    <Warning color="error" fontSize="small" />
                                </ListItem>
                            ))}
                            {(!analytics.topNonProductive || analytics.topNonProductive.length === 0) && (
                                <Box sx={{ py: 2, textAlign: 'center' }}>
                                    <CheckCircle color="success" sx={{ mb: 1 }} />
                                    <Typography variant="body2">No major resource waste detected.</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default HRDashboard;
