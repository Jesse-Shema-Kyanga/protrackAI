// backend/agent/login.js
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');

const store = new Store();
const API_URL = 'http://localhost:5000';

let loginWindow = null;

/**
 * Create and show login window
 */
function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 450,
    height: 550,
    resizable: false,
    frame: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'build', 'icon.png')
  });

  loginWindow.loadFile(path.join(__dirname, 'login.html'));

  // Remove menu bar
  loginWindow.setMenuBarVisibility(false);

  // Handle window close
  loginWindow.on('closed', () => {
    loginWindow = null;
  });

  // Prevent closing window (user must login or quit app)
  loginWindow.on('close', (e) => {
    // Allow close only if already logged in
    const employeeId = store.get('employeeId');
    if (!employeeId) {
      e.preventDefault();
      loginWindow.webContents.send('login-result', {
        success: false,
        error: 'You must login to use ProTrackAI Agent'
      });
    }
  });
}

/**
 * Initialize IPC handlers (must be called after app.whenReady())
 */
function initializeIPCHandlers() {
  const { ipcMain } = require('electron');

  /**
   * Handle login attempt from renderer
   */
  ipcMain.on('login-attempt', async (event, credentials) => {
    const { userId, password } = credentials;

    try {
      const loginUrl = `${API_URL}/api/auth/login`;
      console.log('Attempting login to:', loginUrl);
      console.log('With UserID:', userId);

      // Send login request with explicit JSON headers
      const response = await axios.post(loginUrl, {
        userId,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // Check for new JWT response format
      if (response.data && response.data.success && response.data.user) {
        const user = response.data.user;
        const token = response.data.token;

        // Store user data AND JWT token in electron-store
        store.set('employeeId', user.id);
        store.set('userName', user.name);
        store.set('userRole', user.role);
        store.set('userTeam', user.team || '');
        store.set('userDept', user.dept || '');
        store.set('authToken', token); // Store JWT token
        store.set('loginTime', new Date().toISOString());

        // Send success to renderer
        event.reply('login-result', {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            role: user.role
          }
        });
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      console.error('Login error:', error.message);

      let errorMessage = 'Login failed. Please try again.';

      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else if (error.response) {
        // Server responded with error
        const data = error.response.data;
        errorMessage = data.error || data.message || errorMessage;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      }


      event.reply('login-result', {
        success: false,
        error: errorMessage
      });
    }
  });

  /**
   * Handle successful login (close window)
   */
  ipcMain.on('login-success', () => {
    if (loginWindow) {
      loginWindow.close();
    }
  });

}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return !!store.get('employeeId');
}

/**
 * Get logged in user data
 */
function getLoggedInUser() {
  if (!isLoggedIn()) return null;

  return {
    id: store.get('employeeId'),
    name: store.get('userName'),
    role: store.get('userRole'),
    team: store.get('userTeam'),
    dept: store.get('userDept'),
    loginTime: store.get('loginTime')
  };
}

/**
 * Logout (clear stored credentials)
 */
function logout() {
  store.clear();
  console.log('User logged out, credentials cleared');
}

module.exports = {
  createLoginWindow,
  isLoggedIn,
  getLoggedInUser,
  logout,
  initializeIPCHandlers,
  get loginWindow() { return loginWindow; } // Added getter for live reference
};