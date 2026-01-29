const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        console.log(`[Auth Debug] ${req.method} ${req.url} - Header:`, authHeader ? 'Present' : 'MISSING');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            userId: decoded.userId, // Maintain for legacy
            role: decoded.role,
            team: decoded.team
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
        return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role.toLowerCase())) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = { authMiddleware, authorize };
