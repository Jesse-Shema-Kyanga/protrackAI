const classifier = require('../ai/classifier');

const testCases = [
    // ==========================================
    // 1. DATA SCIENCE & AI ENGINEERING (15)
    // ==========================================
    { text: "Chrome - Hugging Face - models/bert-base-uncased", expected: "productive" },
    { text: "Chrome - WandB - Training Run #42 Loss Chart", expected: "productive" },
    { text: "Jupyter Notebook - pandas_data_cleaning.ipynb", expected: "productive" },
    { text: "Chrome - Kaggle - Titanic Dataset Competition", expected: "productive" }, // Learning/Work
    { text: "Terminal - pip install torch torchvision", expected: "productive" },
    { text: "Terminal - conda activate pytorch_env", expected: "productive" },
    { text: "Chrome - OpenAI API Playground - GPT-4", expected: "productive" },
    { text: "Chrome - LangChain Documentation - Chains", expected: "productive" },
    { text: "VSCode - train_model.py - TensorFlow", expected: "productive" },
    { text: "Terminal - nvidia-smi", expected: "productive" }, // GPU check
    { text: "Chrome - Colab - Google Colab Notebook", expected: "productive" },
    { text: "Chrome - Papers with Code - SOTA ImageNet", expected: "productive" },
    { text: "Chrome - arXiv.org - Attention Is All You Need", expected: "productive" }, // Research
    { text: "Terminal - tensorboard --logdir=runs", expected: "productive" },
    { text: "Chrome - Streamlit - App Dashboard", expected: "productive" },

    // ==========================================
    // 2. WEB3 & BLOCKCHAIN (10)
    // ==========================================
    { text: "Chrome - Etherscan - Transaction Details", expected: "productive" }, // Investigating tx
    { text: "Chrome - Remix IDE - Solidity Compiler", expected: "productive" },
    { text: "VSCode - SmartContract.sol - Solidity", expected: "productive" },
    { text: "Terminal - npx hardhat test", expected: "productive" },
    { text: "Terminal - truffle migrate --network goerli", expected: "productive" },
    { text: "Chrome - MetaMask - Confirm Transaction", expected: "neutral" }, // Utility/Wallet
    { text: "Chrome - OpenSea - NFT Marketplace", expected: "non-productive" }, // Shopping/Browsing
    { text: "Chrome - CoinGecko - Bitcoin Price Chart", expected: "non-productive" }, // Speculation/Check
    { text: "Chrome - IPFS Public Gateway", expected: "productive" },
    { text: "Terminal - ganache-cli", expected: "productive" },

    // ==========================================
    // 3. HARDWARE & IOT (10)
    // ==========================================
    { text: "Arduino IDE - Blink.ino", expected: "productive" },
    { text: "KiCad - PCB Layout Editor", expected: "productive" },
    { text: "Altium Designer - Schematic.SchDoc", expected: "productive" },
    { text: "Terminal - minicom -D /dev/ttyUSB0", expected: "productive" }, // Serial monitor
    { text: "Chrome - Raspberry Pi Documentation - GPIO", expected: "productive" },
    { text: "Chrome - DigiKey - Microcontroller Search", expected: "productive" }, // Sourcing parts
    { text: "Saleae Logic 2 - Analyzing SPI Bus", expected: "productive" },
    { text: "Terminal - avrdude -c usbtiny -p m328p", expected: "productive" }, // Flashing
    { text: "Chrome - datasheet.pdf (STM32F407)", expected: "productive" },
    { text: "PlatformIO - main.cpp - ESP32", expected: "productive" },

    // ==========================================
    // 4. GLOBAL / REGIONAL APPS (10)
    // ==========================================
    { text: "WeChat - Chat", expected: "non-productive" }, // Social
    { text: "Line - Messages", expected: "non-productive" },
    { text: "KakaoTalk", expected: "non-productive" },
    { text: "Telegram - Saved Messages", expected: "neutral" }, // Ambiguous, often work utility
    { text: "WhatsApp - Project Group", expected: "productive" }, // Context: Project
    { text: "Chrome - Baidu Search - Java Tutorial", expected: "productive" }, // Search
    { text: "Chrome - Naver - News", expected: "non-productive" },
    { text: "Chrome - VKontakte (VK) - Feed", expected: "non-productive" },
    { text: "Chrome - Yandex Mail - Inbox", expected: "productive" },
    { text: "Chrome - MercadoLibre - Shopping", expected: "non-productive" },

    // ==========================================
    // 5. GAME DEVELOPMENT (10)
    // ==========================================
    { text: "Unity - Project Scene", expected: "productive" },
    { text: "Unreal Editor - Level_01", expected: "productive" },
    { text: "Godot Engine - Player.gd", expected: "productive" },
    { text: "Blender - Character_Rig.blend", expected: "productive" },
    { text: "Chrome - Mixamo - Animations", expected: "productive" },
    { text: "Chrome - Unity Asset Store", expected: "productive" }, // Shopping for assets = work?
    { text: "Terminal - dotnet build Game.sln", expected: "productive" },
    { text: "Chrome - itch.io - Indie Games", expected: "non-productive" }, // Browsing games
    { text: "Steam - Launching Game...", expected: "non-productive" },
    { text: "Chrome - ShaderToy - Shader Editor", expected: "productive" }, // Technical

    // ==========================================
    // 6. NETWORKING & SYSADMIN (10)
    // ==========================================
    { text: "Wireshark - Capturing on eth0", expected: "productive" },
    { text: "Fiddler - HTTP Debugging", expected: "productive" },
    { text: "Terminal - nmap -sV 192.168.1.1", expected: "productive" },
    { text: "Terminal - dig google.com +trace", expected: "productive" },
    { text: "Terminal - ping 8.8.8.8", expected: "neutral" }, // Utility
    { text: "Putty - 10.0.0.5 - SSH", expected: "productive" },
    { text: "WinSCP - Uploading files", expected: "productive" },
    { text: "Chrome - Cloudflare Dashboard - DNS", expected: "productive" },
    { text: "Terminal - htop", expected: "neutral" }, // System monitor
    { text: "Terminal - chmod +x script.sh", expected: "productive" },

    // ==========================================
    // 7. CREATIVE & MEDIA (10)
    // ==========================================
    { text: "Adobe Premiere Pro - Timeline", expected: "productive" },
    { text: "Adobe After Effects - Composition", expected: "productive" },
    { text: "Audacity - Audio Editor", expected: "productive" },
    { text: "OBS Studio - Recording", expected: "productive" }, // Streaming work/demo
    { text: "Chrome - Fiverr - Manage Orders", expected: "productive" }, // Freelance
    { text: "Chrome - Upwork - Submit Proposal", expected: "productive" },
    { text: "Chrome - Behance - My Portfolio", expected: "productive" },
    { text: "VLC - tutorial_video.mp4", expected: "productive" }, // Context? Assume productive if tutorial
    { text: "Spotify - Deep Focus Playlist", expected: "non-productive" }, // Music is background, but classified NP
    { text: "Chrome - Unsplash - Stock Photos", expected: "productive" },

    // ==========================================
    // 8. EDUCATION & REFERENCE (10)
    // ==========================================
    { text: "Chrome - LeetCode - Two Sum", expected: "productive" }, // Skill building
    { text: "Chrome - Coursera - Machine Learning", expected: "productive" },
    { text: "Chrome - Udemy - React Course", expected: "productive" },
    { text: "Chrome - edX - Computer Science", expected: "productive" },
    { text: "Chrome - Wikipedia - B-Tree", expected: "productive" }, // Reference
    { text: "Chrome - Wikipedia - Plot of Star Wars", expected: "non-productive" }, // Entertainment reading
    { text: "Chrome - Quizlet - Flashcards", expected: "productive" },
    { text: "Anki - Decks", expected: "productive" },
    { text: "Chrome - Duolingo - Spanish", expected: "non-productive" }, // Personal Hobby usually
    { text: "Chrome - Khan Academy - Linear Algebra", expected: "productive" },

    // ==========================================
    // 9. EDGE CASES & AMBIGUOUS (15)
    // ==========================================
    { text: "Chrome - Google Flights - Search", expected: "non-productive" },
    { text: "Chrome - Concur - Travel Expense", expected: "productive" }, // Work travel
    { text: "Excel - Vacation Budget.xlsx", expected: "non-productive" }, // Context: Personal
    { text: "Excel - Q3_Budget_Report.xlsx", expected: "productive" },
    { text: "Zoom - Family Call", expected: "non-productive" }, // How to know? Keyword "Family"?
    { text: "Zoom - Team Standup", expected: "productive" },
    { text: "Chrome - Zillow - Houses for Sale", expected: "non-productive" },
    { text: "Chrome - Maps - Directions to Gym", expected: "neutral" },
    { text: "Chrome - Uber Eats - Order", expected: "non-productive" },
    { text: "Word - Resignation_Letter.docx", expected: "neutral" }, // Spicy!
    { text: "Terminal - git push --force", expected: "productive" },
    { text: "Chrome - Azure DevOps - Board", expected: "productive" },
    { text: "Chrome - AWS Billing Dashboard", expected: "productive" },
    { text: "Chrome - IRS.gov - Tax Forms", expected: "neutral" }, // Personal admin
    { text: "Chrome - Banking - Login", expected: "neutral" } // Personal admin
];

async function runGlobalTest() {
    console.log("🌍 RUNNING GLOBAL BLIND TEST (100 Scenarios) 🌍");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;
    // Pre-load classifier
    await classifier.train();

    const failures = [];

    for (const test of testCases) {
        const result = await classifier.classify(test.text, [], null); // No history context for raw test
        const isMatch = result.category === test.expected;

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

runGlobalTest();
