const classifier = require('../ai/classifier');

// "Unseen" test cases that were NOT in the original benchmark
// This proves that the fixes are general improvements, not just overfitting patches.
const generalizationTests = [
    // 1. General Developer Tools (Fix: added 'yarn', 'pnpm' generic support, not just 'npm')
    { text: "Terminal - yarn start", expected: "productive", reason: "Should recognize yarn as dev tool" },
    { text: "PowerShell - pnpm run build", expected: "productive", reason: "Should recognize pnpm as dev tool" },
    { text: "CMD - pip install tensorflow", expected: "productive", reason: "Should recognize pip as dev tool" },

    // 2. General Job Search (Fix: added 'job search' keywords, not just 'LinkedIn')
    { text: "Chrome - Glassdoor Job Search Software Engineer", expected: "productive", reason: "Should recognize generic job search" },
    { text: "Chrome - Indeed.com Java Developer Hiring", expected: "productive", reason: "Should recognize hiring keywords" },
    { text: "Chrome - Careers at Google - Apply Now", expected: "productive", reason: "Should recognize careers page" },

    // 3. General Social Feeds (Fix: added 'feed' keyword, not just 'Facebook')
    { text: "Chrome - Twitter Home Feed", expected: "non-productive", reason: "Should recognize 'feed' pattern" },
    { text: "Chrome - Instagram Stories and Feed", expected: "non-productive", reason: "Should recognize 'feed' pattern" },

    // 4. Content-Based Reddit (Fix: removed reddit blocklist, rely on ML/Keywords)
    { text: "Chrome - Reddit r/learnpython Help with Loops", expected: "productive", reason: "Context (python/help) should override app name" },
    { text: "Chrome - Reddit r/ProgrammerHumor Funny Memes", expected: "non-productive", reason: "Context (funny/memes) should flag as entertainment" }
];

async function runGeneralizationTest() {
    console.log('🧪 Running Generalization/Robustness Test...\n');

    // Initialize
    await classifier.train();

    let passed = 0;
    let failed = 0;

    for (const test of generalizationTests) {
        // Run classification
        const result = await classifier.classify(test.text, [], null);

        const success = result.category === test.expected;
        const icon = success ? '✅' : '❌';

        console.log(`${icon} "${test.text}"`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Actual:   ${result.category} (${(result.confidence * 100).toFixed(0)}% - ${result.reason})`);

        if (success) passed++;
        else failed++;
        console.log('---');
    }

    console.log(`\n📊 Results: ${passed}/${generalizationTests.length} Passed`);

    if (failed === 0) {
        console.log('🏆 SUCCESS: Fixes are general and robust!');
    } else {
        console.log('⚠️ WARNING: Some edge cases failed.');
    }
}

runGeneralizationTest();
