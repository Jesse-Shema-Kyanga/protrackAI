// API Configuration
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://your-production-api.com'; // Update with your production URL

// Authentication helpers
const Auth = {
    // Get stored token
    getToken() {
        return localStorage.getItem('authToken');
    },

    // Save token
    setToken(token) {
        localStorage.setItem('authToken', token);
    },

    // Remove token
    clearToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },

    // Get current user
    getUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Save user data
    setUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    // Check if logged in
    isLoggedIn() {
        return !!this.getToken();
    },

    // Logout
    logout() {
        this.clearToken();
        window.location.href = 'login.html';
    }
};

// Fetch with automatic auth headers
async function apiFetch(url, options = {}) {
    const token = Auth.getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add auth header if token exists (except for login/signup)
    if (token && !url.includes('/login') && !url.includes('/signup')) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
        Auth.clearToken();
        if (!window.location.pathname.includes('login.html')) {
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
        }
        throw new Error('Unauthorized');
    }

    return response;
}

// Show user-friendly error message
function showError(message) {
    // You can replace this with a toast notification library
    alert(`Error: ${message}`);
}

// Show success message
function showSuccess(message) {
    // You can replace this with a toast notification library
    alert(message);
}
