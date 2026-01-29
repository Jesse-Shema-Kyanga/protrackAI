import { useState, useEffect, useContext, useRef } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { Add, Refresh, CalendarMonth, Delete } from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Goals = () => {
    const { user } = useContext(AuthContext);
    const [goals, setGoals] = useState([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, atRisk: 0 });
    const [open, setOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '', due: '', assignedTo: '' });
    const [filterStatus, setFilterStatus] = useState('');

    const fetchGoals = async () => {
        if (!user?.id) return;
        try {
            const res = await axios.get(`/api/goals`, {
                params: {
                    userId: user.id,
                    role: user.role
                }
            });
            const data = res.data || [];
            if (filterStatus) {
                setGoals(data.filter(g => {
                    const progress = g.progress || 0;
                    if (filterStatus === 'completed') return progress >= 100;
                    if (filterStatus === 'at-risk') return progress < 50;
                    return true;
                }));
            } else {
                setGoals(data);
            }

            let completed = 0, atRisk = 0;
            data.forEach(g => {
                if (g.progress >= 100) completed++;
                else if (g.progress < 50) atRisk++;
            });
            setStats({ total: data.length, completed, atRisk });

        } catch (err) {
            console.error("Goals Fetch Error:", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`/api/users?role=employee`);
            setEmployees(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (user) {
            fetchGoals();
            if (user.role === 'supervisor') fetchEmployees();
        }
    }, [user, filterStatus]);

    const handleCreate = async () => {
        try {
            await axios.post(`/api/goals`, {
                userId: user.id,
                title: newGoal.title,
                description: newGoal.description,
                target: newGoal.target,
                dueDate: newGoal.due,
                assignedTo: newGoal.assignedTo || user.id,
                progress: 0
            }, { params: { userId: user.id } });
            setOpen(false);
            fetchGoals();
            setNewGoal({ title: '', description: '', target: '', due: '', assignedTo: '' });
        } catch (err) {
            console.error("Goal creation error:", err);
        }
    };

    // Use String for input to allow clearing, but convert to number on save
    const [progressInput, setProgressInput] = useState("");
    const [updateOpen, setUpdateOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);

    const handleUpdateProgress = async () => {
        try {
            const val = parseInt(progressInput, 10);
            const validProgress = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));

            // Determine Status based on Thresholds
            let status = 'active'; // Default ON TRACK
            if (validProgress >= 100) status = 'done'; // HIT
            else if (validProgress >= 80) status = 'near-completion';
            else if (validProgress < 40) status = 'at-risk';

            await axios.put(`/api/goals/${selectedGoal._id}`, {
                progress: validProgress,
                status: status
            }, {
                params: { userId: user.id } // Ensure userId is sent for permission check
            });

            setUpdateOpen(false);
            fetchGoals();
        } catch (err) {
            console.error("Update error:", err);
            alert("Failed to update goal. Please try again.");
        }
    };

    const openUpdateDialog = (goal) => {
        setSelectedGoal(goal);
        setProgressInput(goal.progress?.toString() || "0"); // Initialize as string
        setUpdateOpen(true);
    };

    const getStatusChip = (progress) => {
        if (progress >= 100) return <Chip label="HIT" color="success" size="small" sx={{ fontWeight: '900' }} />;
        if (progress >= 80) return <Chip label="NEAR COMPLETION" color="secondary" size="small" sx={{ fontWeight: '900', bgcolor: '#9c27b0', color: 'white' }} />;
        if (progress >= 40) return <Chip label="ON TRACK" color="primary" size="small" sx={{ fontWeight: '900' }} />;
        return <Chip label="AT RISK" color="error" size="small" sx={{ fontWeight: '900' }} />;
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this goal?')) {
            try {
                await axios.delete(`/api/goals/${id}`);
                setGoals(goals.filter(g => g._id !== id));
            } catch (err) {
                console.error("Delete error:", err);
                alert("Failed to delete goal: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const dateInputRef = useRef(null);

    return (
        <Box>
            {/* Header ... */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1.5px' }}>
                    Critical <Box component="span" color="primary.main">Objectives</Box>
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setOpen(true)}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        {user.role === 'employee' ? 'New Personal Objective' : 'Set Strategic Objective'}
                    </Button>
                </Box>
            </Box>

            {/* Stats logic needs update to match new thresholds if displayed... keeping simple for now */}

            {/* Table */}
            <Paper sx={{ p: 4, borderRadius: 3, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Typography variant="h6" fontWeight="bold">Key Results & Benchmarks</Typography>
                    <FormControl size="small" sx={{ width: 220 }}>
                        <Select value={filterStatus} displayEmpty onChange={(e) => setFilterStatus(e.target.value)} sx={{ borderRadius: 2 }}>
                            <MenuItem value="">View All Statuses</MenuItem>
                            <MenuItem value="completed">Completed Hits</MenuItem>
                            <MenuItem value="at-risk">Attention Required</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Strategic Objective</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{user.role === 'employee' ? 'Context' : 'Accountable'}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Target Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: 300 }}>Status Progress</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {goals.map((g) => (
                                <TableRow key={g._id} hover sx={{ transition: '0.2s' }}>
                                    {/* ... other cells ... */}
                                    <TableCell>
                                        <Typography variant="body1" fontWeight="700">{g.title}</Typography>
                                        <Typography variant="caption" color="textSecondary">{g.description}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {user.role === 'employee' ? (
                                            g.assignedTo === user.id ? (
                                                <Chip label="PERSONAL" size="small" sx={{ bgcolor: 'rgba(255, 204, 0, 0.1)', color: '#ffcc00', border: '1px solid #ffcc00', fontWeight: '900', borderRadius: 1 }} />
                                            ) : (
                                                <Chip label="ASSIGNED" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid #4caf50', fontWeight: '900', borderRadius: 1 }} />
                                            )
                                        ) : (
                                            g.assignedName || g.assignedTo
                                        )}
                                    </TableCell>
                                    <TableCell>{new Date(g.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell sx={{ minWidth: 250 }}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box width="100%">
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(g.progress || 0, 100)}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 5,
                                                        bgcolor: '#eee',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: g.progress >= 100 ? '#4caf50' : g.progress >= 80 ? '#9c27b0' : g.progress >= 40 ? '#1976d2' : '#f44336'
                                                        }
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="body2" fontWeight="900">{`${Math.round(g.progress || 0)}%`}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" flexDirection="row" gap={2} alignItems="center" justifyContent="center">
                                            {getStatusChip(g.progress || 0)}

                                            <Box display="flex" gap={1}>
                                                {/* Assignee OR Supervisor can update progress */}
                                                {(g.assignedTo === user.id || user.role === 'supervisor') && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.65rem', py: 0, minWidth: '50px' }}
                                                        onClick={() => openUpdateDialog(g)}
                                                    >
                                                        Update
                                                    </Button>
                                                )}

                                                {/* Delete Button */}
                                                {(g.assignedTo === user.id || user.role === 'supervisor') && (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(g._id)}
                                                        sx={{ p: 0.5, border: '1px solid rgba(244, 67, 54, 0.5)', borderRadius: 1 }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>

                                </TableRow>
                            ))}
                            {/* ... empty row ... */}
                        </TableBody>
                    </Table >
                </TableContainer >
            </Paper >

            {/* Create Goal Dialog */}
            < Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth >
                <DialogTitle sx={{ fontWeight: '900', bgcolor: 'action.hover' }}>
                    {user.role === 'employee' ? 'New Personal Objective' : 'Assign Strategic Objective'}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Goal Title"
                        fullWidth
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Objective Description"
                        placeholder="e.g. Improve overall work efficiency"
                        fullWidth
                        multiline
                        rows={2}
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Quantifiable Target (KRA)"
                        placeholder="e.g. 85% productivity rate"
                        fullWidth
                        value={newGoal.target}
                        onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
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
                        value={newGoal.due}
                        onChange={(e) => setNewGoal({ ...newGoal, due: e.target.value })}
                    />
                    {user.role === 'supervisor' && (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Assign To</InputLabel>
                            <Select
                                value={newGoal.assignedTo}
                                label="Assign To"
                                onChange={(e) => setNewGoal({ ...newGoal, assignedTo: e.target.value })}
                            >
                                <MenuItem value={user.id}><em>Myself (Personal)</em></MenuItem>
                                {employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'action.hover' }}>
                    <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2 }}>Discard</Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        color="primary"
                        sx={{ borderRadius: 2, px: 4, fontWeight: 'bold' }}
                    >
                        {user.role === 'employee' ? 'Set Objective' : 'Assign Objective'}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Update Progress Dialog */}
            < Dialog open={updateOpen} onClose={() => setUpdateOpen(false)} maxWidth="xs" fullWidth >
                <DialogTitle sx={{ fontWeight: 'bold' }}>Update Progress</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
                        Self-report your progress towards: <strong>{selectedGoal?.title}</strong>
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} sx={{ mt: 3 }}>
                        <TextField
                            type="number"
                            label="Percentage (%)"
                            value={progressInput}
                            onChange={(e) => setProgressInput(e.target.value)}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0, max: 100 }}
                        />
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Math.max(0, parseInt(progressInput || 0, 10)))}
                            sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUpdateOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateProgress} variant="contained" color="primary">Update</Button>
                </DialogActions>
            </Dialog >
        </Box >
    );
};

export default Goals;
