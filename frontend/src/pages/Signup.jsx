import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Box, Typography, TextField, Button, Alert, Paper, MenuItem, Avatar
} from '@mui/material';
import axios from 'axios';

const Signup = () => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'employee',
        team: '',
        dept: '',
        pos: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.id || !formData.name || !formData.email || !formData.password) {
            setError('All fields are required');
            return;
        }

        try {
            await axios.post('/api/auth/signup', formData);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors && Array.isArray(data.errors)) {
                setError(data.errors[0].message);
            } else {
                setError(data?.error || data?.message || 'Registration failed');
            }
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#121212',
            width: '100vw',
            py: 4
        }}>
            <Container component="main" maxWidth="xs">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            width: '100%',
                            borderRadius: 2,
                            bgcolor: '#1a1e26',
                            color: '#fff',
                            textAlign: 'center'
                        }}
                    >
                        <Avatar
                            src="https://logonoid.com/images/mtn-logo.jpg"
                            sx={{ width: 80, height: 80, mb: 3, mx: 'auto', border: '3px solid #ffcc00' }}
                        />

                        <Typography component="h1" variant="h4" sx={{ fontWeight: '900', mb: 4, color: '#fff' }}>
                            Create Your Account
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff5252' }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' }}>{success}</Alert>}

                        <Box component="form" method="POST" onSubmit={handleSubmit} noValidate sx={{ textAlign: 'left' }}>
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="id"
                                label="Employee ID"
                                name="id"
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={formData.id}
                                onChange={handleChange}
                                placeholder="e.g. EMP001"
                            />
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                name="name"
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={formData.name}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="email"
                                label="Work Email"
                                name="email"
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={formData.password}
                                onChange={handleChange}
                            />
                            {/* Roles & Teams will be assigned by Administrator */}

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                sx={{
                                    mt: 4,
                                    mb: 2,
                                    py: 1.8,
                                    bgcolor: '#ffcc00',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#e6b800' }
                                }}
                            >
                                Sign Up
                            </Button>

                            <Box textAlign="center" mt={2}>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Already have an account? <Link to="/login" style={{ color: '#ffcc00', textDecoration: 'none', fontWeight: 'bold' }}>Log In</Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default Signup;
