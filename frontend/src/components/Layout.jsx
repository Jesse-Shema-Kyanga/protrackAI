import { useState, useContext, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, CssBaseline, AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem,
    useTheme, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Snackbar, Alert, Badge
} from '@mui/material';
import {
    Dashboard, Assignment, Flag, AccessTime, Assessment, Psychology,
    Logout, Person, Brightness4, Brightness7, Notifications as NotifIcon, DateRange
} from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { ColorModeContext } from '../App';

const Layout = () => {
    const { user, logout: authLogout } = useContext(AuthContext);
    const { toggleColorMode } = useContext(ColorModeContext);
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenu = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleLogout = () => {
        authLogout();
        navigate('/login');
    };

    // Role-based Navigation Config
    const navConfig = {
        employee: [
            { text: 'Dashboard', icon: <Dashboard />, path: '/employee-dashboard' },
            { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
            { text: 'Goals', icon: <Flag />, path: '/goals' },
            { text: 'Analytics', icon: <Assessment />, path: '/analytics' },
            { text: 'Feedback', icon: <Assessment />, path: '/feedback' },
            { text: 'Time Off', icon: <DateRange />, path: '/leave' },
        ],
        supervisor: [
            { text: 'Dashboard', icon: <Dashboard />, path: '/supervisor-dashboard' },
            { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
            { text: 'Goals', icon: <Flag />, path: '/goals' },
            { text: 'Evaluations', icon: <Assessment />, path: '/feedback' },
            { text: 'AI Manager', icon: <Psychology />, path: '/ai-management' },
            { text: 'Reports & Analytics', icon: <Assessment />, path: '/analytics' },
            { text: 'Leave Management', icon: <DateRange />, path: '/leave' },
        ],
        hr: [
            { text: 'Dashboard', icon: <Dashboard />, path: '/hr-dashboard' },
            { text: 'Reports & Analytics', icon: <Assessment />, path: '/hr-analytics' },
            { text: 'Reviews', icon: <Assignment />, path: '/feedback' },
            { text: 'AI Manager', icon: <Psychology />, path: '/ai-management' },
            { text: 'Leaves', icon: <DateRange />, path: '/leave' },
        ],
        admin: [
            { text: 'User Management', icon: <Person />, path: '/admin-dashboard' },
            { text: 'Org Architecture', icon: <Dashboard />, path: '/org-management' },
        ]
    };

    const role = user?.role || 'employee';
    const menuItems = navConfig[role] || navConfig.employee;

    // Helper to get button color based on active state and theme mode
    const getButtonColor = (path) => {
        const isActive = location.pathname === path;

        // Active state is always MTN Yellow or dark yellow
        if (isActive) return '#ffcc00';

        // Inactive state: Black in light mode, White in dark mode
        return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)';
    };

    // --- Alerts & Prompts Logic ---
    const [explainOpen, setExplainOpen] = useState(false);
    const [explanation, setExplanation] = useState("");
    const [activeUrgentId, setActiveUrgentId] = useState(null);
    const [clockReminderOpen, setClockReminderOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Import axios here if not already imported, but Layout uses it? No, Layout doesn't have axios import.
    // Need to add imports: useEffect, axios, Dialog, etc.
    // Wait, Layout imports need update first. I will do this in two chunks.


    // --- Notifications & Alerts Polling ---
    useEffect(() => {
    if (!user) return;
        // Admin has no operational notifications — skip all polling
        if (user.role === 'admin') return;

        const checkNotifications = async () => {
            try {
                // 1. Fetch unread count for badge
                const countRes = await axios.get('/api/notifications/unread-count', {
                    params: { role: user.role, team: user.team, dept: user.dept }
                });
                setUnreadCount(countRes.data.count || 0);

                // 2. Check for urgent employee alerts (WhatsApp/Clock reminders)
                if (user.role === 'employee') {
                    const res = await axios.get('/api/notifications', {
                        params: { userId: user.id, role: 'employee' }
                    });

                    const notifs = Array.isArray(res.data) ? res.data : [];
                    const prompt = notifs.find(n => n.type === 'whatsapp_prompt' && !n.read);
                    if (prompt) {
                        setActiveUrgentId(prompt._id);
                        setExplainOpen(true);
                    }

                    const reminder = notifs.find(n => n.type === 'clock_reminder' && !n.read);
                    if (reminder) setClockReminderOpen(true);
                }

            } catch (err) {
                // silent fail
            }
        };

        const interval = setInterval(checkNotifications, 10000); // Check every 10s
        checkNotifications(); // Initial check

        window.addEventListener('notification-update', checkNotifications);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notification-update', checkNotifications);
        };
    }, [user, location.pathname]); // Refetch on route change to clear count after viewing

    const handleExplanationSubmit = async () => {
        if (!explanation.trim()) return;
        try {
            await axios.post('/api/notifications/explain', {
                notificationId: activeUrgentId,
                explanation: explanation,
                userId: user.id
            });
            setExplainOpen(false);
            setExplanation("");
            alert("Explanation submitted. Supervisors have been notified.");
        } catch (err) {
            alert("Failed to submit. Please try again.");
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <CssBaseline />

            {/* Top Navigation Bar - Full Width */}
            <AppBar position="sticky" elevation={2} sx={{ width: '100%' }}>
                {/* ... existing header logic ... */}
                <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3, md: 4 } }}>
                    {/* Logo */}
                    <Box component="img" sx={{ height: 40, mr: 2 }} alt="MTN" src="https://logonoid.com/images/mtn-logo.jpg" />
                    <Typography variant="h6" noWrap sx={{ color: '#ffcc00', fontWeight: 'bold', mr: 4 }}>
                        ProTrackAI 🚀
                    </Typography>

                    {/* Navigation Links */}
                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
                        {menuItems.map((item) => (
                            <Button
                                key={item.path}
                                startIcon={item.icon}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    color: getButtonColor(item.path),
                                    fontWeight: location.pathname === item.path ? 'bold' : '600',
                                    borderBottom: location.pathname === item.path ? '3px solid #ffcc00' : '3px solid transparent',
                                    borderRadius: 0,
                                    px: 2,
                                    py: 1,
                                    '& .MuiButton-startIcon': {
                                        color: getButtonColor(item.path)
                                    },
                                    '&:hover': {
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 204, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        borderBottom: '3px solid #ffcc00',
                                        color: theme.palette.mode === 'dark' ? '#ffcc00' : '#000000'
                                    }
                                }}
                            >
                                {item.text}
                            </Button>
                        ))}
                    </Box>

                    {/* Right Side Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                            onClick={() => navigate('/notifications')}
                            sx={{
                                color: theme.palette.text.primary,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <Badge badgeContent={unreadCount} color="error">
                                <NotifIcon />
                            </Badge>
                        </IconButton>

                        <IconButton
                            onClick={toggleColorMode}
                            sx={{
                                color: theme.palette.text.primary,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                        </IconButton>

                        <IconButton onClick={handleMenu}>
                            <Avatar
                                src={user?.avatar || ''}
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
                                    width: 38,
                                    height: 38,
                                    fontSize: '1rem'
                                }}>
                                {!user?.avatar && (user?.name?.charAt(0) || 'U')}
                            </Avatar>
                        </IconButton>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <MenuItem disabled>
                                <Typography variant="body2" color="textSecondary">
                                    {user?.name} ({user?.role})
                                </Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
                                <Person sx={{ mr: 1 }} /> Profile
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>
                                <Logout sx={{ mr: 1 }} /> Logout
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content - Full Width Fluid with Auto Margins for Centering */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',              // Forces full availability
                    maxWidth: '100%',           // Prevents accidental constraints
                    mx: 'auto',                 // Centers the block if width < 100%
                    px: { xs: 2, sm: 3, md: 4 }, // Matches Header Padding Exactly
                    py: 4
                }}
            >
                <Outlet />
            </Box>

            {/* Footer - Full Width Fluid - UNIFIED PADDING */}
            <Box
                component="footer"
                sx={{
                    width: '100%',
                    py: 3,
                    px: { xs: 2, sm: 3, md: 4 }, // Matches Header Padding Exactly
                    mt: 'auto',
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    borderTop: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: 1
                    }}
                >
                    <Typography variant="body2" color="textSecondary" align="center">
                        © 2026 ProTrackAI - Intelligent Employee Productivity Management System
                    </Typography>
                    <Typography variant="caption" color="textSecondary" align="center" sx={{ opacity: 0.7 }}>
                        MTN Rwanda
                    </Typography>
                </Box>
            </Box>

            {/* --- WhatsApp Explanation Dialog --- */}
            <Dialog open={explainOpen} persistent>
                <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    ⚠️ High WhatsApp Usage Detected
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        You have exceeded 1 hour of WhatsApp usage today. Please provide a brief explanation for your supervisor.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Reason / Explanation"
                        fullWidth
                        multiline
                        rows={3}
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="e.g. Communicating with client X regarding..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleExplanationSubmit}
                        variant="contained"
                        color="error"
                        disabled={!explanation.trim()}
                    >
                        Submit Explanation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- Clock-In Reminder Snackbar --- */}
            <Snackbar
                open={clockReminderOpen}
                autoHideDuration={6000}
                onClose={() => setClockReminderOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setClockReminderOpen(false)} severity="warning" variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>
                    ⏰ Reminder: You are working but NOT clocked in!
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default Layout;
