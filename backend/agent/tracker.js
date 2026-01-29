const Store = require('electron-store');
const store = new Store();
const axios = require('axios');
const { getLoggedInUser } = require('./login');
const { getActiveWindow } = require('./utils/win_capture');

const API_URL = 'http://localhost:5000/api/activities/raw';
const INTERVAL = 30_000; // 30 seconds

let trackingActive = false;
let failureCount = 0;
const FAILURE_THRESHOLD = 20; // Increased from 2 to handle system lag
let trackingStarted = false;

// ✅ CRITICAL: Store the shutdown callback globally so poke() can use it
let shutdownCallback = null;

async function captureAndSend() {
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

    // ✅ FIX: Don't track supervisors (Case-insensitive)
    if (user.role && user.role.toLowerCase() === 'supervisor') {
      if (trackingActive) {
        console.log('⏸️  Tracking disabled for Supervisors');
        trackingActive = false;
      }
      return;
    }

    // Capture window
    const win = await getActiveWindow();

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
        timeout: 30000, // Increased to 30s to tolerate lag
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
        if (shutdownCallback) {
          shutdownCallback();
        } else {
          process.exit(0);
        }
        return;
      }
    } else {
      console.error('[Tracker] Unexpected Error:', err.stack || err.message || err);
    }
  } finally {
    // ✅ FIXED: Always reschedule using the stored callback
    if (global.nextProbe) clearTimeout(global.nextProbe);
    global.nextProbe = setTimeout(() => captureAndSend(), INTERVAL);
    console.log(`[Pulse] Next capture scheduled for ${new Date(Date.now() + INTERVAL).toLocaleTimeString()}`);
  }
}

function startTracking(onShutdown) {
  if (trackingStarted) {
    console.log('⚠️  Tracking already started. Ignoring duplicate call.');
    return;
  }
  trackingStarted = true;

  // ✅ CRITICAL: Store the callback globally
  shutdownCallback = onShutdown;

  console.log(`🚀 ProTrackAI Pulse started (Interval: ${INTERVAL / 1000}s)`);
  captureAndSend();
}

/**
 * Force an immediate capture (e.g. on Login)
 * ✅ FIXED: Now works correctly with the loop
 */
function poke() {
  console.log('🔔 [Poke] High-priority probe requested.');

  // Clear any pending probe to avoid double-capture
  if (global.nextProbe) {
    clearTimeout(global.nextProbe);
    console.log('[Poke] Cleared pending probe to prioritize immediate capture.');
  }

  // Trigger immediate capture (loop continues via finally block)
  captureAndSend();
}

module.exports = { startTracking, poke };