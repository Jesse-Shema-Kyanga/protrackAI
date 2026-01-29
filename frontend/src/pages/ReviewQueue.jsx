import { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Chip, IconButton, Link,
    Card, CardContent, CircularProgress, Alert
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Help from '@mui/icons-material/Help';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Refresh from '@mui/icons-material/Refresh';
import Assessment from '@mui/icons-material/Assessment';
import Speed from '@mui/icons-material/Speed';
import axios from 'axios';
import { toast } from 'react-toastify';

const ReviewQueue = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/activities/review-queue');
            setQueue(res.data);
        } catch (err) {
            console.error('Failed to fetch review queue:', err);
            toast.error('Failed to load review items');
        } finally {
            setLoading(false);
        }
    };

    const handleClassify = async (id, category) => {
        setProcessing(id);
        try {
            await axios.patch(`/api/activities/${id}/classify`, { category });
            setQueue(prev => prev.filter(item => item._id !== id));
            toast.success(`Activity marked as ${category}`);
        } catch (err) {
            console.error('Failed to classify:', err);
            toast.error('Update failed');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Box>
                    <Typography variant="h4" fontWeight="950" sx={{ letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                        Executive <Box component="span" color="primary.main">Audit Hub</Box>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">Manual override and policy enforcement for low-confidence activity</Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchQueue}
                    disabled={loading}
                    sx={{ borderRadius: 2, fontWeight: 'bold' }}
                >
                    Refresh Sync
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : queue.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, borderTop: '6px solid #4caf50' }}>
                    <CheckCircle sx={{ fontSize: 80, color: 'success.light', mb: 3 }} />
                    <Typography variant="h4" fontWeight="950" gutterBottom>Perfect Alignment</Typography>
                    <Typography color="textSecondary" variant="h6">No activities require executive intervention at this time.</Typography>
                </Paper>
            ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                    {queue.map(item => (
                        <Paper key={item._id} sx={{ p: 3, mb: 1, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '6px solid #ffcc00' }}>
                            <Box flex={1}>
                                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                                    <Assessment color="primary" fontSize="small" />
                                    <Typography variant="h6" fontWeight="900" sx={{ lineHeight: 1 }}>
                                        {item.appName}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                                        {new Date(item.timestamp).toLocaleString()}
                                    </Typography>
                                    <Chip
                                        label={`${(item.confidence * 100).toFixed(0)}% AI Conf`}
                                        size="small"
                                        color="warning"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                    <Typography variant="subtitle2" fontWeight="950" sx={{ color: 'primary.main', ml: 2 }}>
                                        STAFF: {item.userId?.name || item.userId?.email}
                                    </Typography>
                                </Box>
                                <Typography variant="body1" fontWeight="500" noWrap sx={{ maxWidth: '700px', mb: 1 }}>
                                    {item.windowTitle}
                                </Typography>
                                {item.url && (
                                    <Link
                                        href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        display="flex"
                                        alignItems="center"
                                        gap={0.5}
                                        sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                                    >
                                        <OpenInNew sx={{ fontSize: 14 }} />
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{item.url}</Typography>
                                    </Link>
                                )}
                            </Box>

                            <Box display="flex" gap={1}>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    startIcon={<CheckCircle />}
                                    onClick={() => handleClassify(item._id, 'productive')}
                                    disabled={processing === item._id}
                                >
                                    Productive
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<Cancel />}
                                    onClick={() => handleClassify(item._id, 'non-productive')}
                                    disabled={processing === item._id}
                                >
                                    Non-Prod
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    size="small"
                                    startIcon={<Help />}
                                    onClick={() => handleClassify(item._id, 'neutral')}
                                    disabled={processing === item._id}
                                >
                                    Neutral
                                </Button>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default ReviewQueue;
