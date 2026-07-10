import { useState, useEffect, useContext } from 'react';
import { Box, Paper, Typography, Grid, CircularProgress, List, ListItem, ListItemText, Chip, Button, useTheme, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Download, PictureAsPdf } from '@mui/icons-material';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import useExport from '../hooks/useExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ActivityAnalytics = () => {
    const { user } = useContext(AuthContext);
    const theme = useTheme();
    const mode = theme.palette.mode;
    const { downloadCSV } = useExport();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(user.id);
    const [period, setPeriod] = useState('month');
    const [reportType, setReportType] = useState('all');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (user.role === 'supervisor') {
            const fetchEmployees = async () => {
                const res = await axios.get(`/api/users?role=employee`);
                setEmployees(res.data);
                if (res.data.length > 0) {
                    setSelectedUserId(res.data[0].id);
                }
            };
            fetchEmployees();
        }
    }, [user]);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                // Fetch report for selected user
                const params = { userId: selectedUserId, period };
                if (period === 'custom' && startDate && endDate) {
                    params.start = startDate;
                    params.end = endDate;
                }
                const res = await axios.get(`/api/reports`, { params });
                setData(res.data);
            } catch (err) {
                console.error("Analytics Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedUserId, period, startDate, endDate]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;
    if (!data) return <Typography align="center" variant="h6" color="textSecondary" sx={{ py: 10 }}>No analytical data available for this segment.</Typography>;

    // Prepare Chart Data
    const activities = data.recentActivities || [];

    // Bucket by hour (0-23)
    const hours = Array(24).fill(0);
    activities.forEach(act => {
        const hour = new Date(act.timestamp).getHours();
        hours[hour] += act.duration / 60; // Minutes
    });

    const barData = {
        labels: hours.map((_, i) => `${i}:00`),
        datasets: [{
            label: 'Activity (Minutes)',
            data: hours,
            backgroundColor: '#ffcc00', // MTN Yellow
            borderRadius: 4,
        }]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 11 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed.y || 0;
                        const totalActiveMins = hours.reduce((a, b) => a + b, 0);
                        const percentage = totalActiveMins > 0 ? Math.round((value / totalActiveMins) * 100) : 0;
                        return `${Math.round(value)}m (${percentage}% of total day)`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Minutes', font: { weight: 'bold' } },
                grid: { color: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    // Calculate Top Apps for Horizontal Chart (hchart)
    const appUsage = {};
    activities.forEach(act => {
        const name = act.appName || 'Unknown';
        appUsage[name] = (appUsage[name] || 0) + act.duration;
    });

    const sortedApps = Object.entries(appUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const hBarData = {
        labels: sortedApps.map(([name, dur]) => {
            const totalDur = activities.reduce((s, a) => s + a.duration, 0);
            const p = totalDur > 0 ? Math.round((dur / totalDur) * 100) : 0;
            const truncatedName = name.length > 15 ? name.substring(0, 12) + '...' : name;
            return `${truncatedName} (${p}%)`;
        }),
        datasets: [{
            label: 'Effort %',
            data: sortedApps.map(([, dur]) => {
                const totalDur = activities.reduce((s, a) => s + a.duration, 0);
                return totalDur > 0 ? Math.round((dur / totalDur) * 100) : 0;
            }),
            backgroundColor: '#ffcc00', // Changed to MTN Yellow for consistency
            borderRadius: 4,
        }]
    };

    const hBarOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.parsed.x}% of your effort`
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                max: 100,
                title: { display: true, text: 'Percentage', font: { weight: 'bold' } },
                grid: { color: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
            },
            y: {
                grid: { display: false }
            }
        }
    };

    const prodSec = activities.filter(a => a.classified === 'productive').reduce((s, a) => s + a.duration, 0);
    const nonProdSec = activities.filter(a => a.classified === 'non-productive').reduce((s, a) => s + a.duration, 0);
    const neutralSec = activities.filter(a => ['neutral', 'unknown', 'review_required'].includes(a.classified)).reduce((s, a) => s + a.duration, 0);

    const pieData = {
        labels: ['Productive', 'Non-Productive', 'Neutral'],
        datasets: [{
            data: [prodSec, nonProdSec, neutralSec],
            backgroundColor: [
                '#4caf50', // Green (Productive)
                '#f44336', // Red (Non-Productive)
                '#333333'  // Dark Gray (Neutral) - matches EmployeeDashboard
            ],
            hoverBackgroundColor: ['#e6b800', '#ff0000', '#000000', '#bdbdbd'],
            borderWidth: 2,
            borderColor: mode === 'dark' ? '#0a0c10' : '#ffffff',
        }]
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { weight: 'bold' }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${percentage}% (${Math.round(value / 60)}m)`;
                    }
                }
            }
        },
        cutout: '70%',
        maintainAspectRatio: false
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h4">Activity Analytics</Typography>
                        {user.role === 'supervisor' && (
                            <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
                                <InputLabel>Select Employee</InputLabel>
                                <Select
                                    value={selectedUserId}
                                    label="Select Employee"
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                                >
                                    {employees.map(emp => (
                                        <MenuItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        <FormControl size="small" sx={{ mt: 1, ml: 1, minWidth: 150 }}>
                            <InputLabel>Period</InputLabel>
                            <Select
                                value={period}
                                label="Period"
                                onChange={(e) => setPeriod(e.target.value)}
                                sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                            >
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="week">This Week</MenuItem>
                                <MenuItem value="month">This Month</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                        {user.role === 'supervisor' && (
                            <FormControl size="small" sx={{ mt: 1, ml: 1, minWidth: 150 }}>
                                <InputLabel>Report Type</InputLabel>
                                <Select
                                    value={reportType}
                                    label="Report Type"
                                    onChange={(e) => setReportType(e.target.value)}
                                    sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                                >
                                    <MenuItem value="all">Full Report</MenuItem>
                                    <MenuItem value="attendance">Attendance</MenuItem>
                                    <MenuItem value="productivity">Productivity</MenuItem>
                                    <MenuItem value="violation">Violations (At-Risk)</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                        {period === 'custom' && (
                            <Box display="flex" gap={1} mt={1}>
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
                    <Box display="flex" gap={2}>
                        {user.role === 'supervisor' && (
                            <Button
                                startIcon={<PictureAsPdf />}
                                variant="outlined"
                                color="secondary"
                                onClick={async () => {
                                    try {
                                        let urlParams = `period=${period}&reportType=${reportType}`;
                                        if (period === 'custom' && startDate && endDate) {
                                            urlParams = `period=custom&start=${startDate}&end=${endDate}&reportType=${reportType}`;
                                        }
                                        const response = await axios.get(`/api/reports/team-pdf?${urlParams}`, {
                                            responseType: 'blob'
                                        });
                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const dateStr = new Date().toISOString().split('T')[0];
                                        link.setAttribute('download', `MTN_Team_Audit_${user?.team || 'Report'}_${period}_${dateStr}.pdf`);
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                        window.URL.revokeObjectURL(url);
                                    } catch (err) {
                                        console.error("Team PDF Download Error:", err);
                                        alert("Failed to generate team summary.");
                                    }
                                }}
                            >
                                Team Summary (PDF)
                            </Button>
                        )}
                        <Button
                            startIcon={<PictureAsPdf />}
                            variant="contained"
                            onClick={async () => {
                                try {
                                    let urlParams = `userId=${selectedUserId}&period=${period}&reportType=${reportType}`;
                                    if (period === 'custom' && startDate && endDate) {
                                        urlParams = `userId=${selectedUserId}&period=custom&start=${startDate}&end=${endDate}&reportType=${reportType}`;
                                    }
                                    const response = await axios.get(`/api/reports/pdf?${urlParams}`, {
                                        responseType: 'blob'
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    const dateStr = new Date().toISOString().split('T')[0];
                                    const selectedEmp = employees.find(e => e.id === selectedUserId);
                                    const empName = selectedEmp ? selectedEmp.name.replace(/\s+/g, '_') : selectedUserId;
                                    link.setAttribute('download', `MTN_Audit_${empName}_${period}_${reportType.toUpperCase()}_${dateStr}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                } catch (err) {
                                    console.error("PDF Download Error:", err);
                                    const errorMsg = err.response?.data?.error || err.message || "Unknown error";
                                    alert(`Failed to generate PDF report: ${errorMsg}`);
                                }
                            }}
                        >
                            Download PDF Report
                        </Button>
                        <Button
                            startIcon={<Download />}
                            variant="outlined"
                            onClick={() => {
                                if (data?.recentActivities) {
                                    const dateStr = new Date().toISOString().split('T')[0];
                                    const selectedEmp = employees.find(e => e.id === selectedUserId);
                                    const empName = selectedEmp ? selectedEmp.name.replace(/\s+/g, '_') : (user.name?.replace(/\s+/g, '_') || selectedUserId);
                                    const periodLabel = period === 'custom' ? `${startDate}_to_${endDate}` : period;
                                    const csvFilename = `MTN_Activity_Log_${empName}_${periodLabel}_${dateStr}.csv`;

                                    const formatDur = (secs) => {
                                        if (!secs || secs <= 0) return '0m';
                                        const h = Math.floor(secs / 3600);
                                        const m = Math.floor((secs % 3600) / 60);
                                        return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                                    };

                                    const exportLogs = data.recentActivities.map((l, i) => ({
                                        '#': i + 1,
                                        'Application / URL': l.appName || l.url || 'Unknown',
                                        'Classification': (l.classified || 'Unclassified').replace(/-/g, ' ').toUpperCase(),
                                        'Duration': formatDur(l.duration),
                                        'Duration (s)': l.duration || 0,
                                        'Timestamp': new Date(l.timestamp).toLocaleString('en-GB'),
                                        'Period': periodLabel.toUpperCase(),
                                        'Generated': dateStr
                                    }));
                                    downloadCSV(exportLogs, csvFilename);
                                }
                            }}
                        >
                            Export CSV
                        </Button>
                    </Box>
                </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">Activity Distribution (24h)</Typography>
                            <Box sx={{ height: 250, mt: 'auto' }}>
                                <Bar data={barData} options={barOptions} />
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">Top Tools Used (% Effort)</Typography>
                            <Box sx={{ height: 250, mt: 'auto' }}>
                                <Bar data={hBarData} options={hBarOptions} />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Breakdown</Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 400, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Doughnut data={pieData} options={chartOptions} />
                        <Box sx={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -15%)',
                            textAlign: 'center', pointerEvents: 'none'
                        }}>
                            <Typography variant="h3" fontWeight="900" sx={{ color: '#4caf50' }}>
                                {prodSec + nonProdSec + neutralSec > 0 ? Math.round((prodSec / (prodSec + nonProdSec + neutralSec)) * 100) : 0}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                                PRODUCTIVE
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6">Detailed Log</Typography>
                    <List>
                        {activities.slice(0, 50).map((act, i) => (
                            <ListItem key={i} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                <ListItemText
                                    primary={act.appName || 'Unknown'}
                                    secondary={`${new Date(act.timestamp).toLocaleString()} - ${Math.round(act.duration)}s`}
                                />
                                <Chip
                                    label={act.classified}
                                    color={act.classified === 'productive' ? 'success' : act.classified === 'non-productive' ? 'error' : act.classified === 'unknown' ? 'warning' : 'default'}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default ActivityAnalytics;
