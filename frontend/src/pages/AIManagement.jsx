import { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Alert
} from '@mui/material';
import { Add, Delete, Science, Psychology } from '@mui/icons-material';
import axios from 'axios';

const AIManagement = () => {
    const [rules, setRules] = useState({});
    const [openDialog, setOpenDialog] = useState(false);
    const [testDialog, setTestDialog] = useState(false);
    const [newRule, setNewRule] = useState({ domain: '', weight: 1, reason: '' });
    const [testText, setTestText] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await axios.get('/api/ai/rules');
            setRules(res.data.rules || {});
        } catch (err) {
            console.error('Failed to fetch rules:', err);
        }
    };

    const handleAddRule = async () => {
        setLoading(true);
        try {
            await axios.post('/api/ai/rules', newRule);
            fetchRules();
            setOpenDialog(false);
            setNewRule({ domain: '', weight: 1, reason: '' });
        } catch (err) {
            console.error('Failed to add rule:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (domain) => {
        try {
            await axios.delete(`/api/ai/rules/${domain}`);
            fetchRules();
        } catch (err) {
            console.error('Failed to delete rule:', err);
        }
    };

    const handleTestClassification = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/ai/test', { text: testText });
            setTestResult(res.data);
        } catch (err) {
            console.error('Test failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const getWeightLabel = (weight) => {
        if (weight === 1) return { label: 'PRODUCTIVE', color: 'success' };
        if (weight === -1) return { label: 'NON-PRODUCTIVE', color: 'error' };
        return { label: 'NEUTRAL', color: 'default' };
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="900">
                        AI <Box component="span" color="primary.main">Classification</Box> Manager
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mt={1}>
                        Customize how ProTrackAI classifies activities for your organization
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<Science />}
                        onClick={() => setTestDialog(true)}
                    >
                        Test Classifier
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpenDialog(true)}
                    >
                        Add Rule
                    </Button>
                </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Weighted Rules</strong> override the AI's default classification. Use this to customize behavior for your organization
                (e.g., "LinkedIn is productive for HR but not for developers").
            </Alert>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                    <Psychology /> Active Weighted Rules ({Object.keys(rules).length})
                </Typography>

                {Object.keys(rules).length === 0 ? (
                    <Box textAlign="center" py={6}>
                        <Typography color="textSecondary">
                            No custom rules defined. The AI will use default classification logic.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Domain/App</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Classification</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Added</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(rules).map(([domain, rule]) => {
                                    const { label, color } = getWeightLabel(rule.weight);
                                    return (
                                        <TableRow key={domain} hover>
                                            <TableCell>
                                                <Typography fontWeight="bold">{domain}</Typography>
                                                <Button size="small" variant="text" onClick={() => window.open(`https://www.google.com/search?q=${domain} software`, '_blank')}>Search</Button>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={label} color={color} size="small" sx={{ fontWeight: 'bold' }} />
                                            </TableCell>
                                            <TableCell>{rule.reason}</TableCell>
                                            <TableCell>
                                                {new Date(rule.addedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteRule(domain)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Add Rule Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Weighted Classification Rule</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <TextField
                            label="Domain or App Name"
                            placeholder="e.g., linkedin.com or Slack"
                            value={newRule.domain}
                            onChange={(e) => setNewRule({ ...newRule, domain: e.target.value })}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Classification</InputLabel>
                            <Select
                                value={newRule.weight}
                                label="Classification"
                                onChange={(e) => setNewRule({ ...newRule, weight: e.target.value })}
                            >
                                <MenuItem value={1}>✅ Productive</MenuItem>
                                <MenuItem value={-1}>❌ Non-Productive</MenuItem>
                                <MenuItem value={0}>⚪ Neutral</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Reason (Optional)"
                            placeholder="e.g., Used for recruiting"
                            value={newRule.reason}
                            onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                            multiline
                            rows={2}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddRule}
                        variant="contained"
                        disabled={!newRule.domain || loading}
                    >
                        Add Rule
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Test Classifier Dialog */}
            <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Test AI Classifier</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <TextField
                            label="Activity Text"
                            placeholder="e.g., YouTube React Tutorial"
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Button
                            variant="contained"
                            onClick={handleTestClassification}
                            disabled={!testText || loading}
                            fullWidth
                        >
                            Classify
                        </Button>
                        {testResult && (
                            <Alert severity="info">
                                <Typography variant="body2">
                                    <strong>Input:</strong> {testResult.text}
                                </Typography>
                                <Typography variant="body2" mt={1}>
                                    <strong>Classification:</strong>{' '}
                                    <Chip
                                        label={(testResult.classification.category || testResult.classification).toUpperCase()}
                                        color={
                                            (testResult.classification.category || testResult.classification) === 'productive' ? 'success' :
                                                (testResult.classification.category || testResult.classification) === 'non-productive' ? 'error' :
                                                    'default'
                                        }
                                        size="small"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTestDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AIManagement;
