const electron = require('electron');
console.log('Electron object keys:', Object.keys(electron));
console.log('App object:', electron.app);

if (!electron.app) {
    console.error('CRITICAL: electron.app is undefined!');
    process.exit(1);
} else {
    console.log('SUCCESS: electron.app is present.');
    electron.app.quit();
}
