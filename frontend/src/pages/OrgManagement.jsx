import { useState, useEffect, useContext } from 'react';
import {
    Box, Typography, Grid, Paper, Button, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions, IconButton, List,
    ListItem, ListItemText, ListItemSecondaryAction, Divider, CircularProgress, Chip,
    Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Business from '@mui/icons-material/Business';
import Groups from '@mui/icons-material/Groups';
import People from '@mui/icons-material/People';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const OrgManagement = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [orgs, setOrgs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [openDept, setOpenDept] = useState(false);
    const [openTeam, setOpenTeam] = useState(false);
    const [openRename, setOpenRename] = useState(false);
    const [openMove, setOpenMove] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);

    // Form States
    const [newDept, setNewDept] = useState({ name: '', description: '' });
    const [teamData, setTeamData] = useState({ deptName: '', teamName: '', oldName: '', newName: '', toDept: '' });
    const [assignData, setAssignData] = useState({ userId: '', userName: '', dept: '', team: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgRes, userRes] = await Promise.all([
                axios.get('/api/org'),
                axios.get('/api/org/users')
            ]);
            setOrgs(orgRes.data);
            setUsers(userRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to sync organizational data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'hr') {
            navigate('/dashboard');
            return;
        }
        fetchData();
    }, [user, navigate]);

    // CORE ACTIONS
    const handleCreateDept = async () => {
        try {
            await axios.post('/api/org/departments', newDept);
            setOpenDept(false);
            setNewDept({ name: '', description: '' });
            fetchData();
            toast.success("Department established successfully");
        } catch (err) {
            toast.error(err.response?.data?.error || "Creation failed");
        }
    };

    const handleCreateTeam = async () => {
        try {
            await axios.post('/api/org/teams', { deptName: teamData.deptName, teamName: teamData.teamName });
            setOpenTeam(false);
            setTeamData({ ...teamData, teamName: '' });
            fetchData();
            toast.success(`Team joined to ${teamData.deptName} `);
        } catch (err) {
            toast.error(err.response?.data?.error || "Team creation failed");
        }
    };

    const handleRenameTeam = async () => {
        try {
            await axios.patch('/api/org/teams/rename', {
                deptName: teamData.deptName,
                oldName: teamData.oldName,
                newName: teamData.newName
            });
            setOpenRename(false);
            fetchData();
            toast.success("Team renamed and staff records updated");
        } catch (err) {
            toast.error(err.response?.data?.error || "Rename failed");
        }
    };

    const handleMoveTeam = async () => {
        try {
            await axios.patch('/api/org/teams/move', {
                teamName: teamData.oldName,
                fromDept: teamData.deptName,
                toDept: teamData.toDept
            });
            setOpenMove(false);
            fetchData();
            toast.success("Team relocated flawlessly");
        } catch (err) {
            toast.error(err.response?.data?.error || "Relocation failed");
        }
    };

    const handleDeleteTeam = async (deptName, teamName) => {
        if (!window.confirm(`Dissolve team "${teamName}" ? All assigned staff will be unlinked.`)) return;
        try {
            await axios.delete(`/ api / org / teams / ${deptName}/${teamName}`);
            fetchData();
            toast.warn("Team dissolved.");
        } catch (err) {
            toast.error("Deletion failed");
        }
    };

    const handleReassign = async () => {
        try {
            await axios.patch(`/api/org/users/${assignData.userId}/reassign`, {
                dept: assignData.dept,
                team: assignData.team
            });
            setOpenAssign(false);
            fetchData();
            toast.success(`Staff ${assignData.userName} reassigned successfully`);
        } catch (err) {
            toast.error("Reassignment failed");
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/hr-dashboard')}
                        sx={{ mb: 2, fontWeight: 'bold' }}
                    >
                        Return to Hub
                    </Button>
                    <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                        Architectural <Box component="span" color="primary.main">Console</Box>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">Executive Corporate Structure & Roster Management</Typography>
                </Box>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Core Architecture" sx={{ fontWeight: 'bold' }} />
                    <Tab label="Staff Roster" sx={{ fontWeight: 'bold' }} />
                </Tabs>
            </Box>

            {tab === 0 && (
                <>
                    <Box display="flex" justifyContent="flex-end" mb={3}>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            size="large"
                            sx={{ borderRadius: 2, fontWeight: 'bold' }}
                            onClick={() => setOpenDept(true)}
                        >
                            Establish Department
                        </Button>
                    </Box>

                    <Grid container spacing={4}>
                        {orgs.map((dept) => (
                            <Grid item xs={12} md={6} lg={4} key={dept._id}>
                                <Paper sx={{ p: 3, borderRadius: 4, height: '100%', borderTop: '6px solid #ffcc00', boxShadow: 3 }}>
                                    <Box display="flex" justifyContent="space-between" mb={2}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Business color="primary" />
                                            <Typography variant="h6" fontWeight="950">{dept.name}</Typography>
                                        </Box>
                                        <IconButton size="small" color="error" onClick={() => {
                                            if (window.confirm(`Dissolve ${dept.name}?`)) {
                                                axios.delete(`/api/org/departments/${dept.name}`).then(fetchData);
                                            }
                                        }}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>

                                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                                        {dept.description || 'Corporate unit without description.'}
                                    </Typography>

                                    <Divider sx={{ mb: 2 }} />

                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="overline" fontWeight="950" color="primary">Functional Teams</Typography>
                                        <Button
                                            startIcon={<Add />}
                                            size="small"
                                            onClick={() => {
                                                setTeamData({ ...teamData, deptName: dept.name });
                                                setOpenTeam(true);
                                            }}
                                            sx={{ fontWeight: 'bold' }}
                                        >
                                            Add Team
                                        </Button>
                                    </Box>

                                    <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                                        {dept.teams.map((team, i) => (
                                            <ListItem key={i} divider={i !== dept.teams.length - 1}>
                                                <ListItemText
                                                    primary={team}
                                                    primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton size="small" onClick={() => {
                                                        setTeamData({ ...teamData, deptName: dept.name, oldName: team, newName: team });
                                                        setOpenRename(true);
                                                    }}>
                                                        <Edit fontSize="inherit" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => {
                                                        setTeamData({ ...teamData, deptName: dept.name, oldName: team });
                                                        setOpenMove(true);
                                                    }}>
                                                        <SwapHoriz fontSize="inherit" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteTeam(dept.name, team)}>
                                                        <Delete fontSize="inherit" />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {tab === 1 && (
                <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Staff Name</TableCell>
                                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Current Dept</TableCell>
                                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Current Team</TableCell>
                                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Role</TableCell>
                                <TableCell align="right" sx={{ color: 'black', fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{u.name}</TableCell>
                                    <TableCell><Chip label={u.dept || 'UNASSIGNED'} size="small" /></TableCell>
                                    <TableCell><Chip label={u.team || 'UNASSIGNED'} size="small" variant="outlined" /></TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>{u.role}</TableCell>
                                    <TableCell align="right">
                                        <Button
                                            startIcon={<People />}
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                setAssignData({ userId: u.id, userName: u.name, dept: u.dept || '', team: u.team || '' });
                                                setOpenAssign(true);
                                            }}
                                            sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                        >
                                            Reassign
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODALS */}
            <Dialog open={openDept} onClose={() => setOpenDept(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: '950' }}>Establish Department</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Dept Name" fullWidth variant="filled"
                        value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense" label="Mission / Description" fullWidth multiline rows={3} variant="filled"
                        value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenDept(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateDept} sx={{ fontWeight: 'bold' }}>Create Dept</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openTeam} onClose={() => setOpenTeam(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: '950' }}>Add Functional Team</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="primary" fontWeight="bold">UNIT: {teamData.deptName}</Typography>
                    <TextField
                        autoFocus margin="dense" label="Team Name" fullWidth variant="filled"
                        value={teamData.teamName} onChange={(e) => setTeamData({ ...teamData, teamName: e.target.value })}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenTeam(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateTeam} sx={{ fontWeight: 'bold' }}>Join Team</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRename} onClose={() => setOpenRename(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: '950' }}>Rename Team</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="New Team Name" fullWidth variant="filled"
                        value={teamData.newName} onChange={(e) => setTeamData({ ...teamData, newName: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenRename(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleRenameTeam} sx={{ fontWeight: 'bold' }}>Apply Name</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openMove} onClose={() => setOpenMove(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: '950' }}>Relocate Team</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>Relocating: <strong>{teamData.oldName}</strong></Typography>
                    <FormControl fullWidth variant="filled">
                        <InputLabel>Destination Department</InputLabel>
                        <Select
                            value={teamData.toDept}
                            onChange={(e) => setTeamData({ ...teamData, toDept: e.target.value })}
                        >
                            {orgs.map(o => <MenuItem key={o._id} value={o.name}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenMove(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleMoveTeam} sx={{ fontWeight: 'bold' }}>Relocate</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: '950' }}>Staff Reassignment</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={3}>Target: <strong>{assignData.userName}</strong></Typography>
                    <FormControl fullWidth variant="filled" sx={{ mb: 2 }}>
                        <InputLabel>Department</InputLabel>
                        <Select
                            value={assignData.dept}
                            onChange={(e) => setAssignData({ ...assignData, dept: e.target.value, team: '' })}
                        >
                            {orgs.map(o => <MenuItem key={o._id} value={o.name}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth variant="filled">
                        <InputLabel>Team</InputLabel>
                        <Select
                            value={assignData.team}
                            onChange={(e) => setAssignData({ ...assignData, team: e.target.value })}
                            disabled={!assignData.dept}
                        >
                            {orgs.find(o => o.name === assignData.dept)?.teams.map(t => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleReassign} sx={{ fontWeight: 'bold' }}>Complete Reassignment</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OrgManagement;
