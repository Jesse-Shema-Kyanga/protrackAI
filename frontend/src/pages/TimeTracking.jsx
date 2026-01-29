import { useState, useEffect, useContext } from 'react';
import {
    Grid, Paper, Typography, Box, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel,
    Select, MenuItem, TextField, Alert, Card, CardContent
} from '@mui/material';
import { Refresh, Login, Logout, AccessTime } from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const TimeTracking = () => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [filters, setFilters] = useState({ status: '', date: '' });
    const [todayLog, setTodayLog] = useState(null);
    const [loading, setLoading] = useState(false);

    const isSupervisor = user.role === 'supervisor' || user.role === 'hr';

    const fetchAttendance = async () => {
        try {
            const params = {};
            if (user.role === 'supervisor') params.team = user.team;
            if (user.role === 'employee') params.userId = user.id;
            // For HR, we leave params empty to trigger the global view in the backend
            if (filters.status) params.status = filters.status;
            if (filters.date) params.startDate = filters.date;

            const res = await axios.get('/api/time/attendance', { params });
            setLogs(res.data.logs || []);
            setMetrics(res.data.metrics);

            // For employees, check if they've checked in today
            if (!isSupervisor) {
                const today = new Date().toISOString().split('T')[0];
                const todayCheckIn = res.data.logs.find(l => l.date === today && l.userId === user.id);
                setTodayLog(todayCheckIn);
            }
        } catch (err) {
            console.error("Attendance Fetch Error:", err);
        }
    };

    useEffect(() => {
        if (user) fetchAttendance();
    }, [user, filters]);

    const handleCheckIn = async () => {
        setLoading(true);
        try {
            await axios.post('/api/time/log-time', {
                userId: user.id,
                type: 'check-in'
            });
            fetchAttendance();
        } catch (err) {
            console.error('Check-in error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            await axios.post('/api/time/log-time', {
                userId: user.id,
                type: 'check-out'
            });
            fetchAttendance();
        } catch (err) {
            console.error('Check-out error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        try {
            await axios.post('/api/time/seed-time', { team: user.team || 'IT' });
            fetchAttendance();
        } catch (err) { console.error(err); }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={4}>
                <Typography variant="h4" fontWeight="900">
                    Time & <Box component="span" color="primary.main">Attendance</Box>
                </Typography>
                {isSupervisor && (
                    <Button startIcon={<Refresh />} onClick={handleSeed} variant="outlined">
                        Seed Sample Data
                    </Button>
                )}
            </Box>

            {/* EMPLOYEE VIEW: Check-In/Out Card */}
            {!isSupervisor && (
                <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #ffcc00 0%, #000 100%)', color: 'white' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Grid container spacing={3} alignItems="center">
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box display="flex" alignItems="center" gap={2} mb={2}>
                                    <AccessTime sx={{ fontSize: 40 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {new Date().toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Typography>
                                        <Typography variant="h3" fontWeight="900">
                                            {new Date().toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Typography>
                                    </Box>
                                </Box>
                                {todayLog && (
                                    <Alert severity={todayLog.status === 'late' ? 'warning' : 'success'} sx={{ mt: 2 }}>
                                        Checked in at {todayLog.checkInTime} - Status: {todayLog.status.toUpperCase()}
                                    </Alert>
                                )}
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box display="flex" gap={2} justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<Login />}
                                        onClick={handleCheckIn}
                                        disabled={loading || todayLog}
                                        sx={{
                                            bgcolor: 'white',
                                            color: 'black',
                                            fontWeight: 'bold',
                                            px: 4,
                                            '&:hover': { bgcolor: '#f0f0f0' }
                                        }}
                                    >
                                        {todayLog ? 'Already Checked In' : 'Check In'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<Logout />}
                                        onClick={handleCheckOut}
                                        disabled={loading || !todayLog}
                                        sx={{
                                            borderColor: 'white',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            px: 4,
                                            '&:hover': { borderColor: '#f0f0f0', bgcolor: 'rgba(255,255,255,0.1)' }
                                        }}
                                    >
                                        Check Out
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* SUPERVISOR VIEW: Metrics */}
            {isSupervisor && metrics && (
                <Grid container spacing={3} mb={4}>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper sx={{ p: 3, borderBottom: '4px solid #4caf50' }}>
                            <Typography variant="h6">Present</Typography>
                            <Typography variant="h3" fontWeight="900">{metrics.present}%</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper sx={{ p: 3, borderBottom: '4px solid #ffcc00' }}>
                            <Typography variant="h6">Late</Typography>
                            <Typography variant="h3" fontWeight="900">{metrics.late}%</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper sx={{ p: 3, borderBottom: '4px solid #f44336' }}>
                            <Typography variant="h6">Absent</Typography>
                            <Typography variant="h3" fontWeight="900">{metrics.absent}%</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper sx={{ p: 3, borderBottom: '4px solid #000' }}>
                            <Typography variant="h6">Overtime (Month)</Typography>
                            <Typography variant="h3" fontWeight="900">{metrics.totalOvertime}h</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* My Attendance History (Employee) or Team View (Supervisor) */}
            <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="bold">
                        {isSupervisor ? 'Team Attendance' : 'My Attendance History'}
                    </Typography>
                    {isSupervisor && (
                        <Box display="flex" gap={2}>
                            <TextField
                                type="date"
                                label="Filter Date"
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={filters.status}
                                    label="Status"
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="present">Present</MenuItem>
                                    <MenuItem value="late">Late</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                {isSupervisor && <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>}
                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Check In</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>First Activity</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Start Gap</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Check Out</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Hours</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((log, index) => (
                                <TableRow key={index} hover>
                                    {isSupervisor && <TableCell>{log.user}</TableCell>}
                                    <TableCell>{log.date}</TableCell>
                                    <TableCell>{log.checkInTime || '--'}</TableCell>
                                    <TableCell>{log.firstActivity || '--'}</TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            color={log.startGap && parseInt(log.startGap) > 60 ? 'error.main' : 'textSecondary'}
                                            fontWeight={log.startGap && parseInt(log.startGap) > 60 ? 'bold' : 'normal'}
                                        >
                                            {log.startGap}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{log.checkOutTime || '--'}</TableCell>
                                    <TableCell>{log.hours}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.status.toUpperCase()}
                                            color={log.status === 'present' ? 'success' : log.status === 'late' ? 'warning' : 'error'}
                                            size="small"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={isSupervisor ? 6 : 5} align="center">
                                        <Typography color="textSecondary" py={4}>
                                            No attendance records found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default TimeTracking;
