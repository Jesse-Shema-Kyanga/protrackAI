import { useState, useEffect, useContext } from 'react';
import {
    Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
    Select, MenuItem, FormControl, InputLabel, CircularProgress, IconButton, Grid, Divider
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import PeopleAlt from '@mui/icons-material/PeopleAlt';
import Business from '@mui/icons-material/Business';
import Groups from '@mui/icons-material/Groups';
import PersonOff from '@mui/icons-material/PersonOff';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
    <Paper elevation={0} sx={{
        p: 3, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        borderLeft: `5px solid ${color}`,
        display: 'flex', alignItems: 'center', gap: 2,
        transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 }
    }}>
        <Box sx={{ bgcolor: `${color}20`, borderRadius: 2, p: 1.5, color }}>
            {icon}
        </Box>
        <Box>
            <Typography variant="h4" fontWeight="900">{value}</Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>{label}</Typography>
        </Box>
    </Paper>
);

// ── Role Chip ──────────────────────────────────────────────────────────────────
const RoleChip = ({ role }) => {
    const map = {
        admin:      { color: 'error',   label: 'ADMIN' },
        hr:         { color: 'primary', label: 'HR' },
        supervisor: { color: 'secondary', label: 'SUPERVISOR' },
        employee:   { color: 'success', label: 'EMPLOYEE' },
    };
    const { color, label } = map[role] || { color: 'default', label: role?.toUpperCase() };
    return <Chip label={label} size="small" color={color} sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} />;
};

// ── Main Component ──────────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [orgs, setOrgs]   = useState([]);
    const [loading, setLoading] = useState(true);

    const [openEdit, setOpenEdit] = useState(false);
    const [editData, setEditData] = useState({ userId: '', userName: '', dept: '', team: '', role: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, orgsRes] = await Promise.all([
                axios.get('/api/users'),
                axios.get('/api/org'),
            ]);
            setUsers(usersRes.data);
            setOrgs(orgsRes.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load system records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/'); return; }
        fetchData();
    }, [user, navigate]);

    // ── Stats ───────────────────────────────────────────────────────────────────
    const totalUsers      = users.length;
    const totalDepts      = orgs.length;
    const totalTeams      = orgs.reduce((acc, o) => acc + (o.teams?.length || 0), 0);
    const pendingAssign   = users.filter(u => !u.dept && u.role !== 'admin').length;

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleOpenEdit = (u) => {
        setEditData({ userId: u.id, userName: u.name, dept: u.dept || '', team: u.team || '', role: u.role || 'employee' });
        setOpenEdit(true);
    };

    const handleUpdateUser = async () => {
        try {
            await axios.put(`/api/users/${editData.userId}`, { role: editData.role });
            await axios.patch(`/api/org/users/${editData.userId}/reassign`, {
                dept: editData.dept,
                team: editData.team,
            });
            setOpenEdit(false);
            fetchData();
            toast.success(`${editData.userName} updated successfully`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Update failed');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Permanently remove ${userName} from the system?`)) return;
        try {
            await axios.delete(`/api/users/${userId}`);
            fetchData();
            toast.warn(`${userName} has been removed`);
        } catch (err) {
            toast.error('Deletion failed');
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 4 } }}>

            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <Box mb={4}>
                <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1px' }}>
                    System{' '}
                    <Box component="span" sx={{ color: 'error.main' }}>Administration</Box>
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Identity & Access Governance — Centralized User Provisioning Console
                </Typography>
            </Box>

            {/* ── Stats Row ─────────────────────────────────────────────────────── */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<PeopleAlt />} label="Provisioned Users" value={totalUsers} color="#1976d2" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<Business />} label="Active Departments" value={totalDepts} color="#388e3c" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<Groups />} label="Functional Teams" value={totalTeams} color="#7b1fa2" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<PersonOff />} label="Unprovisioned Accounts" value={pendingAssign} color="#f57c00" />
                </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* ── Identity Table ────────────────────────────────────────────────── */}
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight="bold">Identity Registry</Typography>
                    <Typography variant="caption" color="text.secondary">Assign roles, departments, and teams. Delete stale accounts.</Typography>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No users found in the system.
                                </TableCell>
                            </TableRow>
                        )}
                        {users.map((u) => (
                            <TableRow key={u.id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{u.email}</TableCell>
                                <TableCell>
                                    {u.role === 'admin'
                                        ? <Chip label="—" size="small" variant="outlined" sx={{ color: 'text.disabled' }} />
                                        : u.dept
                                            ? <Chip label={u.dept} size="small" variant="outlined" />
                                            : <Chip label="UNASSIGNED" size="small" color="warning" variant="outlined" />}
                                </TableCell>
                                <TableCell>
                                    {u.role === 'admin'
                                        ? <Chip label="—" size="small" variant="outlined" sx={{ color: 'text.disabled' }} />
                                        : u.team
                                            ? <Chip label={u.team} size="small" />
                                            : <Chip label="—" size="small" variant="outlined" sx={{ color: 'text.disabled' }} />}
                                </TableCell>
                                <TableCell><RoleChip role={u.role} /></TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(u)} title="Edit user">
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id, u.name)} title="Delete user">
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Edit / Assign Dialog ───────────────────────────────────────────── */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    Edit — {editData.userName}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>

                    {/* Role */}
                    <FormControl fullWidth variant="filled">
                        <InputLabel>Role</InputLabel>
                        <Select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                            <MenuItem value="employee">Employee</MenuItem>
                            <MenuItem value="supervisor">Supervisor</MenuItem>
                            <MenuItem value="hr">HR Manager</MenuItem>
                            <MenuItem value="admin">System Administrator</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Department */}
                    <FormControl fullWidth variant="filled">
                        <InputLabel>Department</InputLabel>
                        <Select
                            value={editData.dept}
                            onChange={(e) => setEditData({ ...editData, dept: e.target.value, team: '' })}
                        >
                            <MenuItem value=""><em>None (Unassigned)</em></MenuItem>
                            {orgs.map(o => <MenuItem key={o._id} value={o.name}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {/* Team — only shown when dept is selected */}
                    {editData.dept && (
                        <FormControl fullWidth variant="filled">
                            <InputLabel>Team</InputLabel>
                            <Select
                                value={editData.team}
                                onChange={(e) => setEditData({ ...editData, team: e.target.value })}
                            >
                                <MenuItem value=""><em>None (Unassigned)</em></MenuItem>
                                {orgs.find(o => o.name === editData.dept)?.teams.map(t => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateUser} sx={{ fontWeight: 'bold' }}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminDashboard;
