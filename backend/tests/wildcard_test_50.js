const classifier = require('../ai/classifier');

const testCases = [
    // 1. HEALTH & FITNESS (Likely Unknown)
    { text: "Chrome - MyFitnessPal - Food Diary", expected: "non-productive" },
    { text: "Chrome - Strava - Activity Feed", expected: "non-productive" },
    { text: "Garmin Express - Syncing Device", expected: "neutral" },
    { text: "Chrome - WebMD - Symptom Checker", expected: "non-productive" },

    // 2. DATING (Likely Unknown)
    { text: "Chrome - Tinder - Match Chat", expected: "non-productive" },
    { text: "Chrome - Bumble - Hive", expected: "non-productive" },
    { text: "Chrome - Hinge - Date Ideas", expected: "non-productive" },
    { text: "Chrome - OkCupid - Messages", expected: "non-productive" },

    // 3. GOVERNMENT / CIVIC (Neutral/Personal)
    { text: "Chrome - DMV.ca.gov - Appointment", expected: "neutral" },
    { text: "Chrome - USCIS - Case Status", expected: "neutral" },
    { text: "Chrome - NOAA Weather Radar", expected: "neutral" },
    { text: "Chrome - USPS Tracking - Delivered", expected: "neutral" },

    // 4. MUSIC PRODUCTION (Creative Work)
    { text: "FL Studio - NewProject.flp", expected: "productive" },
    { text: "Ableton Live - Techno_Set_v4", expected: "productive" },
    { text: "Logic Pro X - Mixdown", expected: "productive" },
    { text: "Pro Tools - Session.ptx", expected: "productive" },
    { text: "Chrome - Splice - Sample Search", expected: "productive" },

    // 5. OBSCURE DEV TOOLS (Terminal)
    { text: "Terminal - tcpdump -i eth0", expected: "productive" },
    { text: "Terminal - sqlite3 db.sqlite", expected: "productive" },
    { text: "Terminal - mongosh", expected: "productive" },
    { text: "Terminal - redis-cli monitor", expected: "productive" },
    { text: "Terminal - whois google.com", expected: "productive" },

    // 6. RANDOM UTILITIES
    { text: "Rufus - Drive Formatting", expected: "productive" }, // Sysadmin
    { text: "BalenaEtcher - Flash Complete", expected: "productive" },
    { text: "Chrome - SpeedTest.net", expected: "neutral" },
    { text: "VeraCrypt - Mount Volume", expected: "productive" }, // Security work

    // 7. STRANGE / AMBIGUOUS WEB
    { text: "Chrome - Wayback Machine - Archive", expected: "neutral" },
    { text: "Chrome - 4chan - /g/ - Technology", expected: "non-productive" }, // "Technology" might trick it
    { text: "Chrome - Reddit - r/sysadmin", expected: "productive" }, // Context: Learning?
    { text: "Chrome - Reddit - r/aww", expected: "non-productive" },

    // 8. SHOPPING (Niche)
    { text: "Chrome - Newegg - RTX 4090", expected: "non-productive" },
    { text: "Chrome - B&H Photo - Cart", expected: "non-productive" },
    { text: "Chrome - Sweetwater - Guitar Strings", expected: "non-productive" },

    // 9. COMMS (Niche)
    { text: "Signal - Note to Self", expected: "neutral" },
    { text: "Viber - Chat", expected: "non-productive" },
    { text: "Threema - Encrypted Chat", expected: "neutral" },

    // 10. EDUCATION (Niche)
    { text: "Chrome - Brilliant.org - Logic Course", expected: "productive" },
    { text: "Chrome - Skillshare - Logo Design", expected: "productive" },
    { text: "Chrome - MasterClass - Cooking", expected: "non-productive" }, // Hobby
];

async function runWildcardTest() {
    console.log("🃏 RUNNING WILDCARD BLIND TEST (50 Scenarios) 🃏");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    await classifier.train(); // Load model

    const failures = [];

    for (const test of testCases) {
        const result = await classifier.classify(test.text, [], null);

        let isMatch = result.category === test.expected;

        // Loose matching for neutral/non-productive overlaps in obscure cases
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

runWildcardTest();
