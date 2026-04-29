import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Box, Typography, TextField, Button, Alert, Paper,
    Checkbox, FormControlLabel, Avatar
} from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post('/api/auth/login', credentials);
            login(res.data.token);

            // Trigger Desktop Agent Deep Link (Sync & Auto-Start)
            // This tells the OS to launch the ProTrackAI agent if it's not running
            // and logs it in automatically using the provided token.
            // Trigger Desktop Agent Deep Link (Sync & Auto-Start)
            window.location.href = `protrack://auth/${res.data.token}`;

            // Wait a moment for OS/Browser handoff before navigating
            setTimeout(() => {
                const role = res.data.user.role;
                if (role === 'admin') navigate('/admin-dashboard');
                else if (role === 'hr') navigate('/hr-dashboard');
                else if (role === 'supervisor') navigate('/supervisor-dashboard');
                else navigate('/employee-dashboard');
            }, 800);
        } catch (err) {
            const data = err.response?.data;
            let msg = 'Login failed';
            if (data?.errors && Array.isArray(data.errors)) {
                msg = data.errors[0].message;
            } else {
                msg = data?.error || data?.message || 'Login failed';
            }
            setError(msg);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#121212', // Force dark background for auth
            width: '100vw'
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
                            borderTop: '4px solid #ffcc00'
                        }}
                    >
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Avatar
                                src="https://logonoid.com/images/mtn-logo.jpg"
                                sx={{ width: 64, height: 64, mb: 2, mx: 'auto', border: '2px solid #ffcc00' }}
                            />
                            <Typography component="h1" variant="h3" sx={{ color: '#ffcc00', fontWeight: '900', mb: 1 }}>
                                ProTrackAI
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#fff', textTransform: 'none', mb: 1 }}>
                                Intelligent Employee Productivity
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.6)">
                                Login to manage your performance.
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff5252' }}>{error}</Alert>}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={credentials.email}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                variant="filled"
                                InputProps={{ disableUnderline: true, sx: { borderRadius: 1, bgcolor: '#2c313c', color: '#fff' } }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                                value={credentials.password}
                                onChange={handleChange}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
                                <FormControlLabel
                                    control={<Checkbox value="remember" sx={{ color: '#666', '&.Mui-checked': { color: '#ffcc00' } }} />}
                                    label={<Typography variant="body2">Remember me</Typography>}
                                />
                                <Link to="#" style={{ color: '#ffcc00', textDecoration: 'none', fontSize: '0.875rem' }}>
                                    Forgot Password?
                                </Link>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                sx={{
                                    mt: 1,
                                    mb: 2,
                                    py: 1.8,
                                    bgcolor: '#ffcc00',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#e6b800' }
                                }}
                            >
                                Login to ProTrackAI
                            </Button>

                            <Box textAlign="center" mt={3}>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Don't have an account? <Link to="/signup" style={{ color: '#ffcc00', textDecoration: 'none', fontWeight: 'bold' }}>Sign Up</Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default Login;
