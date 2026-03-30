import { useState, useEffect, useContext } from 'react';
import {
    Box, Paper, Typography, Tabs, Tab, Grid, TextField, Button, Card, CardContent,
    Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText, Divider, Chip
} from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const Feedback = () => {
    const { user } = useContext(AuthContext);
    const [tab, setTab] = useState(0);
    const [employees, setEmployees] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [formData, setFormData] = useState({
        toUserId: '', type: '', content: '', rating: '', assessment: '', areasImprovement: '',
        hrComment: '', hrRating: 5
    });
    const [reviewingId, setReviewingId] = useState(null);
    const [myStats, setMyStats] = useState(null);
    const [myAttendance, setMyAttendance] = useState(null);

    const isSupervisor = user.role === 'supervisor' || user.role === 'hr';

    // Chart logic
    const prodSec = myStats?.productiveTime || 0;
    const neutralSec = myStats?.neutralTime || 0;
    const nonProdSec = myStats?.nonProductiveTime || 0;

    const chartData = {
        labels: ['Productive', 'Neutral', 'Non-Productive'],
        datasets: [{
            data: [prodSec, neutralSec, nonProdSec],
            backgroundColor: ['#4caf50', '#333333', '#f44336'],
            hoverOffset: 4,
            borderWidth: 0,
            cutout: '75%'
        }],
    };

    useEffect(() => {
        if (user) {
            if (isSupervisor) {
                fetchEmployees();
                if (tab === 1) fetchSelfEvals();
            } else {
                if (tab === 0) fetchReceivedFeedback();
                if (tab === 1) fetchMySelfEvals();
            }
        }
    }, [user, tab]);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`/api/users?role=employee`);
            setEmployees(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchReceivedFeedback = async () => {
        try {
            const res = await axios.get(`/api/feedback/${user.id}`);
            setFeedbackList(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchSelfEvals = async () => { // For Supervisor/HR identifying employees
        try {
            const params = user.role === 'hr'
                ? { hr: true }
                : { team: user.team, supId: user.id };
            const res = await axios.get('/api/evals', { params });
            setFeedbackList(res.data.evals || res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchMySelfEvals = async () => { // For Employee history
        try {
            const res = await axios.get(`/api/evals/${user.id}`);
            setFeedbackList(res.data);
            
            // Also fetch current stats to provide context for the evaluation (last 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const [statsRes, timeRes] = await Promise.all([
                axios.get(`/api/reports?userId=${user.id}`).catch(e => ({ data: null })),
                axios.get(`/api/time?userId=${user.id}&startDate=${thirtyDaysAgo}`).catch(e => ({ data: { metrics: null } }))
            ]);
            setMyStats(statsRes.data);
            setMyAttendance(timeRes.data.metrics);
        } catch (err) { console.error(err); }
    };

    const handleSubmitFeedback = async () => { // Supervisor sending
        try {
            await axios.post('/api/feedback', {
                fromUserId: user.id,
                toUserId: formData.toUserId,
                type: formData.type,
                content: formData.content,
                rating: formData.rating
            });
            alert('Feedback sent!');
            setFormData({ ...formData, content: '', rating: '', type: '', toUserId: '' });
        } catch (err) { alert('Error sending feedback'); }
    };

    const handleSubmitSelfEval = async () => { // Employee submitting
        try {
            await axios.post('/api/evals', {
                userId: user.id,
                assessment: formData.assessment,
                areasImprovement: formData.areasImprovement,
                rating: formData.rating,
                type: 'self',
                status: 'pending'
            });
            alert('Self-evaluation submitted!');
            fetchMySelfEvals();
            setFormData({ ...formData, assessment: '', areasImprovement: '', rating: '' });
        } catch (err) { alert('Error submitting evaluation'); }
    };

    const handleReviewSubmit = async (evalId) => {
        try {
            await axios.put(`/api/evals/${evalId}/review`, {
                hrComment: formData.hrComment,
                hrRating: formData.hrRating,
                reviewedBy: user.id
            });
            alert('Review recorded!');
            setReviewingId(null);
            setFormData({ ...formData, hrComment: '', hrRating: 5 });
            fetchSelfEvals();
        } catch (err) { alert('Error submitting review'); }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {isSupervisor ? 'Team Feedback & Evaluations' : 'My Feedback & Self-Eval'}
            </Typography>

            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label={isSupervisor ? "Give Feedback" : "Received Feedback"} />
                <Tab label={isSupervisor ? "Review Self-Evals" : "Submit Self-Eval"} />
            </Tabs>

            {/* SUPERVISOR VIEW */}
            {isSupervisor && tab === 0 && (
                <Box display="flex" justifyContent="center">
                    <Paper sx={{ p: 4, width: '100%', maxWidth: 800, borderRadius: 3 }}>
                        <Typography variant="h5" fontWeight="950" mb={3}>Give Feedback to Employee</Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Employee</InputLabel>
                        <Select
                            value={formData.toUserId}
                            label="Employee"
                            onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                        >
                            {employees.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={formData.type}
                            label="Type"
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <MenuItem value="positive">Positive Recognition</MenuItem>
                            <MenuItem value="constructive">Constructive</MenuItem>
                            <MenuItem value="performance_review">Performance Review</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Message" multiline rows={4} fullWidth margin="normal"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                    <TextField
                        label="Rating (1-10)" type="number" fullWidth margin="normal"
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    />
                    <Button variant="contained" size="large" sx={{ mt: 3, fontWeight: 'bold', borderRadius: 2 }} onClick={handleSubmitFeedback} fullWidth>Submit Feedback</Button>
                    </Paper>
                </Box>
            )}

            {isSupervisor && tab === 1 && (
                <Grid container spacing={2}>
                    {feedbackList.map((evalItem, i) => (
                        <Grid size={{ xs: 12 }} key={i}>
                            <Card variant="outlined" sx={{ borderLeft: evalItem.status === 'pending' ? '6px solid #ffcc00' : '6px solid #4caf50' }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="h6">{evalItem.userName || evalItem.userId} - {evalItem.type}</Typography>
                                        <Typography variant="overline" color={evalItem.status === 'pending' ? 'error' : 'success'}>
                                            {evalItem.status}
                                        </Typography>
                                    </Box>
                                    <Typography color="textSecondary" gutterBottom>{new Date(evalItem.timestamp).toLocaleDateString()}</Typography>
                                    <Typography variant="body1" mt={1}><strong>Assessment:</strong> {evalItem.assessment}</Typography>
                                    <Typography variant="body1"><strong>Improvements:</strong> {evalItem.areasImprovement}</Typography>
                                    <Typography variant="body2" mt={1} color="primary">Employee Rating: {evalItem.rating}</Typography>

                                    {evalItem.status === 'pending' && reviewingId !== evalItem._id && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            sx={{ mt: 2 }}
                                            onClick={() => setReviewingId(evalItem._id)}
                                        >
                                            Record Audit Review
                                        </Button>
                                    )}

                                    {reviewingId === evalItem._id && (
                                        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
                                            <Typography variant="subtitle2" gutterBottom>Audit Decision</Typography>
                                            <TextField
                                                label="HR/Supervisor Comment"
                                                fullWidth multiline rows={2} margin="dense"
                                                value={formData.hrComment}
                                                onChange={(e) => setFormData({ ...formData, hrComment: e.target.value })}
                                            />
                                            <TextField
                                                label="Final Quality Rating (1-10)"
                                                type="number" size="small" margin="dense"
                                                value={formData.hrRating}
                                                onChange={(e) => setFormData({ ...formData, hrRating: e.target.value })}
                                            />
                                            <Box mt={1}>
                                                <Button size="small" onClick={() => handleReviewSubmit(evalItem._id)}>Confirm Review</Button>
                                                <Button size="small" color="inherit" onClick={() => setReviewingId(null)}>Cancel</Button>
                                            </Box>
                                        </Box>
                                    )}

                                    {evalItem.status === 'completed' && (
                                        <Box mt={2} p={2} bgcolor="success.light" sx={{ opacity: 0.9, borderRadius: 1 }}>
                                            <Typography variant="subtitle2"><strong>Audit Result:</strong> {evalItem.hrComment}</Typography>
                                            <Typography variant="caption">Rating: {evalItem.hrRating}/10 | Reviewed At: {new Date(evalItem.timestamp).toLocaleDateString()}</Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {feedbackList.length === 0 && <Typography p={2}>No evaluations found.</Typography>}
                </Grid>
            )}

            {/* EMPLOYEE VIEW */}
            {!isSupervisor && tab === 0 && (
                <Box display="flex" justifyContent="center">
                    <Paper sx={{ width: '100%', maxWidth: 800, borderRadius: 3, overflow: 'hidden' }}>
                        <List sx={{ bgcolor: 'background.paper' }}>
                            {feedbackList.map((fb, i) => (
                        <ListItem key={i} divider alignItems="flex-start">
                            <ListItemText
                                primary={
                                    <>
                                        {fb.type.toUpperCase()}
                                        <Typography component="span" variant="caption" ml={2}>{new Date(fb.timestamp).toLocaleDateString()}</Typography>
                                    </>
                                }
                                secondary={
                                    <>
                                        <Typography component="span" variant="body2" color="textPrimary" display="block">
                                            {fb.content}
                                        </Typography>
                                        From: {fb.fromUserName || 'Supervisor'} | Rating: {fb.rating}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                            {feedbackList.length === 0 && <Typography p={4} align="center" color="textSecondary">No feedback received yet.</Typography>}
                        </List>
                    </Paper>
                </Box>
            )}

            {!isSupervisor && tab === 1 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 4 }}>
                            <Typography variant="h6" mb={2}>Submit Self-Evaluation</Typography>
                            
                            {myStats && (
                                <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                                    <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
                                        Your Performance Profile
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" mb={3}>
                                        Review your current standing before submitting your evaluation.
                                    </Typography>
                                    
                                    <Grid container spacing={4} alignItems="center">
                                        <Grid size={{ xs: 12, sm: 5 }} sx={{ position: 'relative' }}>
                                            <Doughnut data={chartData} options={{ maintainAspectRatio: true, plugins: { legend: { display: false } } }} />
                                            <Box sx={{
                                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                                textAlign: 'center', pointerEvents: 'none'
                                            }}>
                                                <Typography variant="h5" fontWeight="900" sx={{ color: '#4caf50' }}>{myStats.efficiency || '0%'}</Typography>
                                                <Typography variant="caption" color="textSecondary">Productivity</Typography>
                                            </Box>
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, sm: 7 }}>
                                            <Box display="flex" flexDirection="column" gap={2}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="textSecondary" fontWeight="bold">Primary Tool:</Typography>
                                                    <Chip size="small" label={myStats.domainBreakdown && myStats.domainBreakdown[0] ? myStats.domainBreakdown[0].domain : 'None'} sx={{ fontWeight: 'bold' }} />
                                                </Box>
                                                <Divider />
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="textSecondary" fontWeight="bold">Punctuality-Weighted Score:</Typography>
                                                    <Typography variant="body2" fontWeight="bold" color="primary.main">{myAttendance && myAttendance.attendanceRate !== undefined ? `${myAttendance.attendanceRate}%` : '—'}</Typography>
                                                </Box>
                                                <Divider />
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="textSecondary" fontWeight="bold">Lates / Absences:</Typography>
                                                    <Box>
                                                        <Typography component="span" variant="body2" color="warning.main" fontWeight="bold">{myAttendance ? myAttendance.late : 0}</Typography>
                                                        <Typography component="span" variant="body2" mx={1}>/</Typography>
                                                        <Typography component="span" variant="body2" color="error.main" fontWeight="bold">{myAttendance ? myAttendance.absent : 0}</Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            )}

                            <TextField
                                label="Progress Assessment" multiline rows={4} fullWidth margin="normal"
                                value={formData.assessment}
                                onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                            />
                            <TextField
                                label="Areas for Improvement" multiline rows={3} fullWidth margin="normal"
                                value={formData.areasImprovement}
                                onChange={(e) => setFormData({ ...formData, areasImprovement: e.target.value })}
                            />
                            <TextField
                                label="Self Rating (1-10)" type="number" fullWidth margin="normal"
                                value={formData.rating}
                                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                            />
                            <Button variant="contained" sx={{ mt: 2 }} onClick={handleSubmitSelfEval}>Submit Evaluation</Button>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h6" mb={2}>Past Evaluations</Typography>
                        <List sx={{ bgcolor: 'background.paper' }}>
                            {feedbackList.map((ev, i) => (
                                <ListItem key={i} divider>
                                    <ListItemText
                                        primary={`Self Eval - ${new Date(ev.timestamp).toLocaleDateString()}`}
                                        secondary={`Rating: ${ev.rating} | Status: ${ev.status}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Grid>
                </Grid>
            )}

        </Box>
    );
};

export default Feedback;
