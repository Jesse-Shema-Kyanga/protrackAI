const classifier = require('./classifier');

async function test() {
    // await classifier.initialize(); // Already initialized in instance usually, but let's check

    const testCases = [
        "Terminal - nodemon server.js",
        "Windows PowerShell",
        "Command Prompt - ping google.com",
        "cmd.exe",
        "bash - /usr/bin/bash",
        "zsh -- autocompletion",
        "iTerm2 - ssh prod-server",
        "warp-terminal"
    ];

    console.log("=== Terminal Accuracy Audit ===");
    for (const text of testCases) {
        const res = await classifier.classify(text);
        console.log(`[TEST] "${text}" -> ${res.category.toUpperCase()} (${(res.confidence * 100).toFixed(0)}%) - Reason: ${res.reason}`);
    }
}

test();
