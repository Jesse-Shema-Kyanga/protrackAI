const classifier = require('../ai/classifier');

const testCases = [
    // 1. RWANDAN GOV / SERVICES (Admin/Neutral)
    { text: "Irembo - Application for Birth Certificate", expected: "neutral" },
    { text: "Rwanda Revenue Authority - E-Tax Login", expected: "neutral" },
    { text: "RURA - License Renewal Status", expected: "neutral" },
    { text: "Chrome - RSSB - Pension Scheme", expected: "neutral" },

    // 2. REGIONAL BANKING / FINANCE (Neutral)
    { text: "Bank of Kigali - Internet Banking", expected: "neutral" },
    { text: "MTN MoMo - Web Portal - Payment", expected: "neutral" },
    { text: "Chrome - Cogebanque - Transfer", expected: "neutral" },

    // 3. REGIONAL NEWS (Non-Productive/Neutral)
    { text: "Chrome - The New Times - Rwanda News", expected: "non-productive" },
    { text: "Chrome - IGIHE - Amakuru Mashya", expected: "non-productive" }, // Kinyarwanda
    { text: "Chrome - Umuseke - Imyidagaduro", expected: "non-productive" },

    // 4. MULTILINGUAL TITLES (Translation Generalization)
    { text: "Actualités - France 24 - Direct", expected: "non-productive" }, // French for News
    { text: "Imyidagaduro - Video - YouTube", expected: "non-productive" }, // Kinyarwanda for Entertainment
    { text: "Amakuru - Rwanda Online", expected: "non-productive" }, // Kinyarwanda for News

    // 5. OBSCURE LOCAL TOOLS
    { text: "Kinyarwanda Dictionary - Shaka Ijambo", expected: "productive" },
    { text: "Chrome - Rwanda Governance Board - Reports", expected: "productive" },

    // 6. GLOBAL MISC
    { text: "Chrome - Al Jazeera - Breaking News", expected: "non-productive" },
    { text: "Chrome - South China Morning Post", expected: "non-productive" },
    { text: "Chrome - Deutsche Welle - World News", expected: "non-productive" }
];

async function runWildcardTest3() {
    console.log("🌍 RUNNING WILDCARD BLIND TEST 3 (Regional & Multilingual) 🌍");
    console.log("==========================================================");

    let passed = 0;
    let failed = 0;
    await classifier.train(); // Should load from disk if Test 2 finished

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

    console.log("\n==========================================================");
    console.log(`📊 FINAL SCORE: ${passed}/${testCases.length}`);
    console.log(`🎯 ACCURACY: ${((passed / testCases.length) * 100).toFixed(2)}%`);

    if (failed > 0) {
        console.log("\n❌ FAILURES:");
        failures.forEach(f => {
            console.log(`   "${f.input}"\n   Expected: ${f.expected} | Actual: ${f.actual}\n   Reason: ${f.reason}\n   ---`);
        });
    }
}

runWildcardTest3();
