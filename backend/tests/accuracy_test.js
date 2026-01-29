/**
 * ProTrackAI Classifier Accuracy Benchmark Test
 * 
 * Tests 100 real-world scenarios to verify 95%+ accuracy
 * 
 * Run: node backend/tests/accuracy_test.js
 */

const classifier = require('../ai/classifier');

// 100 Test Cases covering all enhancement layers
const testCases = [
    // ========================================
    // DOMAIN EXTRACTION TESTS (20 cases)
    // ========================================
    { text: "Chrome - GitHub Pull Request - github.com/user/repo", expected: "productive", category: "Domain Match" },
    { text: "Firefox - GitLab Merge Request - gitlab.com/project", expected: "productive", category: "Domain Match" },
    { text: "Edge - Stack Overflow JavaScript Question - stackoverflow.com", expected: "productive", category: "Domain Match" },
    { text: "Chrome - localhost:3000 React App - localhost:3000", expected: "productive", category: "Domain Match" },
    { text: "Chrome - AWS Console EC2 - console.aws.amazon.com", expected: "productive", category: "Domain Match" },
    { text: "Chrome - Vercel Deployment - vercel.com/dashboard", expected: "productive", category: "Domain Match" },
    { text: "Chrome - FlixHQ Watch Series - flixhq.to/watch/walking-dead", expected: "non-productive", category: "Domain Match" },
    { text: "Firefox - Netflix Stranger Things - netflix.com/watch", expected: "non-productive", category: "Domain Match" },
    { text: "Chrome - Soap2Day Movie Stream - soap2day.to", expected: "non-productive", category: "Domain Match" },
    { text: "Edge - 123Movies Free Streaming - 123movies.com", expected: "non-productive", category: "Domain Match" },
    { text: "Chrome - Twitch Gaming Stream - twitch.tv/shroud", expected: "non-productive", category: "Domain Match" },
    { text: "Firefox - TikTok For You Page - tiktok.com", expected: "non-productive", category: "Domain Match" },
    { text: "Chrome - Figma Design System - figma.com/file/design", expected: "productive", category: "Domain Match" },
    { text: "Chrome - Jira Sprint Board - jira.atlassian.com", expected: "productive", category: "Domain Match" },
    { text: "Chrome - MongoDB Compass localhost - localhost:27017", expected: "productive", category: "Domain Match" },
    { text: "Chrome - YouTube Music Playlist - music.youtube.com", expected: "non-productive", category: "Domain Match" },
    { text: "Chrome - Reddit Memes - reddit.com/r/memes", expected: "non-productive", category: "Domain Match" },
    { text: "Chrome - ChatGPT Conversation - chatgpt.com", expected: "productive", category: "Domain Match" },
    { text: "Chrome - Claude AI Assistant - claude.ai", expected: "productive", category: "Domain Match" },
    { text: "Chrome - Instagram Feed - instagram.com", expected: "non-productive", category: "Domain Match" },

    // ========================================
    // KNOWN APPS DATABASE TESTS (15 cases)
    // ========================================
    { text: "Visual Studio Code - main.js editing", expected: "productive", category: "Known App" },
    { text: "PyCharm - Python Django debugging", expected: "productive", category: "Known App" },
    { text: "WebStorm - React component development", expected: "productive", category: "Known App" },
    { text: "Docker Desktop - Container running", expected: "productive", category: "Known App" },
    { text: "Postman - API endpoint testing", expected: "productive", category: "Known App" },
    { text: "Slack - Team channel discussion", expected: "productive", category: "Known App" },
    { text: "Microsoft Teams - Video meeting", expected: "productive", category: "Known App" },
    { text: "Zoom - Client presentation", expected: "productive", category: "Known App" },
    { text: "Steam - Game Library", expected: "non-productive", category: "Known App" },
    { text: "Epic Games Launcher - Fortnite", expected: "non-productive", category: "Known App" },
    { text: "Spotify - Playlist streaming", expected: "non-productive", category: "Known App" },
    { text: "Discord - Gaming server chat", expected: "non-productive", category: "Known App" },
    { text: "League of Legends - Ranked match", expected: "non-productive", category: "Known App" },
    { text: "Valorant - Competitive game", expected: "non-productive", category: "Known App" },
    { text: "Minecraft - Survival mode", expected: "non-productive", category: "Known App" },

    // ========================================
    // ENTERTAINMENT FILE PATTERNS (10 cases)
    // ========================================
    { text: "VLC - The Walking Dead S11E24 1080p BluRay", expected: "non-productive", category: "File Pattern" },
    { text: "Media Player - Breaking Bad S05E16 HDTV", expected: "non-productive", category: "File Pattern" },
    { text: "VLC - Game of Thrones S08E06 2160p WEB", expected: "non-productive", category: "File Pattern" },
    { text: "Windows Media - Avengers Endgame 2019 1080p", expected: "non-productive", category: "File Pattern" },
    { text: "VLC - Spider-Man No Way Home 2021 720p", expected: "non-productive", category: "File Pattern" },
    { text: "Media Player - [SubsPlease] One Piece 1080 1080p", expected: "non-productive", category: "File Pattern" },
    { text: "VLC - [HorribleSubs] Naruto Shippuden 720p", expected: "non-productive", category: "File Pattern" },
    { text: "MPC - The Office US S03E15 xvid", expected: "non-productive", category: "File Pattern" },
    { text: "VLC - Friends S10E18 720p BrRip", expected: "non-productive", category: "File Pattern" },
    { text: "Media Player - John Wick Chapter 4 2023 WebRip", expected: "non-productive", category: "File Pattern" },

    // ========================================
    // WORK KEYWORD SIGNALS (15 cases)
    // ========================================
    { text: "Chrome - React Hooks Tutorial Documentation", expected: "productive", category: "Work Keywords" },
    { text: "Firefox - Python Django Rest Framework Guide", expected: "productive", category: "Work Keywords" },
    { text: "Chrome - JavaScript API Documentation MDN", expected: "productive", category: "Work Keywords" },
    { text: "Edge - TensorFlow Tutorial Machine Learning", expected: "productive", category: "Work Keywords" },
    { text: "Chrome - Docker Kubernetes Deployment Guide", expected: "productive", category: "Work Keywords" },
    { text: "Terminal - git commit push origin main", expected: "productive", category: "Work Keywords" },
    { text: "PowerShell - npm install package dependencies", expected: "productive", category: "Work Keywords" },
    { text: "CMD - python manage.py migrate database", expected: "productive", category: "Work Keywords" },
    { text: "WSL Ubuntu - sudo apt install build-essential", expected: "productive", category: "Work Keywords" },
    { text: "Chrome - AWS Lambda Function Tutorial", expected: "productive", category: "Work Keywords" },
    { text: "Excel - Sales Forecast Quarterly Revenue", expected: "productive", category: "Work Keywords" },
    { text: "Word - Annual Report 2024 Draft", expected: "productive", category: "Work Keywords" },
    { text: "PowerPoint - Client Presentation Deck", expected: "productive", category: "Work Keywords" },
    { text: "Outlook - Budget Approval Email Reply", expected: "productive", category: "Work Keywords" },
    { text: "OneNote - Meeting Notes Team Brainstorm", expected: "productive", category: "Work Keywords" },

    // ========================================
    // AMBIGUOUS CONTEXT-DEPENDENT (15 cases)
    // ========================================
    { text: "Chrome - YouTube TensorFlow Tutorial Series", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - YouTube React Hooks Complete Guide", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - YouTube Funny Cat Compilation", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - YouTube Music Video Official", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - YouTube Gaming Montage Highlights", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - Reddit r/programming Best Practices", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - Reddit r/webdev Career Advice", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - Reddit r/memes Funny Posts", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - Reddit r/gaming Discussion", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - Reddit r/funny Top Posts", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - LinkedIn Job Search Software Engineer", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - LinkedIn Recruiter Candidate Search", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - LinkedIn Feed Scrolling News", expected: "non-productive", category: "Ambiguous" },
    { text: "Chrome - Medium JavaScript Performance Article", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - Medium Random Life Advice Story", expected: "non-productive", category: "Ambiguous" },

    // ========================================
    // ROLE-BASED CLASSIFICATION (10 cases)
    // ========================================
    { text: "Chrome - Facebook Ads Manager Campaign", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - Instagram Business Insights", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - LinkedIn Recruiter Search", expected: "productive", category: "Role-Based", role: "hr" },
    { text: "Chrome - LinkedIn Sales Navigator", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - Hootsuite Social Media Schedule", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - Buffer Post Scheduling", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - MailChimp Email Campaign", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - HubSpot CRM Dashboard", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - Meta Business Suite Analytics", expected: "productive", category: "Role-Based", role: "marketing" },
    { text: "Chrome - Facebook News Feed Scrolling", expected: "non-productive", category: "Role-Based", role: "employee" },

    // ========================================
    // SYSTEM/NEUTRAL APPS (10 cases)
    // ========================================
    { text: "File Explorer - Documents Folder", expected: "neutral", category: "System" },
    { text: "Calculator - Math Calculations", expected: "neutral", category: "System" },
    { text: "Settings - System Preferences", expected: "neutral", category: "System" },
    { text: "Task Manager - Process Monitor", expected: "neutral", category: "System" },
    { text: "Notepad - Blank Document", expected: "neutral", category: "System" },
    { text: "Control Panel - Windows Settings", expected: "neutral", category: "System" },
    { text: "Windows Defender - Security Scan", expected: "neutral", category: "System" },
    { text: "Calendar - Date Viewing", expected: "neutral", category: "System" },
    { text: "Clock - Time Display", expected: "neutral", category: "System" },
    { text: "Paint - Untitled Drawing", expected: "neutral", category: "System" },

    // ========================================
    // N-GRAM MULTI-WORD CONCEPTS (5 cases)
    // ========================================
    { text: "Visual Studio Code - React Component", expected: "productive", category: "N-Gram" },
    { text: "GitHub Actions - CI CD Pipeline Build", expected: "productive", category: "N-Gram" },
    { text: "Google Drive - Project Files Collaboration", expected: "productive", category: "N-Gram" },
    { text: "Call of Duty - Warzone Battle Royale", expected: "non-productive", category: "N-Gram" },
    { text: "Grand Theft Auto - Online Mission", expected: "non-productive", category: "N-Gram" },
];

// Run benchmark test
async function runBenchmark() {
    console.log('\n🧪 ========================================');
    console.log('  ProTrackAI Classifier Accuracy Test');
    console.log('  Target: 95%+ Accuracy');
    console.log('========================================\n');

    let totalTests = testCases.length;
    let passed = 0;
    let failed = 0;
    const failures = [];
    const categoryStats = {};

    console.log(`Running ${totalTests} test cases...\n`);

    // Initialize Classifier (Load Model & Rules)
    console.log('🔄 Loading Classifier Model...');
    await classifier.train();
    console.log('✅ Classifier Loaded!\n');

    for (const test of testCases) {
        const result = await classifier.classify(test.text, [], test.role || null);
        const category = result.category;
        const success = category === test.expected;

        if (success) {
            passed++;
        } else {
            failed++;
            failures.push({
                text: test.text,
                expected: test.expected,
                actual: category,
                category: test.category
            });
        }

        // Track category stats
        if (!categoryStats[test.category]) {
            categoryStats[test.category] = { total: 0, passed: 0 };
        }
        categoryStats[test.category].total++;
        if (success) categoryStats[test.category].passed++;
    }

    // Calculate accuracy
    const accuracy = ((passed / totalTests) * 100).toFixed(2);

    // Print results
    console.log('\n📊 ========================================');
    console.log('  RESULTS');
    console.log('========================================\n');
    console.log(`✅ Passed: ${passed}/${totalTests}`);
    console.log(`❌ Failed: ${failed}/${totalTests}`);
    console.log(`🎯 Accuracy: ${accuracy}%\n`);

    // Print category breakdown
    console.log('📈 Category Breakdown:\n');
    for (const [category, stats] of Object.entries(categoryStats)) {
        const catAccuracy = ((stats.passed / stats.total) * 100).toFixed(1);
        const emoji = catAccuracy >= 95 ? '✅' : catAccuracy >= 85 ? '⚠️' : '❌';
        console.log(`${emoji} ${category}: ${stats.passed}/${stats.total} (${catAccuracy}%)`);
    }

    // Print failures
    if (failures.length > 0) {
        console.log('\n\n❌ Failed Test Cases:\n');
        failures.forEach((failure, index) => {
            console.log(`${index + 1}. [${failure.category}]`);
            console.log(`   Text: "${failure.text.substring(0, 70)}..."`);
            console.log(`   Expected: ${failure.expected}`);
            console.log(`   Actual: ${failure.actual}\n`);
        });
    }

    // Final verdict
    console.log('\n🏆 ========================================');
    if (accuracy >= 95) {
        console.log('  ✅ TARGET ACHIEVED! 95%+ ACCURACY');
    } else if (accuracy >= 90) {
        console.log('  ⚠️  CLOSE! NEAR 95% TARGET');
    } else {
        console.log('  ❌ NEEDS IMPROVEMENT');
    }
    console.log('========================================\n');

    process.exit(0);
}

// Run the test
runBenchmark().catch(err => {
    console.error('❌ Benchmark test failed:', err);
    process.exit(1);
});
