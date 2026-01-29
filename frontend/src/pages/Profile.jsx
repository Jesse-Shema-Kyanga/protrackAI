import { useState, useEffect, useContext } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button, Avatar, Divider, Alert
} from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Profile = () => {
    const { user, setUser } = useContext(AuthContext);
    const [profileData, setProfileData] = useState({
        name: '', email: '', id: '', dept: '', pos: '', team: '', avatar: ''
    });
    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchUserData = async () => {
            const idToFetch = user?.userId || user?.id;
            if (!idToFetch) return;
            try {
                const res = await axios.get(`/api/users/${idToFetch}`);
                const d = res.data;
                setProfileData({
                    // Priority: API Data -> JWT State -> Empty
                    name: d.name || user?.name || '',
                    email: d.email || user?.email || '',
                    id: d.id || idToFetch || '',
                    dept: d.dept || '',
                    pos: d.pos || '',
                    team: d.team || '',
                    avatar: d.avatar || ''
                });
            } catch (err) {
                console.error("Profile Fetch Error details:", err?.response?.data || err.message);
                // Even on error, populate what we have from the user context
                setProfileData(prev => ({
                    ...prev,
                    name: user?.name || '',
                    email: user?.email || '',
                    id: user?.userId || user?.id || '',
                    avatar: user?.avatar || ''
                }));
            }
        };
        fetchUserData();
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 5MB (Backend limit is 10MB)
        if (file.size > 5 * 1024 * 1024) {
            setMsg({ type: 'error', text: 'Image size too large. Max 5MB.' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileData(prev => ({ ...prev, avatar: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleProfileUpdate = async () => {
        try {
            const userId = user?.userId || user?.id;
            const res = await axios.put(`/api/users/${userId}`, {
                name: profileData.name,
                email: profileData.email,
                id: profileData.id,
                team: profileData.team,
                dept: profileData.dept,
                pos: profileData.pos,
                avatar: profileData.avatar
            });
            // Update local context with new data
            setUser({ ...user, ...res.data, userId: res.data.id });
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMsg({ type: 'error', text: 'Failed to update profile. Check if the ID/Email is already in use.' });
        }
    };

    const handlePasswordUpdate = async () => {
        if (passData.new !== passData.confirm) {
            setMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        try {
            await axios.put(`/api/users/${user.id}/password`, {
                currentPassword: passData.current,
                newPassword: passData.new
            });
            setMsg({ type: 'success', text: 'Password changed successfully!' });
            setPassData({ current: '', new: '', confirm: '' });
        } catch (err) {
            setMsg({ type: 'error', text: 'Failed to change password. Please check your current password.' });
        }
    };

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
            <Typography variant="h4" fontWeight="900" sx={{ mb: 4, letterSpacing: '-1.5px' }}>
                Profile <Box component="span" color="primary.main">Settings</Box>
            </Typography>

            {msg.text && (
                <Alert
                    severity={msg.type}
                    sx={{ mb: 4, borderRadius: 2 }}
                    onClose={() => setMsg({ type: '', text: '' })}
                >
                    {msg.text}
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 4, textAlign: 'center', borderTop: '4px solid', borderColor: 'primary.main', borderRadius: 3 }}>
                        <Avatar
                            src={profileData.avatar || ""}
                            sx={{ width: 120, height: 120, mx: 'auto', mb: 3, bgcolor: 'primary.main', color: 'black', fontWeight: 'bold', fontSize: 48 }}
                        >
                            {!profileData.avatar && (user?.name?.charAt(0) || 'U')}
                        </Avatar>
                        <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            sx={{ borderRadius: 2 }}
                        >
                            Change Photo
                            <input
                                type="hidden"
                                accept="image/*"
                            />
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </Button>
                        <Typography variant="h5" fontWeight="900" mt={3}>{profileData.name || 'User'}</Typography>
                        <Typography color="textSecondary" variant="body2" sx={{ mt: 1, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                            {user?.role} • {profileData.dept || 'Corporate'}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" mb={4}>Personal Information</Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Full Name"
                                    fullWidth
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Work Email"
                                    fullWidth
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Employee ID (MTN Code)"
                                    fullWidth
                                    value={profileData.id}
                                    onChange={(e) => setProfileData({ ...profileData, id: e.target.value })}
                                    helperText="Changing this updates your ID across all system logs."
                                />
                            </Grid>
                            {user?.role !== 'hr' && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Current Team"
                                        fullWidth
                                        value={profileData.team}
                                        onChange={(e) => setProfileData({ ...profileData, team: e.target.value })}
                                    />
                                </Grid>
                            )}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Department"
                                    fullWidth
                                    value={profileData.dept}
                                    onChange={(e) => setProfileData({ ...profileData, dept: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Position"
                                    fullWidth
                                    value={profileData.pos}
                                    onChange={(e) => setProfileData({ ...profileData, pos: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <Box mt={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleProfileUpdate}
                                sx={{ px: 4 }}
                            >
                                Save Profile Changes
                            </Button>
                        </Box>

                        <Divider sx={{ my: 5 }} />

                        <Typography variant="h6" fontWeight="bold" mb={4}>Security & Privacy</Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Current Password"
                                    type="password"
                                    fullWidth
                                    value={passData.current}
                                    onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="New Password"
                                    type="password"
                                    fullWidth
                                    value={passData.new}
                                    onChange={(e) => setPassData({ ...passData, new: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Confirm New Password"
                                    type="password"
                                    fullWidth
                                    value={passData.confirm}
                                    onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <Box mt={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handlePasswordUpdate}
                                sx={{ px: 4 }}
                            >
                                Update Password
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Profile;
