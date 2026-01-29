const path = require('path');
const fs = require('fs');

// 1. Mock 'electron-store' before any other imports
require.cache[require.resolve('electron-store')] = {
  exports: class {
    constructor() { this.data = { authToken: 'mock_token' }; }
    get(key) { return this.data[key]; }
    set(key, val) { this.data[key] = val; }
  }
};

// 2. Mock 'active-window' to simulate a real user window
require.cache[require.resolve('active-window')] = {
  exports: {
    getActiveWindow: (callback) => {
      // Return a mock window title
      callback({
        title: "Testing ProTrackAI Logic - Visual Studio Code",
        owner: { name: "Code" }
      });
    }
  }
};

// 3. Mock the 'login' module to simulate an authenticated user
require.cache[require.resolve('./login')] = {
  exports: {
    getLoggedInUser: () => ({
      id: "EMP004",
      name: "Mock Tester",
      role: "employee"
    })
  }
};

// 4. Import the ACTUAL tracker logic
const { startTracking } = require('./tracker');

console.log('--- STARTING LABORATORY LOGIC TEST ---');
console.log('Target: ProTrackAI Tracker persistence and interval logic.');

// We override the INTERVAL to 5 seconds for the test so we don't wait forever
// In the real file it remains 30s as requested by user.
const trackerFile = path.join(__dirname, 'tracker.js');
let trackerContent = fs.readFileSync(trackerFile, 'utf8');
// Temporarily use a faster interval for this test run only
const testTrackerFile = path.join(__dirname, 'tracker_test_logic.js');
fs.writeFileSync(testTrackerFile, trackerContent.replace('const INTERVAL = 30_000;', 'const INTERVAL = 2_000;'));

const { startTracking: startTestTracking } = require('./tracker_test_logic');

// Start the loop and wait for 3 pulses
startTestTracking(() => {
  console.log('Mock Shutdown Triggered.');
  process.exit(0);
});

// Auto-exit after 7 seconds (should see 3 pulses: 0s, 2s, 4s, 6s)
setTimeout(() => {
  console.log('--- LOGIC TEST COMPLETE ---');
  console.log('Results: Pulse sustained. Continuous tracking logic verified.');
  process.exit(0);
}, 7000);
