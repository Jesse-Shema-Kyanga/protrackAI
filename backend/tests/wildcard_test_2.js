const classifier = require('../ai/classifier');

const testCases = [
    // 1. AVIATION & SIMULATION (Niche Work/Hobby)
    { text: "ForeFlight - Flight Planning - KLAX to KSFO", expected: "productive" },
    { text: "Garmin Pilot - Navigation Chart", expected: "productive" },
    { text: "Microsoft Flight Simulator - In Flight", expected: "non-productive" },
    { text: "Chrome - SkyVector - World Aeronautical Charts", expected: "productive" },

    // 2. LEGAL & COMPLIANCE (Niche Work)
    { text: "Chrome - Westlaw - Case Law Search", expected: "productive" },
    { text: "Chrome - LexisNexis - Legal Research", expected: "productive" },
    { text: "Chrome - Clio - Matter Management", expected: "productive" },
    { text: "Adobe Acrobat - NDA_Final_Executed.pdf", expected: "productive" },

    // 3. SPECIALIZED ENGINEERING (Hardware/Math)
    { text: "MATLAB - filter_design.m", expected: "productive" },
    { text: "Chrome - WolframAlpha - Integral Calculation", expected: "productive" },
    { text: "Chrome - Mouser - Electronic Components", expected: "productive" },
    { text: "STMCubeIDE - main.c - Initialization", expected: "productive" },

    // 4. LIFESTYLE / HOBBIES (Non-Productive)
    { text: "Chrome - AllRecipes - Brownie Recipe", expected: "non-productive" },
    { text: "Chrome - Gardeners.com - Planting Guide", expected: "non-productive" },
    { text: "Chrome - Houzz - Home Decor Ideas", expected: "non-productive" },
    { text: "Excel - Fantasy_Football_Draft.xlsx", expected: "non-productive" },

    // 5. OBSCUER COMMS/SECURITY
    { text: "Chrome - ProtonMail - Encrypted Inbox", expected: "neutral" },
    { text: "Chrome - DuckDuckGo - Privacy Search", expected: "neutral" },
    { text: "Chrome - Tor Browser - Initializing...", expected: "neutral" },
    { text: "Chrome - NordVPN - Selection", expected: "neutral" },

    // 6. CRYPTO / FINANCE (Niche)
    { text: "Chrome - Ledger Live - Wallet sync", expected: "neutral" },
    { text: "Chrome - TradingView - BTC/USD Chart", expected: "non-productive" }, // Speculation
    { text: "Chrome - Bloomberg - Market News", expected: "productive" }, // Pro Finance
    { text: "Chrome - IRS - Tax Refund Status", expected: "neutral" },

    // 7. CONTENT CREATION (Niche)
    { text: "DaVinci Resolve - Color Grading", expected: "productive" },
    { text: "Chrome - Epidemic Sound - Royalty Free Music", expected: "productive" },
    { text: "Chrome - Canva - YouTube Thumbnail", expected: "productive" },
    { text: "Discord - Streamer Community - General", expected: "non-productive" }
];

async function runWildcardTest2() {
    console.log("🃏 RUNNING WILDCARD BLIND TEST 2 (Niche Scenarios) 🃏");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;
    await classifier.train();

    const failures = [];

    for (const test of testCases) {
        const result = await classifier.classify(test.text, [], null);
        let isMatch = result.category === test.expected;

        // Loose matching
        if (test.expected === 'neutral' && result.category === 'non-productive') isMatch = true;
        if (test.expected === 'non-productive' && result.category === 'neutral') isMatch = true;

        const statusIcon = isMatch ? "✅" : "❌";
        console.log(`${statusIcon} [${test.expected.toUpperCase()}] "${test.text.substring(0, 40)}..." → [${result.category}] (${(result.confidence * 100).toFixed(0)}% - ${result.reason})`);

        if (isMatch) {
            passed++;
        } else {
            failed++;
            failures.push({
                input: test.text,
                expected: test.expected,
                actual: result.category,
                reason: result.reason
            });
        }
    }

    console.log("\n==================================================");
    console.log(`📊 FINAL SCORE: ${passed}/${testCases.length}`);
    console.log(`🎯 ACCURACY: ${((passed / testCases.length) * 100).toFixed(2)}%`);

    if (failed > 0) {
        console.log("\n❌ FAILURES:");
        failures.forEach(f => {
            console.log(`   "${f.input}"\n   Expected: ${f.expected} | Actual: ${f.actual}\n   Reason: ${f.reason}\n   ---`);
        });
    }
}

runWildcardTest2();
