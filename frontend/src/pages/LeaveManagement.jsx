import { useState, useEffect, useContext, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    InputAdornment
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DateRange from '@mui/icons-material/DateRange';
import Add from '@mui/icons-material/Add';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import { toast } from 'react-toastify';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const LeaveManagement = () => {
    const { user } = useContext(AuthContext);
    const [leaves, setLeaves] = useState([]);
    const [open, setOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const startInputRef = useRef(null);
    const endInputRef = useRef(null);

    const isSupervisor = user?.role === 'supervisor' || user?.role === 'hr';

    useEffect(() => {
        fetchLeaves();
    }, [user]);

    const fetchLeaves = async () => {
        try {
            const res = await axios.get('/api/leave', {
                params: isSupervisor ? {} : { userId: user.id }
            });
            setLeaves(res.data);
        } catch (err) {
            console.error('Fetch leaves error:', err);
        }
    };

    const handleSubmit = async () => {
        try {
            await axios.post('/api/leave', newRequest);
            setOpen(false);
            fetchLeaves();
            setNewRequest({ type: 'vacation', startDate: '', endDate: '', reason: '' });
            toast.success('Leave request submitted professionally.');
        } catch (err) {
            toast.error('Submission failed. Please check date constraints.');
        }
    };

    const handleAction = async (id, status) => {
        try {
            await axios.put(`/api/leave/${id}`, { status });
            fetchLeaves();
            toast.info(`Request marked as ${status.toUpperCase()}`);
        } catch (err) {
            toast.error('Update failed. Unauthorized or server error.');
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1.5px' }}>
                    Leave <Box component="span" color="primary.main">Management</Box>
                </Typography>
                {!isSupervisor && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpen(true)}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Request Time Off
                    </Button>
                )}
            </Box>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" mb={4}>
                            {isSupervisor ? 'Team Leave Requests' : 'My Requests History'}
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'action.hover' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Dates</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        {isSupervisor && <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {leaves.map((l) => (
                                        <TableRow key={l._id}>
                                            <TableCell>
                                                <Chip
                                                    label={l.type.toUpperCase()}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'black' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{l.reason || '--'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={l.status.toUpperCase()}
                                                    color={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'error' : 'warning'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            {isSupervisor && l.status === 'pending' && (
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        startIcon={<CheckCircle />}
                                                        color="success"
                                                        onClick={() => handleAction(l._id, 'approved')}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        startIcon={<Cancel />}
                                                        color="error"
                                                        onClick={() => handleAction(l._id, 'rejected')}
                                                        sx={{ ml: 1 }}
                                                    >
                                                        Decline
                                                    </Button>
                                                </TableCell>
                                            )}
                                            {isSupervisor && l.status !== 'pending' && (
                                                <TableCell>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Processed
                                                    </Typography>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {leaves.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isSupervisor ? 5 : 4} align="center" sx={{ py: 6 }}>
                                                No leave records found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Request Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: '900' }}>Request Time Off</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Leave Type</InputLabel>
                        <Select
                            value={newRequest.type}
                            label="Leave Type"
                            onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                        >
                            <MenuItem value="vacation">Vacation</MenuItem>
                            <MenuItem value="sick">Sick Leave</MenuItem>
                            <MenuItem value="emergency">Emergency</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                inputRef={startInputRef}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconButton
                                                size="small"
                                                onClick={() => startInputRef.current?.showPicker()}
                                                sx={{ p: 0 }}
                                            >
                                                <CalendarMonth fontSize="small" color="primary" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                value={newRequest.startDate}
                                onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="End Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                inputRef={endInputRef}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconButton
                                                size="small"
                                                onClick={() => endInputRef.current?.showPicker()}
                                                sx={{ p: 0 }}
                                            >
                                                <CalendarMonth fontSize="small" color="primary" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                value={newRequest.endDate}
                                onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                    <TextField
                        label="Reason for Leave"
                        placeholder="Please provide a brief explanation..."
                        fullWidth
                        multiline
                        rows={3}
                        sx={{ mt: 3 }}
                        value={newRequest.reason}
                        onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} sx={{ borderRadius: 2, px: 4 }}>
                        Submit Request
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveManagement;
