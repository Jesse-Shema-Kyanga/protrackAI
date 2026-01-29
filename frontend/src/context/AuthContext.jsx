import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Setup axios interceptor for all outgoing requests
        const interceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    setUser(null);
                } else {
                    setUser({ ...decoded, id: decoded.userId, userId: decoded.userId });
                }
            } catch (err) {
                console.warn("Invalid or malformed token format. Cleaning up...");
                localStorage.removeItem('token');
            }
        }
        setLoading(false);

        return () => axios.interceptors.request.eject(interceptor);
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser({ ...decoded, id: decoded.userId });
    };

    const logout = () => {
        // Trigger auto-clock-out (Best Effort) before clearing token
        if (user?.id) {
            const token = localStorage.getItem('token');
            axios.post('/api/time/log-time', {
                userId: user.id,
                type: 'check-out'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(err => console.warn("Auto check-out failed", err));
        }

        localStorage.removeItem('token');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];

        // Trigger Agent Logout & Shutdown
        window.location.href = 'protrack://logout';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
