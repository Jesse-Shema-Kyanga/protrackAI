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
    InputAdornment,
    LinearProgress,
    Tooltip
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
        reason: '',
        proofDocument: null
    });

    const today = new Date().toISOString().split('T')[0];

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
        if (!newRequest.startDate || !newRequest.endDate) {
            toast.error('Please select both start and end dates.');
            return;
        }
        if (newRequest.startDate < today) {
            toast.error('Leave start date cannot be in the past.');
            return;
        }
        if (newRequest.endDate < newRequest.startDate) {
            toast.error('End date cannot be before start date.');
            return;
        }

        const proofRequiredTypes = ['sick', 'bereavement', 'jury_duty', 'maternity', 'study', 'emergency'];
        if (proofRequiredTypes.includes(newRequest.type) && !newRequest.proofDocument) {
            toast.error('This leave type requires an official proof document. Please upload one.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('type', newRequest.type);
            formData.append('startDate', newRequest.startDate);
            formData.append('endDate', newRequest.endDate);
            formData.append('reason', newRequest.reason);
            if (newRequest.proofDocument) {
                formData.append('proofDocument', newRequest.proofDocument);
            }

            await axios.post('/api/leave', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setOpen(false);
            fetchLeaves();
            setNewRequest({ type: 'vacation', startDate: '', endDate: '', reason: '', proofDocument: null });
            toast.success('Leave request submitted professionally.');
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Submission failed.';
            toast.error(`Error: ${msg}`);
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

    const calculateWorkDays = (start, end) => {
        if (!start || !end) return 0;
        let count = 0;
        let currentDate = new Date(start);
        const endDateObj = new Date(end);
        
        while (currentDate <= endDateObj) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return count;
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

            {/* ─── Leave Balance (Employee only) ─────────────────────────── */}
            {!isSupervisor && (() => {
                const ANNUAL_DAYS = 18;
                const thisYear = new Date().getFullYear();
                const approvedThisYear = leaves.filter(l =>
                    l.status === 'approved' && new Date(l.startDate).getFullYear() === thisYear
                );
                const daysUsed = approvedThisYear.reduce((sum, l) => sum + calculateWorkDays(l.startDate, l.endDate), 0);
                const daysLeft = Math.max(0, ANNUAL_DAYS - daysUsed);
                const pct      = Math.min(100, Math.round((daysUsed / ANNUAL_DAYS) * 100));
                const barColor = daysLeft > 9 ? 'success' : daysLeft > 4 ? 'warning' : 'error';

                // Build full-year leave history (Show only approved days)
                const yearStart = new Date(thisYear, 0, 1);
                const recentLeaves = leaves.filter(l => 
                    new Date(l.startDate) >= yearStart && 
                    l.status === 'approved'
                );

                return (
                    <Grid container spacing={3} mb={4}>
                        {/* Balance Card */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{ p: 3, borderRadius: 3, borderTop: '5px solid', borderColor: barColor + '.main', height: '100%' }}>
                                <Typography variant="overline" fontWeight="bold" color="textSecondary">Annual Leave Balance</Typography>
                                <Box display="flex" alignItems="baseline" gap={1} mt={1} mb={2}>
                                    <Typography variant="h2" fontWeight="900" color={barColor + '.main'}>{daysLeft}</Typography>
                                    <Typography variant="body1" color="textSecondary">days remaining</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    color={barColor}
                                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                                />
                                <Typography variant="caption" color="textSecondary">{daysUsed} work days used in {thisYear}</Typography>
                            </Paper>
                        </Grid>

                        {/* History Strip */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                                <Typography variant="overline" fontWeight="bold" color="textSecondary" mb={2} display="block">Leave History — {thisYear}</Typography>
                                {recentLeaves.length === 0 ? (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" color="textSecondary">No leave taken in {thisYear} yet.</Typography>
                                    </Box>
                                ) : (
                                    <Box display="flex" flexDirection="column" gap={1.5}>
                                        {recentLeaves.slice().reverse().map((l, i) => {
                                            const wd = calculateWorkDays(l.startDate, l.endDate);
                                            const chipColor = l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'error' : 'warning';
                                            return (
                                                <Box key={i} display="flex" alignItems="center" gap={2} sx={{
                                                    p: 1.5, borderRadius: 2, bgcolor: 'action.hover',
                                                    borderLeft: '4px solid',
                                                    borderColor: l.status === 'approved' ? 'success.main' : l.status === 'rejected' ? 'error.main' : 'warning.main'
                                                }}>
                                                    <Box flex={1}>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {l.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {new Date(l.startDate).toLocaleDateString('en-GB')} → {new Date(l.endDate).toLocaleDateString('en-GB')} &nbsp;·&nbsp; {wd} work day{wd !== 1 ? 's' : ''}
                                                        </Typography>
                                                    </Box>
                                                    <Chip size="small" label={l.status.toUpperCase()} color={chipColor} sx={{ fontWeight: 'bold' }} />
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                );
            })()}

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
                                        <TableCell sx={{ fontWeight: 'bold' }}>Proof</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        {isSupervisor && <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {leaves.map((l) => (
                                        <TableRow key={l._id}>
                                            <TableCell>
                                                <Chip
                                                    label={l.type.toUpperCase().replace('_', ' ')}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'black' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                                <Typography variant="caption" display="block" color="textSecondary" fontWeight="bold">
                                                    Duration: {calculateWorkDays(l.startDate, l.endDate)} Work Days
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{l.reason || '--'}</TableCell>
                                            <TableCell>
                                                {l.proofDocument ? (
                                                    <Button size="small" variant="outlined" href={`${import.meta.env.VITE_API_URL || ''}${l.proofDocument}`} target="_blank">
                                                        View Note
                                                    </Button>
                                                ) : '--'}
                                            </TableCell>
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
                                            <TableCell colSpan={isSupervisor ? 6 : 5} align="center" sx={{ py: 6 }}>
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
                            <MenuItem value="bereavement">Bereavement</MenuItem>
                            <MenuItem value="jury_duty">Jury Duty</MenuItem>
                            <MenuItem value="maternity">Maternity/Paternity</MenuItem>
                            <MenuItem value="study">Study/Exam Leave</MenuItem>
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
                                inputProps={{ min: today }}
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
                                inputProps={{ min: newRequest.startDate || today }}
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
                    {['sick', 'bereavement', 'jury_duty', 'maternity', 'study', 'emergency'].includes(newRequest.type) && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="body2" color="textSecondary" mb={1}>
                                Upload Official Proof (Required for this leave type)
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                            >
                                {newRequest.proofDocument ? newRequest.proofDocument.name : "Choose File"}
                                <input
                                    type="file"
                                    hidden
                                    onChange={(e) => setNewRequest({ ...newRequest, proofDocument: e.target.files[0] })}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </Button>
                        </Box>
                    )}
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
