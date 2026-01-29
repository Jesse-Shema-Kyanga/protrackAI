import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, Select, MenuItem, FormControl, Button,
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
    const [period, setPeriod] = useState('month');
    const [viewMode, setViewMode] = useState('department'); // 'department' or 'team'
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                    Workforce <Box component="span" color="primary.main">Intelligence</Box>
                </Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="department">By Department</MenuItem>
                            <MenuItem value="team">By Team</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 'bold' }}
                        >
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="quarter">This Quarter</MenuItem>
                        </Select>
                    </FormControl>
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
                                        secondary={`Standard Operational Tool - ${app.hours}h Logged`}
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
                                        secondary={`Non-Core Activity - ${app.hours}h Exposure`}
                                        primaryTypographyProps={{ fontWeight: 'bold', color: 'error.main' }}
                                    />
                                    <Typography variant="h6" fontWeight="950" color="error.main">{app.percent}%</Typography>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

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
                                    <TableCell align="center" sx={{ fontWeight: '700' }}>
                                        {item.loggedHours}h
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
