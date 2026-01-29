import { useState, useEffect, useContext, useRef } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    Grid, Select, FormControl, InputLabel, InputAdornment
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { Add, Delete, CheckCircle, Refresh, CalendarMonth } from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const Tasks = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [metrics, setMetrics] = useState({ onTrack: 0, overdue: 0 });
    const [open, setOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [newTask, setNewTask] = useState({ title: '', due: '' });

    const [employees, setEmployees] = useState([]);

    const fetchTasks = async () => {
        if (!user?.id) return;
        try {
            let query = `/api/tasks?`;
            // Supervisors need to see their team's tasks or tasks they assigned
            if (user.role === 'employee') query += `userId=${user.id}`;
            else if (user.role === 'supervisor') query += `supId=${user.id}&team=${encodeURIComponent(user.team)}`;

            if (filterStatus) query += `&status=${filterStatus}`;

            const res = await axios.get(query);
            const taskData = Array.isArray(res.data) ? res.data : res.data.tasks;
            const metricsData = res.data.metrics || { onTrack: 0, overdue: 0 };

            setTasks(taskData || []);
            setMetrics(metricsData);
        } catch (err) {
            console.error("Task fetch error:", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`/api/users?role=employee`);
            setEmployees(res.data);
        } catch (err) {
            console.error("Employee fetch error:", err);
        }
    };

    useEffect(() => {
        fetchTasks();
        if (user?.role === 'supervisor') fetchEmployees();
    }, [user, filterStatus]);

    const handleCreate = async () => {
        try {
            await axios.post('/api/tasks', {
                assignedTo: newTask.assignedTo || user.id, // Use selected ID or self
                title: newTask.title,
                due: newTask.due,
                status: 'pending',
                progress: 0
            });
            setOpen(false);
            fetchTasks();
            setNewTask({ title: '', due: '', assignedTo: '' });
        } catch (err) {
            console.error("Task creation error:", err);
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.put(`/api/tasks/${id}`, { completed: true, status: 'done', progress: 100 });
            fetchTasks();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete task?')) return;
        try {
            await axios.delete(`/api/tasks/${id}`);
            fetchTasks();
        } catch (err) { console.error(err); }
    };

    // removed handleSeed

    // Use metrics from backend or calculate locally for immediate responsiveness
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.completed).length;
    const overdueTasks = tasks.filter(t => new Date(t.due) < new Date() && !t.completed).length;
    const onTrack = totalTasks - doneTasks - overdueTasks;

    const chartData = {
        labels: ['Done', 'On Track', 'Overdue'],
        datasets: [{
            data: [doneTasks, onTrack, overdueTasks],
            backgroundColor: ['#4caf50', '#2196f3', '#f44336'],
            borderWidth: 0,
        }]
    };

    const dateInputRef = useRef(null);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1.5px' }}>
                    Task <Box component="span" color="primary.main">Management</Box>
                </Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setOpen(true)}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Add Task
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={4} mb={6}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, minHeight: 400 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                            <Typography variant="h6" fontWeight="bold">Active Project Tasks</Typography>
                            <FormControl size="small" sx={{ width: 160 }}>
                                <Select
                                    value={filterStatus}
                                    displayEmpty
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="">All Statuses</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="done">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Objective</TableCell>
                                        {user.role === 'supervisor' && <TableCell sx={{ fontWeight: 'bold' }}>Assigned To</TableCell>}
                                        <TableCell sx={{ fontWeight: 'bold' }}>Deadline</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task._id} hover>
                                            <TableCell sx={{ fontWeight: '500' }}>{task.title}</TableCell>
                                            {user.role === 'supervisor' && <TableCell>{task.userName}</TableCell>}
                                            <TableCell>{new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={task.status.toUpperCase()}
                                                    color={task.status === 'done' ? 'success' : 'warning'}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {(task.userId === user.id || task.assignedBy === user.id) && (
                                                    <>
                                                        <IconButton color="success" onClick={() => handleToggle(task._id)} size="small">
                                                            <CheckCircle />
                                                        </IconButton>
                                                        <IconButton color="error" onClick={() => handleDelete(task._id)} size="small">
                                                            <Delete />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {tasks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                                                <Typography color="textSecondary">No tasks found for your profile.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 4, borderRadius: 3, borderTop: '6px solid #ffcc00' }}>
                        <Typography variant="h6" fontWeight="900" gutterBottom>Success Metrics</Typography>
                        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', maxWidth: 220, mb: 4 }}>
                                <Pie data={chartData} options={{ maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }} />
                            </Box>
                            <Box sx={{ width: '100%', mt: 2 }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="textSecondary">Done</Typography>
                                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#4caf50' }}>{doneTasks}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="textSecondary">On Track (Active)</Typography>
                                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#2196f3' }}>{onTrack}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="textSecondary">Overdue</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="error.main">{overdueTasks}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mt={2} pt={2} borderTop="1px solid #eee">
                                    <Typography variant="subtitle2" fontWeight="900">Total Pipeline</Typography>
                                    <Typography variant="subtitle2" fontWeight="900">{totalTasks}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Task Title"
                        fullWidth
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Due Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputRef={dateInputRef}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconButton
                                        size="small"
                                        onClick={() => dateInputRef.current?.showPicker()}
                                        sx={{ p: 0 }}
                                    >
                                        <CalendarMonth fontSize="small" color="primary" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        value={newTask.due}
                        onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                    />
                    {user?.role === 'supervisor' && (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Assign To</InputLabel>
                            <Select
                                value={newTask.assignedTo || ''}
                                label="Assign To"
                                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            >
                                <MenuItem value={user.id}><em>Myself</em></MenuItem>
                                {employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default Tasks;
