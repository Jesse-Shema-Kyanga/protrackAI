const classifier = require('./ai/classifier');

async function testAI() {
    try {
        console.log('--- Stress Testing AI Classifier ---');

        // 1. Train
        console.log('1. Training Enhanced Model...');
        const start = Date.now();
        await classifier.train();
        console.log(`   Training took ${Date.now() - start}ms`);

        // 2. Extensive Test Predictions
        const testCases = [
            // Easy Wins (Keywords)
            { input: 'Visual Studio Code - server.js', expected: 'productive' },
            { input: 'Jira - Board - ProTrack', expected: 'productive' },
            { input: 'YouTube - Top 10 Cats', expected: 'non-productive' },
            { input: 'Netflix', expected: 'non-productive' },
            { input: 'Fortnite Client', expected: 'non-productive' },

            // Subtle Productive
            { input: 'Slack | #dev-team | 3 new mentions', expected: 'productive' },
            { input: 'Pull Request #45 - Fix Login', expected: 'productive' },
            { input: 'Document1 - Word', expected: 'productive' },
            { input: 'Figma - Dashboard UI', expected: 'productive' },
            { input: 'StackOverflow - How to center div', expected: 'productive' },
            { input: 'YouTube - ReactJS Full Course for Beginners', expected: 'productive' }, // NEW: Tutorial Edge Case
            { input: 'YouTube - Funny Cats', expected: 'non-productive' }, // Standard Distraction

            // Subtle Non-Productive
            { input: 'Twitch - Live: Valorant', expected: 'non-productive' },
            { input: 'Steam - Library', expected: 'non-productive' },
            { input: 'Facebook - Welcome', expected: 'non-productive' },
            { input: 'Cheap Deals - Amazon', expected: 'non-productive' },

            // Neutral / Ambiguous (Should default to neutral OR correct class if strong)
            { input: 'New Tab', expected: 'neutral' },
            { input: 'File Explorer', expected: 'neutral' },
            { input: 'Settings', expected: 'neutral' },
            { input: 'Calculator', expected: 'neutral' },

            // Edge Cases
            { input: 'random nonsense string xyz', expected: 'neutral' }, // High confidence threshold should catch this
            { input: 'Untitled - Notepad', expected: 'neutral' }
        ];

        console.log('\n2. Running Predictions...');
        let passed = 0;

        for (const test of testCases) {
            const result = await classifier.classify(test.input);
            const isMatch = result === test.expected;
            if (isMatch) passed++;

            console.log(`   Input: "${test.input}"`);
            const status = isMatch ? '✅' : '❌';
            console.log(`   Predicted: ${result.padEnd(15)} | Expected: ${test.expected.padEnd(15)} | ${status}`);
        }

        const accuracy = Math.round((passed / testCases.length) * 100);
        console.log(`\nResults: ${passed}/${testCases.length} passed (${accuracy}% Accuracy).`);

        if (accuracy === 100) {
            console.log('SUCCESS: AI Classifier is PERFECT! 🚀');
        } else {
            console.log('FAILURE: Still some errors to fix.');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

testAI();
