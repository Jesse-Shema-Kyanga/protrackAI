const { app } = require('electron');
const path = require('path');

const PROTOCOL = 'protrack';

app.whenReady().then(() => {
    console.log('[Protocol Tool] Registering "protrack://" protocol...');

    const projectPath = path.resolve(__dirname, 'main.js');
    const electronPath = process.execPath;

    if (process.platform === 'win32') {
        app.setAsDefaultProtocolClient(PROTOCOL, electronPath, [projectPath]);
        console.log('[Protocol Tool] Registry updated for Windows.');
        console.log('[Protocol Tool] Path:', electronPath);
        console.log('[Protocol Tool] Args:', projectPath);
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL);
        console.log('[Protocol Tool] Protocol registered.');
    }

    console.log('[Protocol Tool] Done! You can now close this terminal.');
    setTimeout(() => app.quit(), 2000);
});
