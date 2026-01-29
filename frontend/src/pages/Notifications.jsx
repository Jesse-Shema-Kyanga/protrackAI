import { useState, useEffect, useContext } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemText, Chip, IconButton, CircularProgress, Tabs, Tab, Button
} from '@mui/material';
import { CheckCircle, Warning, Error, Notifications as NotifIcon, Assessment, EventRepeat, Assignment } from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Notifications = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get('/api/notifications', {
                params: {
                    userId: user.id,
                    role: user.role,
                    team: user.team,
                    dept: user.dept
                }
            });
            const cleanData = (Array.isArray(res.data) ? res.data : [])
                .filter(n => n && typeof n === 'object' && n._id); // Strict sanitization
            setNotifications(cleanData);
        } catch (err) {
            console.error('Notifications fetch error:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            window.dispatchEvent(new Event('notification-update'));
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/api/notifications/mark-all-read', { userId: user.id });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            window.dispatchEvent(new Event('notification-update'));
        } catch (err) {
            console.error('Mark all read error:', err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'late': return <Warning sx={{ color: '#ffcc00' }} />;
            case 'absent': return <Error sx={{ color: '#f44336' }} />;
            case 'overdue': return <Error sx={{ color: '#ff9800' }} />;
            case 'feedback': return <CheckCircle sx={{ color: '#4caf50' }} />;
            case 'goal': return <NotifIcon sx={{ color: '#2196f3' }} />;
            case 'task': return <Assignment sx={{ color: '#673ab7' }} />;
            case 'evaluation': return <Assessment sx={{ color: '#00bcd4' }} />;
            case 'leave': return <EventRepeat sx={{ color: '#e91e63' }} />;
            case 'clock_reminder': return <NotifIcon sx={{ color: '#ff9800' }} />;
            case 'whatsapp_prompt': return <Warning sx={{ color: '#f44336' }} />;
            default: return <NotifIcon />;
        }
    };

    const filtered = (filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === filter)
    ).filter(n => n && n._id); // Safety filter

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1px' }}>
                    Notification <Box component="span" color="primary.main">Center</Box>
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    {notifications.some(n => !n.read) && (
                        <Button onClick={markAllRead} variant="outlined" size="small" sx={{ borderRadius: 2 }}>
                            Mark All Read
                        </Button>
                    )}
                    <Chip
                        label={`${notifications.filter(n => !n.read).length} Unread`}
                        color="primary"
                        sx={{ fontWeight: 'bold', fontSize: '1rem', px: 2 }}
                    />
                </Box>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={filter}
                    onChange={(e, v) => setFilter(v)}
                    variant="scrollable"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="All" value="all" />
                    {user?.role === 'supervisor' && <Tab label="Late" value="late" />}
                    {user?.role === 'supervisor' && <Tab label="Absent" value="absent" />}
                    {['employee', 'supervisor'].includes(user?.role) && <Tab label="Overdue" value="overdue" />}
                    {user?.role === 'employee' && <Tab label="Feedback" value="feedback" />}
                    {user?.role === 'employee' && <Tab label="Goals" value="goal" />}
                    {user?.role === 'employee' && <Tab label="Tasks" value="task" />}
                    {['employee', 'hr'].includes(user?.role) && <Tab label="Evaluations" value="evaluation" />}
                    <Tab label="Leave" value="leave" />
                    {['supervisor', 'hr'].includes(user?.role) && <Tab label="Alerts" value="alert" />}
                </Tabs>
            </Paper>

            <Paper sx={{ p: 0 }}>
                <List>
                    {filtered.length === 0 ? (
                        <Box sx={{ p: 6, textAlign: 'center' }}>
                            <NotifIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="textSecondary">
                                No notifications to display
                            </Typography>
                        </Box>
                    ) : (
                        filtered.map((notif) => (
                            <ListItem
                                key={notif._id}
                                sx={{
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: notif.read ? 'transparent' : 'action.hover',
                                    transition: '0.2s',
                                    '&:hover': { bgcolor: 'action.selected' }
                                }}
                                secondaryAction={
                                    !notif.read && (
                                        <IconButton
                                            edge="end"
                                            onClick={() => markAsRead(notif._id)}
                                            size="small"
                                        >
                                            <CheckCircle sx={{ color: '#4caf50' }} />
                                        </IconButton>
                                    )
                                }
                            >
                                <Box sx={{ mr: 2 }}>
                                    {getIcon(notif.type)}
                                </Box>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body1" fontWeight={notif.read ? 400 : 700}>
                                                {notif.message}
                                            </Typography>
                                            <Chip
                                                label={notif.type.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    bgcolor: notif.type === 'late' ? 'rgba(255, 204, 0, 0.1)' :
                                                        notif.type === 'absent' ? 'rgba(244, 67, 54, 0.1)' :
                                                            notif.type === 'evaluation' ? 'rgba(0, 188, 212, 0.1)' :
                                                                notif.type === 'leave' ? 'rgba(233, 30, 99, 0.1)' :
                                                                    'rgba(33, 150, 243, 0.1)',
                                                    color: notif.type === 'late' ? '#ffcc00' :
                                                        notif.type === 'absent' ? '#f44336' :
                                                            notif.type === 'evaluation' ? '#00bcd4' :
                                                                notif.type === 'leave' ? '#e91e63' :
                                                                    '#2196f3',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="textSecondary">
                                            {(() => {
                                                try {
                                                    return notif.timestamp ? new Date(notif.timestamp).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 'Just now';
                                                } catch (e) {
                                                    return 'Invalid Date';
                                                }
                                            })()}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default Notifications;
