const classifier = require('../ai/classifier');

// ==========================================
// 100 BLIND TEST CASES (Totally Unseen)
// ==========================================
// Designed to stress-test generalization across new tech stacks, 
// niche entertainment, devops, design, and finance tools.

const blindTestCases = [
    // --- NEW TECH STACKS (Rust, Go, PHP, Java, Flutter) ---
    { text: "Terminal - cargo build --release", expected: "productive", category: "Dev" },
    { text: "VSCode - main.rs - Rust", expected: "productive", category: "Dev" },
    { text: "GoLand - server.go - Go", expected: "productive", category: "Dev" },
    { text: "Terminal - go run main.go", expected: "productive", category: "Dev" },
    { text: "PhpStorm - IndexController.php", expected: "productive", category: "Dev" },
    { text: "Terminal - composer install", expected: "productive", category: "Dev" },
    { text: "Terminal - php artisan migrate", expected: "productive", category: "Dev" },
    { text: "IntelliJ IDEA - UserService.java", expected: "productive", category: "Dev" },
    { text: "Terminal - mvn clean install", expected: "productive", category: "Dev" },
    { text: "Terminal - gradle build", expected: "productive", category: "Dev" },
    { text: "Android Studio - MainActivity.kt", expected: "productive", category: "Dev" },
    { text: "Terminal - flutter run -d chrome", expected: "productive", category: "Dev" },
    { text: "Xcode - ContentView.swift", expected: "productive", category: "Dev" },
    { text: "Terminal - pod install", expected: "productive", category: "Dev" },
    { text: "RubyMine - application_controller.rb", expected: "productive", category: "Dev" },
    { text: "Terminal - bundle exec rails s", expected: "productive", category: "Dev" },

    // --- DEVOPS & INFRASTRUCTURE ---
    { text: "Terminal - terraform apply", expected: "productive", category: "DevOps" },
    { text: "VSCode - main.tf - Terraform", expected: "productive", category: "DevOps" },
    { text: "Terminal - ansible-playbook site.yml", expected: "productive", category: "DevOps" },
    { text: "Terminal - kubectl get pods -n production", expected: "productive", category: "DevOps" },
    { text: "Chrome - Grafana - production-dashboard", expected: "productive", category: "DevOps" },
    { text: "Chrome - CircleCI - build-failed", expected: "productive", category: "DevOps" },
    { text: "Chrome - Sentry - Issue #1234", expected: "productive", category: "DevOps" },
    { text: "Chrome - Datadog - APM Trace", expected: "productive", category: "DevOps" },
    { text: "Terminal - ssh root@192.168.1.5", expected: "productive", category: "DevOps" },
    { text: "Putty - 10.0.0.15 - Interactive", expected: "productive", category: "DevOps" },

    // --- DESIGN & CREATIVE ---
    { text: "Sketch - App Design v2", expected: "productive", category: "Design" },
    { text: "Adobe XD - Wireframe Prototype", expected: "productive", category: "Design" },
    { text: "Figma - User Journey Map", expected: "productive", category: "Design" },
    { text: "InVision - Prototype Comment", expected: "productive", category: "Design" },
    { text: "Zeplin - Style Guide Export", expected: "productive", category: "Design" },
    { text: "Blender - 3D Model Render", expected: "productive", category: "Design" },
    { text: "Chrome - Behance - Inspiration", expected: "neutral", category: "Design" }, // Ambiguous
    { text: "Chrome - Dribbble - UI Trends", expected: "neutral", category: "Design" }, // Ambiguous

    // --- DATABASE & ANALYTICS ---
    { text: "DBeaver - Localhost PostgreSQL", expected: "productive", category: "Data" },
    { text: "TablePlus - Production DB Read-Only", expected: "productive", category: "Data" },
    { text: "Chrome - Metabase Dashboard", expected: "productive", category: "Data" },
    { text: "Chrome - BigQuery SQL Runner", expected: "productive", category: "Data" },
    { text: "Jupyter Lab - analysis.ipynb", expected: "productive", category: "Data" },
    { text: "Chrome - Google Looker Studio", expected: "productive", category: "Data" },

    // --- BUSINESS & FINANCE ---
    { text: "Chrome - Stripe Dashboard", expected: "productive", category: "Business" },
    { text: "Chrome - PayPal Business Transactions", expected: "productive", category: "Business" },
    { text: "QuickBooks - Invoice #1024", expected: "productive", category: "Business" },
    { text: "Excel - Q4 Financial Projections", expected: "productive", category: "Business" },
    { text: "Chrome - Salesforce Opportunities", expected: "productive", category: "Business" },
    { text: "Chrome - Zoho CRM Leads", expected: "productive", category: "Business" },
    { text: "Chrome - HubSpot Contacts", expected: "productive", category: "Business" },
    { text: "Chrome - DocuSign - Sign Contract", expected: "productive", category: "Business" },
    { text: "Chrome - BambooHR - Employee Directory", expected: "productive", category: "Business" },

    // --- NICHE ENTERTAINMENT (Anime, Sports, Niche Games) ---
    { text: "Chrome - Crunchyroll - One Piece", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - 9anime - Watch Naruto", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - MangaDex - Read Manga", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - ESPN - Live Score", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - DAZN - Sports Stream", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - NBA League Pass", expected: "non-productive", category: "Entertainment" },
    { text: "Steam - Factorio", expected: "non-productive", category: "Entertainment" },
    { text: "Steam - RimWorld", expected: "non-productive", category: "Entertainment" },
    { text: "Steam - Stardew Valley", expected: "non-productive", category: "Entertainment" },
    { text: "Discord - Voice Channel: Gaming", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - Chess.com - Play Online", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - Lichess - Bullet 1+0", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - Sudoku.com - Daily Puzzle", expected: "non-productive", category: "Entertainment" },
    { text: "Chrome - GeoGuessr - World Map", expected: "non-productive", category: "Entertainment" },

    // --- SHOPPING & LIFESTYLE (Ambiguous) ---
    { text: "Chrome - Amazon.com: Gaming Mouse", expected: "non-productive", category: "Shopping" },
    { text: "Chrome - eBay - Vintage Camera", expected: "non-productive", category: "Shopping" },
    { text: "Chrome - AliExpress - Order Status", expected: "non-productive", category: "Shopping" },
    { text: "Chrome - Shopify Admin - Orders", expected: "productive", category: "Shopping" }, // Admin = work
    { text: "Chrome - Airbnb - Vacation Rentals", expected: "non-productive", category: "Lifestyle" },
    { text: "Chrome - Booking.com - Hotels", expected: "non-productive", category: "Lifestyle" },
    { text: "Chrome - AllRecipes - Dinner Ideas", expected: "non-productive", category: "Lifestyle" },

    // --- NEWS & SOCIAL (Nuanced) ---
    { text: "Chrome - CNN - Breaking News", expected: "non-productive", category: "News" }, // Defaults to non-prod technically?
    { text: "Chrome - BBC News - World", expected: "non-productive", category: "News" },
    { text: "Chrome - Hacker News", expected: "neutral", category: "News" }, // Very ambiguous for devs
    { text: "Chrome - Product Hunt - New Tools", expected: "neutral", category: "News" },
    { text: "Chrome - TechCrunch - Startup News", expected: "neutral", category: "News" },
    { text: "Chrome - Pinterest - Home Feed", expected: "non-productive", category: "Social" },
    { text: "Chrome - Tumblr - Dashboard", expected: "non-productive", category: "Social" },
    { text: "Chrome - 9gag - Fun", expected: "non-productive", category: "Social" },

    // --- OBSCURE FILE FORMATS ---
    { text: "VLC - video.mkv", expected: "non-productive", category: "Files" },
    { text: "VLC - audio.flac", expected: "non-productive", category: "Files" },
    { text: "VLC - movie.avi", expected: "non-productive", category: "Files" },
    { text: "QuickTime - raw_footage.mov", expected: "neutral", category: "Files" }, // Could be work?

    // --- SYSTEM & UTILITIES ---
    { text: "Task Manager", expected: "neutral", category: "System" },
    { text: "Activity Monitor", expected: "neutral", category: "System" },
    { text: "1Password", expected: "neutral", category: "System" },
    { text: "LastPass Vault", expected: "neutral", category: "System" },
    { text: "Speedtest.net by Ookla", expected: "neutral", category: "System" },

    // --- GAMING PLATFORMS (New) ---
    { text: "GOG Galaxy - Library", expected: "non-productive", category: "Entertainment" },
    { text: "Ubisoft Connect - Assassin's Creed", expected: "non-productive", category: "Entertainment" },
    { text: "Battle.net - Overwatch 2", expected: "non-productive", category: "Entertainment" },

    // --- RANDOM HARD / AMBIGUOUS CASES ---
    { text: "Chrome - Stack Overflow - How to center div", expected: "productive", category: "Ambiguous" }, // Obvious work
    { text: "Chrome - Google Search - javascript array methods", expected: "productive", category: "Ambiguous" },
    { text: "Chrome - Google Search - best pizza nearby", expected: "non-productive", category: "Ambiguous" }, // ML should catch this? Or might be neutral
    { text: "Chrome - YouTube - LoFi Hip Hop Radio", expected: "category_check", category: "Ambiguous" }, // Could be prod or non-prod depending on policy. Let's see what it does.
    { text: "Chrome - YouTube - White Noise for Focus", expected: "category_check", category: "Ambiguous" },
];

async function runBlindTest() {
    console.log(`\n🕵️ RUNNING 100 BLIND STRESS TEST CASES...`);
    console.log(`----------------------------------------`);

    // Initialize Classifier
    await classifier.train();

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const test of blindTestCases) {
        if (test.expected === 'category_check') continue; // Skip ambiguous checking for score

        const result = await classifier.classify(test.text, [], null);

        // Custom logic for vague/neutral/non-prod overlaps
        // e.g. "News" might be neutral or non-prod
        let success = (result.category === test.expected);

        // Allow "neutral" for some ambiguous non-prod cases if strictness isn't set
        if (test.expected === 'non-productive' && result.category === 'neutral' && test.category === 'News') {
            success = true; // News is often neutral
        }
        if (test.expected === 'neutral' && result.category === 'productive' && test.category === 'Design') {
            success = true; // Behance could be productive
        }

        if (success) {
            passed++;
        } else {
            failed++;
            failures.push({
                text: test.text,
                expected: test.expected,
                actual: result.category,
                reason: result.reason,
                cat: test.category
            });
        }
    }

    // Report
    console.log(`\n📊 FINAL SCORE: ${passed}/${passed + failed}`);
    console.log(`🎯 ACCURACY: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

    if (failures.length > 0) {
        console.log(`\n❌ FAILURES (${failures.length}):`);
        failures.forEach(f => {
            console.log(`   [${f.cat}] "${f.text}"`);
            console.log(`   Expected: ${f.expected} | Actual: ${f.actual}`);
            console.log(`   Reason: ${f.reason}`);
            console.log(`   ---`);
        });
    }

    if (passed >= 95) {
        console.log(`\n🏆 PASSED: The classifier is ROBUST.`);
    } else {
        console.log(`\n⚠️ FAILED: Significant drop in accuracy on new data.`);
    }
}

runBlindTest();
