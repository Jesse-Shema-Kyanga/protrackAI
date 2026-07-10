require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const classifier = require('./ai/classifier');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - secure whitelist
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));

// 1. Database Connection (Standard Singleton)
// connectDB() is called inside startServer() below to ensure sequence.

// API Routes with logging (file logging only in development to avoid issues on ephemeral cloud filesystems)
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    const fs = require('fs');
    const debugLogPath = path.join(__dirname, 'debug_api.log');
    app.use((req, res, next) => {
        const start = Date.now();
        const originalJson = res.json;
        res.json = function (data) {
            const duration = Date.now() - start;
            const logMsg = `\n[${new Date().toISOString()}] ${req.method} ${req.url} - Duration: ${duration}ms\nResponse: ${JSON.stringify(data).substring(0, 500)}\n`;
            fs.appendFileSync(debugLogPath, logMsg);
            return originalJson.call(this, data);
        };
        next();
    });
}

app.get('/', (req, res) => res.send('ProTrackAI Backend Live! 🚀'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/evals', require('./routes/evals'));
app.use('/api/time', require('./routes/time'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/org', require('./routes/org'));

// Serve uploaded documents statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Catch-all for unhandled /api routes
app.use('/api', (req, res) => {
    console.log(`404 at API route: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        error: message
    });
});

// Start Server & Socket.io
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Store io instance globally so routes can use it
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Join room based on role/id (for targeted alerts)
    socket.on('join', (room) => {
        socket.join(room); // e.g., 'supervisor-team-A'
    });
});

const spawnAgent = () => {
    if (process.env.NODE_ENV === 'production') return;

    try {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');

        const agentDir = path.join(__dirname, 'agent');
        const logPath = path.join(__dirname, 'agent.log');

        // Use RELATIVE path to the binary from agentDir
        const electronCmd = path.join('node_modules', '.bin', 'electron.cmd');

        const logStream = fs.createWriteStream(logPath, { flags: 'a' });
        logStream.write(`\n--- Server Start: ${new Date().toISOString()} ---\n`);

        console.log('[Agent Launcher] Waking up ProTrackAI Agent (Safe Mode)...');

        // Spawning with cwd: agentDir means 'node_modules' is resolved locally.
        // This completely avoids the "D:\Offshore New Query" space problem.
        const agent = spawn(electronCmd, ['main.js'], {
            cwd: agentDir,
            shell: true,
            stdio: 'pipe'
        });

        agent.stdout.pipe(logStream);
        agent.stderr.pipe(logStream);

        agent.on('error', (err) => {
            console.error('[Agent Launcher] Process Start Error:', err.message);
        });

    } catch (err) {
        console.warn('[Agent Launcher] Spawner Failed:', err.message);
    }
};

const startServer = async () => {
    try {
        await connectDB();

        // Train AI Model
        await classifier.train();

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            // Give server a second to settle before spawning agent
            setTimeout(spawnAgent, 2000);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();