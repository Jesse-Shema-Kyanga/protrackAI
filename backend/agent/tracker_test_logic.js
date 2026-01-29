const Store = require('electron-store');
const store = new Store();
const activeWindow = require('active-window');
const axios = require('axios');
const { getLoggedInUser } = require('./login');

const API_URL = 'http://localhost:5000/api/activities/raw';
const INTERVAL = 2_000; // 30 seconds (User Preferred)

let lastPayload = null;
let lastSentTime = 0;
let trackingActive = false;
let failureCount = 0;
const FAILURE_THRESHOLD = 2; // Shut down after 1 minute of failures (2 * 30s)

async function captureAndSend(onShutdown) {
  // PULSE HEARTBEAT: Confirms the loop is spinning
  console.log(`[Pulse] ${new Date().toLocaleTimeString()} - Checking activity...`);

  try {
    const user = getLoggedInUser();
    if (!user) {
      if (trackingActive) {
        console.log('⏸️  Tracking paused - No user logged in');
        trackingActive = false;
      }
      return;
    }

    // Capture window with a strict timeout and total error shielding
    const win = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 4000);

      try {
        activeWindow.getActiveWindow((window) => {
          clearTimeout(timeout);
          resolve(window);
        });
      } catch (e) {
        clearTimeout(timeout);
        console.error('[Tracker] Internal Capture Error:', e.message);
        resolve(null);
      }
    });

    if (!win || (!win.title && !win.owner)) {
      console.log('⚠️  Window capture returned empty/null. Skipping probe.');
    } else {
      const payload = {
        employeeId: user.id,
        app: win.owner?.name || 'Unknown',
        title: win.title || 'Untitled',
        url: win.url || null,
        timestamp: new Date().toISOString()
      };

      const token = store.get('authToken');
      await axios.post(API_URL, payload, {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      failureCount = 0;
      trackingActive = true;
      console.log(`📊 Tracked: ${payload.app} - ${payload.title.substring(0, 35)}...`);
    }

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      failureCount++;
      console.log(`📡 Backend unreachable... (Retry ${failureCount}/${FAILURE_THRESHOLD})`);

      if (failureCount >= FAILURE_THRESHOLD) {
        console.log('🛑 [Watchdog] Connection lost. Shutting down agent to save RAM.');
        if (onShutdown) onShutdown();
        else process.exit(0);
        return;
      }
    } else {
      console.error('[Tracker] Unexpected Error:', err.stack || err.message || err);
    }
  } finally {
    // RESCHEDULE: Clear existing to prevent double-scheduling if poked
    if (global.nextProbe) clearTimeout(global.nextProbe);
    global.nextProbe = setTimeout(() => captureAndSend(onShutdown), INTERVAL);
  }
}

function startTracking(onShutdown) {
  if (trackingStarted) return;
  trackingStarted = true;

  console.log(`🚀 ProTrackAI Pulse started (Interval: ${INTERVAL / 1000}s)`);

  // Start the first one immediately
  captureAndSend(onShutdown);
}

/**
 * Force an immediate capture (e.g. on Login)
 */
function poke() {
  console.log('🔔 [Poke] High-priority probe requested.');
  captureAndSend();
}

module.exports = { startTracking, poke };