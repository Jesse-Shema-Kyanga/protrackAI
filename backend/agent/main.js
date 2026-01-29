const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { startTracking, poke } = require('./tracker');
const { createLoginWindow, isLoggedIn, getLoggedInUser, logout, initializeIPCHandlers } = require('./login');

const PROTOCOL = 'protrack';

function extractToken(argv) {
  console.log('[Agent] Parsing startup args:', JSON.stringify(argv));
  const authPrefix = `${PROTOCOL}://auth/`;
  const logoutPrefix = `${PROTOCOL}://logout`;

  // Priority 1: Logout 
  if (argv.find(arg => arg && arg.startsWith(logoutPrefix))) {
    return 'logout';
  }

  // Priority 2: Auth token
  const urlArg = argv.find(arg => arg && typeof arg === 'string' && arg.startsWith(authPrefix));
  if (urlArg) {
    return urlArg.replace(authPrefix, '').replace(/\/$/, '');
  }
  return null;
}

// 1. REGISTER PROTOCOL IMMEDIATELY (Before 'ready')
// This is critical for Windows to recognize the custom URI scheme
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Agent] Another instance is already running. Quitting.');
  app.quit();
  return;
}

let tray = null;

// Handle second instance launch (Deep Link)
app.on('second-instance', (event, commandLine) => {
  console.log('[Agent] Second instance triggered with command line:', commandLine);
  const { loginWindow } = require('./login');
  if (loginWindow) {
    if (loginWindow.isMinimized()) loginWindow.restore();
    loginWindow.focus();
  }
  const token = extractToken(commandLine);
  if (token) {
    console.log('[Agent] Deep link token received via second instance.');
    handleDeepLink(token);
  }
});

app.whenReady().then(() => {
  console.log(`[Agent] ${new Date().toLocaleTimeString()} - Waking up...`);
  // The instruction provided `createTray();'[Agent] App Ready. Initializing...');` which is syntactically incorrect.
  // Assuming the intent was to add `createTray()` and keep the existing log,
  // but since `createTray` is not defined, and to avoid breaking the code,
  // only the new log line is added as per the most sensible interpretation of "boot log".
  // The original `console.log` line is kept as it is.
  console.log('[Agent] App Ready. Initializing...');

  // Initialize IPC handlers
  initializeIPCHandlers();

  // System tray icon initialization with robust fallback
  try {
    const iconPath = path.join(__dirname, 'build', 'icon.png');
    console.log('[Agent] Loading tray icon from:', iconPath);
    tray = new Tray(iconPath);
    updateTrayMenu();
  } catch (err) {
    console.error('[Agent] Failed to create Tray icon:', err.message);
    // Fallback or just continue (app still runs in headless mode)
  }

  // Auto-start on Windows login
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  });

  // Check if we were launched via protocol (Deep Link) - check all args
  const startupToken = extractToken(process.argv);
  if (startupToken) {
    console.log('[Agent] Initial launch via Deep Link. Authenticating...');
    handleDeepLink(startupToken);
  } else if (isLoggedIn()) {
    const user = getLoggedInUser();
    console.log(`Already logged in as ${user.name} (${user.id})`);
    updateTrayMenu();
    startTracking(() => app.quit());
  } else {
    console.log('No user logged in. Waiting for Deep Link (protrack://) from Web Dashboard...');
    // createLoginWindow(); // Disabled to allow seamless web-based login
  }
});

/**
 * Update tray menu based on login state
 */
function updateTrayMenu() {
  const user = getLoggedInUser();

  if (user) {
    // User is logged in
    tray.setToolTip(`ProTrackAI - Tracking for ${user.name}`);

    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: `Logged in as ${user.name}`,
        enabled: false
      },
      {
        label: `Role: ${user.role}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'View My Dashboard',
        click: () => {
          shell.openExternal('http://localhost:3000/employee-dashboard.html');
        }
      },
      { type: 'separator' },
      {
        label: 'Logout',
        click: () => {
          logout();
          createLoginWindow();
          updateTrayMenu();
        }
      },
      {
        label: 'Quit Agent',
        click: () => app.quit()
      }
    ]));
  } else {
    // No user logged in
    tray.setToolTip('ProTrackAI - Not logged in');

    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Not logged in',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Login',
        click: () => createLoginWindow()
      },
      {
        label: 'Quit Agent',
        click: () => app.quit()
      }
    ]));
  }
}

// Keep process alive even when no windows
app.on('window-all-closed', () => { });

// Better error logging for debugging
process.on('uncaughtException', (err) => {
  console.error('[Agent CRITICAL] Uncaught:', err.stack || err || 'No error details');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Agent CRITICAL] Rejection:', reason?.stack || reason || 'No reason details');
});

// Export for use in other modules
module.exports = { updateTrayMenu };

// --- REFACTORED DEEP LINK LOGIC ---
function handleDeepLink(token) {
  if (token === 'logout') {
    console.log('[Agent] Remote Logout Signal Received. Quitting...');
    logout();
    app.quit();
    return;
  }

  console.log('[Agent] Handling sync for token:', token.substring(0, 10) + '...');
  const axios = require('axios');
  const API_URL = 'http://localhost:5000';

  axios.get(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000
  }).then(response => {
    if (response.data) {
      const user = response.data;
      const Store = require('electron-store');
      const s = new Store();

      s.set('employeeId', user.id);
      s.set('userName', user.name);
      s.set('userRole', user.role);
      s.set('authToken', token);
      s.set('loginTime', new Date().toISOString());

      console.log(`[Agent] Sync Success: Logged in as ${user.name}`);

      // Refresh UI and start/poke
      if (require('./login').loginWindow) require('./login').loginWindow.close();
      updateTrayMenu();
      startTracking(() => app.quit()); // Pass shutdown callback

      // Force an immediate probe so the user sees results instantly
      poke();
    }
  }).catch(err => {
    console.error('[Agent] Sync Validation Failed:', err.message);
  });
}