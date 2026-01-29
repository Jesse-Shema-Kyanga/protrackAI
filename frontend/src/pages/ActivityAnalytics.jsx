import { useState, useEffect, useContext } from 'react';
import { Box, Paper, Typography, Grid, CircularProgress, List, ListItem, ListItemText, Chip, Button, useTheme, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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

    useEffect(() => {
        if (user.role === 'supervisor') {
            const fetchEmployees = async () => {
                const res = await axios.get(`/api/users?role=employee`);
                setEmployees(res.data);
                // If we have employees, maybe select the first one by default if we haven't selected any
                if (res.data.length > 0 && selectedUserId === user.id) {
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
                const res = await axios.get(`/api/reports?userId=${selectedUserId}&period=week`);
                setData(res.data);
            } catch (err) {
                console.error("Analytics Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedUserId]);

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
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed.y || 0;
                        const totalActiveMins = hours.reduce((a, b) => a + b, 0);
                        const percentage = totalActiveMins > 0 ? Math.round((value / totalActiveMins) * 100) : 0;
                        return `${value.toFixed(1)}m (${percentage}% of total day)`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Minutes' }
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
                title: { display: true, text: 'Percentage' }
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
                                    <MenuItem value={user.id}><em>My Own Stats</em></MenuItem>
                                    {employees.map(emp => (
                                        <MenuItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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
                                        const response = await axios.get(`/api/reports/team-pdf?period=month`, {
                                            responseType: 'blob'
                                        });
                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', `Team_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
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
                                    const response = await axios.get(`/api/reports/pdf?userId=${selectedUserId}&period=month`, {
                                        responseType: 'blob'
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `ProTrack_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
                                    const exportLogs = data.recentActivities.map(l => ({
                                        App: l.appName || l.url,
                                        Class: l.classified,
                                        DurationSeconds: l.duration,
                                        Time: new Date(l.timestamp).toLocaleString()
                                    }));
                                    downloadCSV(exportLogs, 'my_activity_logs.csv');
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
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Activity Distribution (24h)</Typography>
                            <Box sx={{ height: 250 }}>
                                <Bar data={barData} options={barOptions} />
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Top Tools Used (% Effort)</Typography>
                            <Box sx={{ height: 250 }}>
                                <Bar data={hBarData} options={hBarOptions} />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6">Breakdown</Typography>
                    <Box sx={{ height: 300, position: 'relative' }}>
                        <Doughnut data={pieData} options={chartOptions} />
                        <Box sx={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -10%)',
                            textAlign: 'center', pointerEvents: 'none'
                        }}>
                            <Typography variant="h4" fontWeight="900" sx={{ color: '#4caf50' }}>
                                {prodSec + nonProdSec + neutralSec > 0 ? Math.round((prodSec / (prodSec + nonProdSec + neutralSec)) * 100) : 0}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
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
