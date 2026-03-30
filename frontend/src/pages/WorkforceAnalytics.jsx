import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Grid, Paper, Typography, Box, Select, MenuItem, FormControl, Button, InputLabel,
    List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress
} from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Warning from '@mui/icons-material/Warning';
import Business from '@mui/icons-material/Business';
import Groups from '@mui/icons-material/Groups';
import FilterList from '@mui/icons-material/FilterList';
import Assessment from '@mui/icons-material/Assessment';
import Speed from '@mui/icons-material/Speed';

const WorkforceAnalytics = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [period, setPeriod] = useState('month');
    const [viewMode, setViewMode] = useState('department'); // 'department' or 'team'
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const analyticsRes = await axios.get(`/api/analytics/hr`, {
                    params: { period }
                }).catch(e => ({ data: { departments: [], teams: [], prodRatio: 0 } }));

                setAnalytics(analyticsRes.data);
            } catch (err) {
                console.error("Workforce Analytics Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, period]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress color="primary" /></Box>;
    if (!analytics) return <Typography color="error" align="center" mt={5}>No workforce data available. Please check your connection.</Typography>;

    const displayData = viewMode === 'department' ? (analytics.departments || []) : (analytics.teams || []);

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                    Workforce <Box component="span" color="primary.main">Intelligence</Box>
                </Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>View Mode</InputLabel>
                        <Select
                            value={viewMode}
                            label="View Mode"
                            onChange={(e) => setViewMode(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="department">By Department</MenuItem>
                            <MenuItem value="team">By Team</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Period</InputLabel>
                        <Select
                            value={period}
                            label="Period"
                            onChange={(e) => setPeriod(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="quarter">This Quarter</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Report Type</InputLabel>
                        <Select
                            value={reportType}
                            label="Report Type"
                            onChange={(e) => setReportType(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="all">Full Report</MenuItem>
                            <MenuItem value="attendance">Attendance</MenuItem>
                            <MenuItem value="productivity">Productivity</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Assessment />}
                        onClick={async () => {
                            try {
                                const response = await axios.get(`/api/reports/hr-pdf?period=${period}&reportType=${reportType}&viewMode=${viewMode}`, {
                                    responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                const dateStr = new Date().toISOString().split('T')[0];
                                link.setAttribute('download', `MTN_Workforce_Audit_${viewMode.toUpperCase()}_${reportType.toUpperCase()}_${period}_${dateStr}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                            } catch (err) {
                                console.error("HR PDF Download Error:", err);
                                alert("Failed to generate HR Audit Report.");
                            }
                        }}
                        sx={{ borderRadius: 2, fontWeight: 'bold', px: 3 }}
                    >
                        HR Audit PDF
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={4} mb={6}>
                {/* Apps Lists */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 3, borderTop: '6px solid #4caf50' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h5" fontWeight="950">
                                Corporate <Box component="span" color="success.main">Asset</Box> Utilization
                            </Typography>
                            <TrendingUp color="success" />
                        </Box>
                        <List>
                            {(analytics.topProductive || []).map((app, i) => (
                                <ListItem key={i} divider={i !== analytics.topProductive.length - 1} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={app.name}
                                        secondary={`Standard Operational Tool - ${formatDuration(app.duration)} Logged`}
                                        primaryTypographyProps={{ fontWeight: 'bold' }}
                                    />
                                    <Typography variant="h6" fontWeight="950" color="success.main">{app.percent}%</Typography>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 3, borderTop: '6px solid #f44336' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h5" fontWeight="950">
                                Resource <Box component="span" color="error.main">Attrition</Box> Risk
                            </Typography>
                            <Warning color="error" />
                        </Box>
                        <List dense>
                            {(analytics.topNonProductive || []).map((app, i) => (
                                <ListItem key={i} divider={i !== analytics.topNonProductive.length - 1} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={app.name}
                                        secondary={`Non-Core Activity - ${formatDuration(app.duration)} Exposure`}
                                        primaryTypographyProps={{ fontWeight: 'bold', color: 'error.main' }}
                                    />
                                    <Typography variant="h6" fontWeight="950" color="error.main">{app.percent}%</Typography>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Performance Risk Roster */}
            {analytics.underperforming?.length > 0 && (
                <Paper sx={{ p: 4, borderRadius: 3, mb: 6, borderTop: '6px solid #f44336' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5" fontWeight="950">
                            Workforce <Box component="span" color="error.main">Integrity</Box> Risk Roster (Under 50% Efficiency)
                        </Typography>
                        <Chip label={`${analytics.underperforming.length} EMPLOYEES AT RISK`} color="error" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Grid container spacing={2}>
                        {analytics.underperforming.map((risk, i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <Box
                                    onClick={() => navigate(`/employee-risk/${risk.userId || risk.name}`)}
                                    sx={{
                                        p: 2, borderRadius: 2, bgcolor: 'action.hover',
                                        border: '1px solid', borderColor: 'divider',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: 'error.main', color: '#fff', '& *': { color: '#fff !important' } }
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight="bold">{risk.name}</Typography>
                                    <Typography variant="caption" color="textSecondary" display="block">
                                        {risk.dept} | {risk.team}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                                        <Box sx={{ flex: 1, height: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
                                            <Box sx={{ width: `${risk.score}%`, height: '100%', bgcolor: 'error.main', borderRadius: 2 }} />
                                        </Box>
                                        <Typography variant="caption" fontWeight="bold" color="error.main">{risk.score}%</Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>Click to view profile →</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Drilldown Table */}
            <Paper sx={{ p: 4, borderRadius: 3, overflow: 'hidden', borderTop: '6px solid #ffcc00' }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                    {viewMode === 'department' ? <Business color="primary" /> : <Groups color="primary" />}
                    <Typography variant="h5" fontWeight="950">
                        {viewMode === 'department' ? 'Departmental Hierarchy Benchmarking' : 'Functional Team Benchmarking'}
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {viewMode === 'department' ? 'Department' : 'Team / Unit'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Efficiency (%)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Attendance (%)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Output (Hours)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Integrity Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayData.map((item, i) => (
                                <TableRow key={i} hover>
                                    <TableCell sx={{ fontWeight: '900', color: 'text.primary' }}>{item.name}</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={1.5}>
                                            <CircularProgress
                                                variant="determinate"
                                                value={item.prod}
                                                size={32}
                                                thickness={7}
                                                color={item.prod >= 70 ? 'success' : item.prod >= 50 ? 'warning' : 'error'}
                                            />
                                            <Typography variant="h6" fontWeight="900">{item.prod}%</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="h6" fontWeight="900" color={item.attendance >= 90 ? 'success.main' : item.attendance >= 70 ? 'warning.main' : 'error.main'}>
                                            {item.attendance || 0}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: '700' }}>
                                        {formatDuration(item.totalDuration || item.loggedHours * 3600)}
                                        {viewMode === 'department' && <Typography variant="caption" display="block" color="textSecondary">Aggregated</Typography>}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={item.prod >= 70 ? 'Optimal' : item.prod >= 40 ? 'Fair' : 'Risk'}
                                            size="small"
                                            color={item.prod >= 70 ? 'success' : item.prod >= 40 ? 'warning' : 'error'}
                                            sx={{ fontWeight: 'bold', px: 1 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default WorkforceAnalytics;
