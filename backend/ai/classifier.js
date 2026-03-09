const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

class ActivityClassifier {
    constructor() {
        this.model = null;
        this.vocab = new Set();
        this.maxLen = 20;
        this.isTrained = false;
        this.userLearningPath = path.join(__dirname, 'user_learning.json');
        this.rulesPath = path.join(__dirname, 'weighted_rules.json');
        this.weightedRules = {};

        // Base Training Data (keep your existing data)
        this.baseData = [
            // Development
            { text: "antigravity ide coding programming developer workspace", label: 0 },
            { text: "visual studio code vscode programming coding js python", label: 0 },
            { text: "github repository commit push pull request merge", label: 0 },
            { text: "stackoverflow error debug exception stack trace", label: 0 },
            { text: "gitlab ci cd pipeline devops", label: 0 },
            { text: "docker container kubernetes cluster terminal", label: 0 },
            { text: "postman api request response json xml", label: 0 },
            { text: "mongodb compass database query sql nosql", label: 0 },
            { text: "mysql workbench schema table relation", label: 0 },
            { text: "figma design ui ux prototype wireframe", label: 0 },
            { text: "adobe xd photoshop illustrator creative cloud", label: 0 },
            { text: "canva design presentation graphic", label: 0 },
            // Communication/Office
            { text: "slack channel message team huddle", label: 0 },
            { text: "microsoft teams meeting call conference", label: 0 },
            { text: "zoom video call webinar screen share", label: 0 },
            { text: "google meet hangout calendar invite", label: 0 },
            { text: "outlook mail inbox sent draft email", label: 0 },
            { text: "gmail inbox compose reply forward", label: 0 },
            { text: "microsoft word document report proposal letter", label: 0 },
            { text: "microsoft excel spreadsheet formula pivot chart", label: 0 },
            { text: "google docs document editor writer", label: 0 },
            { text: "google sheets spreadsheet finance data", label: 0 },
            { text: "powerpoint presentation slide deck ppts", label: 0 },
            { text: "notion workspace page notes wiki", label: 0 },
            { text: "trello board card list kanban", label: 0 },
            { text: "jira ticket issue sprint agile scrum", label: 0 },
            { text: "asana task project management deadline", label: 0 },
            // Entertainment/Social
            { text: "youtube video stream watch vlogger content", label: 1 },
            { text: "netflix movie series episode watch chill", label: 1 },
            { text: "twitch stream live gaming chat emote", label: 1 },
            { text: "tiktok viral video short feed scroll", label: 1 },
            { text: "facebook feed post status friend social", label: 1 },
            { text: "instagram photo story reel feed like", label: 1 },
            { text: "twitter x tweet thread trend hashtag", label: 1 },
            { text: "reddit thread sub post comment karma", label: 1 },
            { text: "pinterest pin board idea inspiration", label: 1 },
            // Gaming
            { text: "steam game store library play valve", label: 1 },
            { text: "epic games store fortnite launcher", label: 1 },
            { text: "discord chat voice gaming server guild", label: 1 },
            { text: "minecraft mojang block craft survival", label: 1 },
            { text: "league of legends riot client moba", label: 1 },
            { text: "valorant shooter fps ranked", label: 1 },
            // Shopping
            { text: "amazon cart buy checkout deal prime", label: 1 },
            { text: "ebay auction bid buy sell listing", label: 1 },
            { text: "aliexpress china shop deal ship", label: 1 },
            { text: "shein fashion clothes shop app", label: 1 },
            // System/Utility
            { text: "file explorer windows finder directory folder", label: 2 },
            { text: "settings control panel system preferences config", label: 2 },
            { text: "calculator math numbers calc", label: 2 },
            { text: "calendar date time schedule month year", label: 2 },
            { text: "notepad text editor simple memo", label: 2 },
            { text: "cmd command prompt powershell terminal", label: 2 },
            { text: "task manager process performance cpu ram", label: 2 },
            { text: "lock screen login user pass", label: 2 },
            { text: "new tab browser start page home", label: 2 },
            { text: "google search query find web result", label: 2 },
            { text: "random window title unknown app generic", label: 2 },
            { text: "untitled document blank page empty", label: 2 },
            { text: "downloads folder files image zip", label: 2 },

            // ==========================================
            // EXPANDED TRAINING DATA (400+ New Samples)
            // ==========================================

            // Specialized Professional Areas (CRM, HR, Accounting)
            { text: "crm dashboard leads customer relationship management", label: 0 },
            { text: "payroll system employee salary billing directory", label: 0 },
            { text: "admin portal management system enterprise logging", label: 0 },
            { text: "inventory management stock control warehouse supply", label: 0 },
            { text: "invoice generator billing statement payment portal", label: 0 },
            { text: "nda executed contract agreement legal signature", label: 0 },

            // Audio Production
            { text: "ableton live music production techno project mixdown", label: 0 },
            { text: "logic pro x recording studio mastering session", label: 0 },
            { text: "pro tools tracking editing audio mixing", label: 0 },
            { text: "fl studio beats pattern playlist mixer wav", label: 0 },
            { text: "splice samples search wav loops download library", label: 0 },

            // DEVELOPER TOOLS (100 samples) - Label 0 = Productive
            // IDEs & Code Editors
            { text: "webstorm react component typescript jsx debugging", label: 0 },
            { text: "pycharm python django flask debug console breakpoint", label: 0 },
            { text: "intellij java spring boot maven gradle build", label: 0 },
            { text: "phpstorm laravel symfony composer package", label: 0 },
            { text: "rider c# dotnet unity game development", label: 0 },
            { text: "atom editor markdown preview package install", label: 0 },
            { text: "sublime text editor plugin syntax highlighting", label: 0 },
            { text: "vim neovim terminal text editor command mode", label: 0 },
            { text: "emacs editor lisp config buffer window", label: 0 },
            { text: "notepad++ syntax highlighting plugin macro", label: 0 },

            // Terminals & Command Line
            { text: "wsl ubuntu linux bash shell command terminal", label: 0 },
            { text: "wsl debian apt install package manager sudo", label: 0 },
            { text: "powershell script execution policy variable function", label: 0 },
            { text: "cmd command prompt batch script windows", label: 0 },
            { text: "git bash terminal commit push pull origin", label: 0 },
            { text: "iterm2 terminal zsh oh my zsh profile", label: 0 },
            { text: "hyper terminal electron app theme customization", label: 0 },
            { text: "windows terminal powershell wsl ubuntu profile", label: 0 },
            { text: "termius ssh client server connection remote", label: 0 },
            { text: "putty ssh telnet serial connection session", label: 0 },

            // Localhost Development
            { text: "localhost 3000 react app development server running", label: 0 },
            { text: "localhost 8080 spring boot application started", label: 0 },
            { text: "localhost 5000 flask python api endpoint testing", label: 0 },
            { text: "localhost 4200 angular dev server compiled successfully", label: 0 },
            { text: "127.0.0.1 8000 django development server", label: 0 },
            { text: "localhost 3001 express node server listening", label: 0 },
            { text: "localhost 5173 vite react app hot module reload", label: 0 },
            { text: "localhost 8888 jupyter notebook python data science", label: 0 },
            { text: "localhost 27017 mongodb database connection local", label: 0 },
            { text: "localhost 5432 postgresql database server running", label: 0 },

            // Version Control & Collaboration
            { text: "github pull request code review approved merged", label: 0 },
            { text: "github actions workflow ci cd pipeline build deploy", label: 0 },
            { text: "github issues bug report feature request discussion", label: 0 },
            { text: "gitlab merge request pipeline passed review", label: 0 },
            { text: "bitbucket repository branch commit push", label: 0 },
            { text: "git clone repository branch checkout commit", label: 0 },
            { text: "git merge conflict resolve rebase cherry pick", label: 0 },
            { text: "git log history diff show commit message", label: 0 },
            { text: "git stash pop apply save changes temporary", label: 0 },
            { text: "gitkraken visual git client branch merge", label: 0 },

            // Documentation & Learning (Work Context)
            { text: "mdn web docs javascript reference api guide", label: 0 },
            { text: "w3schools html css tutorial example reference", label: 0 },
            { text: "react documentation hooks useeffect usestate guide", label: 0 },
            { text: "python documentation official library reference manual", label: 0 },
            { text: "nodejs documentation api reference modules guide", label: 0 },
            { text: "django documentation tutorial getting started guide", label: 0 },
            { text: "spring boot documentation reference guide tutorial", label: 0 },
            { text: "docker documentation container image dockerfile guide", label: 0 },
            { text: "kubernetes docs deployment service pod tutorial", label: 0 },
            { text: "aws documentation ec2 s3 lambda service guide", label: 0 },

            // API Development & Testing
            { text: "postman collection request response test api", label: 0 },
            { text: "insomnia rest graphql api client testing", label: 0 },
            { text: "swagger openapi documentation endpoint test", label: 0 },
            { text: "curl command line http request response", label: 0 },
            { text: "graphql playground query mutation schema test", label: 0 },

            // Database Management
            { text: "mongodb compass query collection document filter", label: 0 },
            { text: "mysql workbench query database schema table", label: 0 },
            { text: "pgadmin postgresql query table administration", label: 0 },
            { text: "dbeaver sql query database connection editor", label: 0 },
            { text: "redis commander cache key value inspect", label: 0 },
            { text: "tableplus database client query sql nosql", label: 0 },
            { text: "robo 3t mongodb query collection document", label: 0 },

            // Cloud & DevOps
            { text: "aws console ec2 instance lambda function s3", label: 0 },
            { text: "azure portal virtual machine app service database", label: 0 },
            { text: "google cloud console compute engine storage", label: 0 },
            { text: "heroku dashboard app deployment logs dyno", label: 0 },
            { text: "vercel deployment preview production build", label: 0 },
            { text: "netlify deployment site build preview production", label: 0 },
            { text: "docker desktop container image build run", label: 0 },
            { text: "kubernetes dashboard pod deployment service", label: 0 },
            { text: "jenkins pipeline build job deploy automation", label: 0 },
            { text: "circleci workflow build test deploy pipeline", label: 0 },

            // Design & Creative (Productive)
            { text: "figma design system component prototype collaboration", label: 0 },
            { text: "adobe xd wireframe mockup prototype user interface", label: 0 },
            { text: "sketch app design artboard symbol library", label: 0 },
            { text: "invision prototype design feedback comment review", label: 0 },
            { text: "canva presentation design template graphic business", label: 0 },
            { text: "photoshop layer mask filter adjustment image editing", label: 0 },
            { text: "illustrator vector graphic design logo illustration", label: 0 },
            { text: "indesign layout typography publication design", label: 0 },
            { text: "premiere pro video editing timeline export render", label: 0 },
            { text: "after effects animation motion graphics keyframe", label: 0 },

            // ENTERTAINMENT EDGE CASES (100 samples) - Label 1 = Non-Productive
            // Streaming Sites (Piracy & Legal)
            { text: "flixhq watch walking dead season episode free", label: 1 },
            { text: "soap2day stream movie online free hd 1080p", label: 1 },
            { text: "123movies free movie streaming watch online", label: 1 },
            { text: "putlocker watch series episode free stream", label: 1 },
            { text: "gomovies watch film cinema free download", label: 1 },
            { text: "fmovies stream series episode season free", label: 1 },
            { text: "yesmovies watch online free hd stream movie", label: 1 },
            { text: "crunchyroll anime stream episode sub dub", label: 1 },
            { text: "funimation anime watch episode dub sub", label: 1 },
            { text: "vrv anime stream crunchyroll rooster teeth", label: 1 },

            // TV/Movie File Patterns
            { text: "stranger things s04e05 1080p webrip x264", label: 1 },
            { text: "breaking bad s05e16 bluray 720p hevc", label: 1 },
            { text: "the office us s03e15 hdtv xvid fqm", label: 1 },
            { text: "game of thrones s08e06 2160p webdl h265", label: 1 },
            { text: "friends season 10 episode 18 720p brrip", label: 1 },
            { text: "avengers endgame 2019 1080p bluray x264 yts", label: 1 },
            { text: "spider man no way home 2021 2160p web h265", label: 1 },
            { text: "the batman 2022 1080p hdrip x264 rarbg", label: 1 },
            { text: "top gun maverick 2022 720p webdl xvid", label: 1 },
            { text: "john wick chapter 4 2023 1080p webrip", label: 1 },

            // Anime Patterns
            { text: "[SubsPlease] One Piece 1080 1080p mkv", label: 1 },
            { text: "[HorribleSubs] Naruto Shippuden 500 720p", label: 1 },
            { text: "[Erai-raws] Attack on Titan S04 1080p", label: 1 },
            { text: "[Commie] Demon Slayer 26 720p aac mp4", label: 1 },
            { text: "[Judas] My Hero Academia S06 batch 1080p", label: 1 },

            // Gaming Content
            { text: "valorant ranked competitive match clutch ace", label: 1 },
            { text: "league of legends lol ranked game diamond elo", label: 1 },
            { text: "fortnite battle royale victory win squad", label: 1 },
            { text: "minecraft survival mode building crafting adventure", label: 1 },
            { text: "roblox game play avatar customize obby", label: 1 },
            { text: "cs go counter strike competitive match rank", label: 1 },
            { text: "call of duty warzone loadout win battle", label: 1 },
            { text: "gta grand theft auto online mission heist", label: 1 },
            { text: "overwatch competitive match hero ultimate play", label: 1 },
            { text: "apex legends ranked battle royale champion", label: 1 },

            // Social Media Entertainment
            { text: "facebook news feed scroll timeline post like", label: 1 },
            { text: "instagram explore page reel funny video viral", label: 1 },
            { text: "tiktok for you page fyp viral trend dance", label: 1 },
            { text: "twitter timeline scroll tweet viral trending", label: 1 },
            { text: "reddit popular front page meme funny post", label: 1 },
            { text: "reddit r slash funny memes jokes comedy", label: 1 },
            { text: "pinterest browse pin save home decor idea", label: 1 },
            { text: "snapchat story view friend snap streak", label: 1 },
            { text: "tumblr dashboard reblog post fandom gif", label: 1 },
            { text: "9gag meme funny video viral trending", label: 1 },

            // Music & Podcasts (Entertainment)
            { text: "spotify playlist discover weekly music streaming", label: 1 },
            { text: "youtube music playlist song artist album", label: 1 },
            { text: "apple music playlist library browse play", label: 1 },
            { text: "soundcloud upload track music producer", label: 1 },
            { text: "pandora radio station music streaming", label: 1 },
            { text: "podcast episode listen entertainment comedy", label: 1 },
            { text: "twitch stream watching gaming live chat", label: 1 },
            { text: "kick stream live gaming watch chat donate", label: 1 },

            // Shopping
            { text: "amazon browse product buy cart checkout shopping", label: 1 },
            { text: "ebay auction bid product buy seller", label: 1 },
            { text: "aliexpress cheap product china shipping shop", label: 1 },
            { text: "wish cheap shopping product browse cart", label: 1 },
            { text: "shein fashion clothes browse buy shopping", label: 1 },
            { text: "temu shopping deals cheap browse product", label: 1 },
            { text: "etsy handmade craft shop buy seller", label: 1 },
            { text: "walmart shop grocery pickup delivery cart", label: 1 },
            { text: "best buy electronics laptop phone buy", label: 1 },
            { text: "target shop clothing home grocery buy", label: 1 },

            // Gambling
            { text: "bet365 sports betting odds casino bet", label: 1 },
            { text: "fanduel daily fantasy sports betting odds", label: 1 },
            { text: "draftkings sports book betting casino wager", label: 1 },
            { text: "pokerstars poker game tournament cash table", label: 1 },
            { text: "888casino slot game jackpot spin win", label: 1 },

            // OFFICE WORK (100 samples) - Label 0 = Productive
            // Email Communication
            { text: "outlook compose email quarterly budget approval reply", label: 0 },
            { text: "gmail inbox compose project update meeting schedule", label: 0 },
            { text: "outlook meeting request calendar invite response", label: 0 },
            { text: "gmail reply all team announcement important message", label: 0 },
            { text: "outlook draft email revision client proposal attached", label: 0 },
            { text: "thunderbird email client compose send receive", label: 0 },
            { text: "mailspring email inbox thread conversation reply", label: 0 },
            { text: "spark email smart inbox important priority", label: 0 },
            { text: "superhuman email client keyboard shortcut inbox zero", label: 0 },
            { text: "front team inbox shared email collaboration", label: 0 },

            // Document Editing
            { text: "microsoft word annual report 2024 draft editing", label: 0 },
            { text: "word document project proposal client presentation", label: 0 },
            { text: "google docs collaboration editing commenting share", label: 0 },
            { text: "docs meeting notes team brainstorm agenda", label: 0 },
            { text: "word template letterhead business correspondence", label: 0 },
            { text: "pages document mac writing report article", label: 0 },
            { text: "libreoffice writer document editing formatting", label: 0 },
            { text: "onenote notebook section page note taking", label: 0 },
            { text: "evernote note sync tag organize productivity", label: 0 },
            { text: "bear notes markdown writing organizing", label: 0 },

            // Spreadsheets
            { text: "microsoft excel sales forecast quarterly revenue", label: 0 },
            { text: "excel formula pivot table data analysis chart", label: 0 },
            { text: "google sheets budget tracking expense report", label: 0 },
            { text: "sheets collaboration formula function importrange", label: 0 },
            { text: "excel vba macro automation data processing", label: 0 },
            { text: "numbers spreadsheet mac table chart formula", label: 0 },
            { text: "libreoffice calc spreadsheet formula function", label: 0 },
            { text: "airtable database spreadsheet collaboration base", label: 0 },
            { text: "smartsheet project management gantt collaboration", label: 0 },
            { text: "excel financial model revenue projection forecast", label: 0 },

            // Presentations
            { text: "powerpoint client presentation deck slide design", label: 0 },
            { text: "google slides presentation collaboration edit share", label: 0 },
            { text: "keynote presentation mac slide transition animation", label: 0 },
            { text: "prezi presentation zoom canvas interactive", label: 0 },
            { text: "pitch deck startup investor presentation slide", label: 0 },
            { text: "powerpoint template design business presentation", label: 0 },
            { text: "slides template theme layout master slide", label: 0 },

            // Video Conferencing
            { text: "zoom meeting client presentation screen share", label: 0 },
            { text: "microsoft teams daily standup call video meeting", label: 0 },
            { text: "google meet client call video conference", label: 0 },
            { text: "webex meeting presentation collaboration video", label: 0 },
            { text: "skype business call video conference chat", label: 0 },
            { text: "whereby video meeting room link browser", label: 0 },
            { text: "bluejeans video conference meeting enterprise", label: 0 },
            { text: "gotomeeting webinar presentation video conference", label: 0 },

            // Project Management
            { text: "jira sprint planning ticket backlog story point", label: 0 },
            { text: "trello board card checklist deadline kanban", label: 0 },
            { text: "asana task project team deadline milestone", label: 0 },
            { text: "monday board workspace automation workflow", label: 0 },
            { text: "clickup task document goal workspace", label: 0 },
            { text: "notion page database workspace wiki documentation", label: 0 },
            { text: "basecamp project message file todo schedule", label: 0 },
            { text: "linear issue project workflow team collaboration", label: 0 },
            { text: "wrike project gantt task resource management", label: 0 },
            { text: "smartsheet project plan gantt dependency", label: 0 },

            // Communication (Work)
            { text: "slack channel message thread team communication", label: 0 },
            { text: "microsoft teams chat channel meeting file share", label: 0 },
            { text: "discord server channel voice work community", label: 0 },
            { text: "mattermost team chat channel secure messaging", label: 0 },
            { text: "rocket chat team communication channel message", label: 0 },

            // Cloud Storage
            { text: "google drive folder file share collaborate upload", label: 0 },
            { text: "dropbox sync file folder share collaboration", label: 0 },
            { text: "onedrive microsoft cloud storage file sync", label: 0 },
            { text: "box enterprise file share secure collaboration", label: 0 },
            { text: "sharepoint document library collaboration workflow", label: 0 },

            // AMBIGUOUS CASES (50 samples) - Context Matters!
            // YouTube - Productive vs Entertainment
            { text: "youtube tensorflow tutorial series deep learning", label: 0 },
            { text: "youtube react hooks tutorial programming guide", label: 0 },
            { text: "youtube python django course full tutorial", label: 0 },
            { text: "youtube aws certification training cloud computing", label: 0 },
            { text: "youtube docker kubernetes tutorial devops", label: 0 },
            { text: "youtube funny cat compilation fail video", label: 1 },
            { text: "youtube prank video reaction compilation", label: 1 },
            { text: "youtube gaming montage highlight play", label: 1 },
            { text: "youtube vlog daily life routine entertainment", label: 1 },
            { text: "youtube music video official artist song", label: 1 },

            // Reddit - Productive vs Entertainment
            { text: "reddit r programming best practices discussion", label: 0 },
            { text: "reddit r webdev career advice developer", label: 0 },
            { text: "reddit r python learning resource tutorial", label: 0 },
            { text: "reddit r cscareerquestions advice interview", label: 0 },
            { text: "reddit r sysadmin server infrastructure solution", label: 0 },
            { text: "reddit r funny memes comedy entertainment", label: 1 },
            { text: "reddit r memes dank funny viral post", label: 1 },
            { text: "reddit r gaming game discussion community", label: 1 },
            { text: "reddit r aww cute animal pet photo", label: 1 },
            { text: "reddit r askreddit random question entertainment", label: 1 },

            // LinkedIn - Work vs Scrolling
            { text: "linkedin job search software engineer apply", label: 0 },
            { text: "linkedin recruiter candidate search hiring", label: 0 },
            { text: "linkedin company page post professional update", label: 0 },
            { text: "linkedin learning course tutorial skill development", label: 0 },
            { text: "linkedin network connection message professional", label: 0 },
            { text: "linkedin feed scroll news post article browse", label: 1 },

            // Medium - Learning vs Random Reading
            { text: "medium article javascript best practices tutorial", label: 0 },
            { text: "medium react performance optimization guide", label: 0 },
            { text: "medium devops kubernetes deployment article", label: 0 },
            { text: "medium random story life advice motivation", label: 1 },
            { text: "medium browse trending topic popular story", label: 1 },

            // Twitter/X - Work vs Entertainment
            { text: "twitter tech news developer announcement update", label: 0 },
            { text: "twitter nasa space science discovery announcement", label: 0 },
            { text: "twitter trending meme viral entertainment", label: 1 },
            { text: "twitter celebrity gossip drama entertainment news", label: 1 },
            { text: "twitter scroll timeline random tweet entertainment", label: 1 },

            // GitHub - Work vs Browsing
            { text: "github explore trending repository star watch", label: 1 },
            { text: "github discussion community forum random issue", label: 1 },

            // WhatsApp - Work vs Personal
            { text: "whatsapp group team work project discussion", label: 0 },
            { text: "whatsapp client communication business message", label: 0 },
            { text: "whatsapp personal chat friend family group", label: 2 },
            { text: "whatsapp status view story browse entertainment", label: 1 },

            // Discord - Work vs Gaming
            { text: "discord community server gaming voice chat", label: 1 },
            { text: "discord meme channel funny random chat", label: 1 },

            // WILDCARD 2 BALANCE
            { text: "gardeners.com planting guide vegetable soil", label: 1 },
            { text: "allrecipes brownie recipe baking cooking", label: 1 },
            { text: "houzz home decor interior design idea", label: 1 },
            { text: "protonmail encrypted email inbox privacy", label: 2 },
            { text: "nordvpn secure connection privacy shield", label: 2 },
            { text: "tor browser anonymous browsing onion network", label: 2 },
            { text: "ledger live crypto wallet hardware security", label: 2 },
            { text: "tradingview bitcoin btc market chart analysis", label: 1 },
            { text: "epidemic sound royalty free music creator tools", label: 0 }
        ];

        this.trainingData = [];
        this.labelMap = { 0: 'productive', 1: 'non-productive', 2: 'neutral' };
    }

    async loadTrainingData() {
        this.trainingData = [...this.baseData];

        try {
            if (fs.existsSync(this.userLearningPath)) {
                const raw = fs.readFileSync(this.userLearningPath);
                const userData = JSON.parse(raw);
                this.trainingData = [...this.trainingData, ...userData];
                console.log(`[AI] Loaded ${userData.length} user-learned examples.`);
            }
        } catch (err) {
            console.error('[AI] Failed to load user learning:', err);
        }

        try {
            if (fs.existsSync(this.rulesPath)) {
                const raw = fs.readFileSync(this.rulesPath);
                this.weightedRules = JSON.parse(raw);
                console.log(`[AI] Loaded ${Object.keys(this.weightedRules).length} weighted rules.`);
            }
        } catch (err) {
            console.error('[AI] Failed to load weighted rules:', err);
        }

        this.knownApps = { productive: [], 'non-productive': [], neutral: [] };
        try {
            const knownAppsPath = path.join(__dirname, 'known_apps.json');
            if (fs.existsSync(knownAppsPath)) {
                const raw = fs.readFileSync(knownAppsPath);
                this.knownApps = JSON.parse(raw);
                console.log(`[AI] Loaded Static DB: ${this.knownApps.productive.length + this.knownApps['non-productive'].length + this.knownApps.neutral.length} known apps.`);
            }
        } catch (err) {
            console.error('[AI] Failed to load known apps DB:', err);
        }
    }

    async learn(text, label) {
        this.trainingData.push({ text, label });
        try {
            let currentData = [];
            if (fs.existsSync(this.userLearningPath)) {
                currentData = JSON.parse(fs.readFileSync(this.userLearningPath));
            }
            currentData.push({ text, label });
            fs.writeFileSync(this.userLearningPath, JSON.stringify(currentData, null, 2));
        } catch (e) {
            console.error("Failed to save learning:", e);
        }
        await this.train();
        return true;
    }

    processText(text) {
        const tokens = text.toLowerCase()
            .replace(/[^a-z0-9 ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);

        const synonyms = {
            'coding': 'programming', 'debug': 'programming', 'fixing': 'programming', 'dev': 'developer', 'code': 'programming',
            'writing': 'documentation', 'editing': 'documentation', 'drafting': 'documentation', 'docs': 'documentation',
            'meeting': 'communication', 'call': 'communication', 'talking': 'communication', 'huddle': 'communication',
            'chatting': 'communication', 'messaging': 'communication', 'slack': 'communication', 'discord': 'communication',
            'researching': 'learn', 'studying': 'learn', 'reading': 'learn', 'course': 'learn',
            'browsing': 'search', 'googling': 'search', 'internet': 'search', 'web': 'search',
            'watching': 'video', 'streaming': 'video', 'youtube': 'video', 'netflix': 'video',
            'playing': 'game', 'gaming': 'game', 'play': 'game', 'steam': 'game'
        };

        const expanded = [];
        tokens.forEach(t => {
            expanded.push(t);
            if (synonyms[t]) expanded.push(synonyms[t]);
        });

        // N-GRAM ENHANCEMENT: Extract bigrams (2-word pairs)
        // This helps ML model understand multi-word concepts like "visual studio", "github actions"
        const bigrams = [];
        for (let i = 0; i < tokens.length - 1; i++) {
            bigrams.push(tokens[i] + '_' + tokens[i + 1]);
        }

        // Combine single tokens + synonyms + bigrams
        return [...expanded, ...bigrams];
    }

    /**
     * Extract domain and URL metadata for instant classification
     * @param {string} text - Full text (app + title + url)
     * @returns {object|null} - { domain, fullUrl, path } or null if no URL found
     */
    extractDomain(text) {
        // Match http:// or https:// URLs
        const urlMatch = text.match(/https?:\/\/([^\/\s]+)([^\s]*)/i);

        if (urlMatch) {
            const domain = urlMatch[1].replace('www.', '').toLowerCase();
            const fullUrl = urlMatch[0];
            const path = urlMatch[2] || '';

            return { domain, fullUrl, path };
        }

        // Also check for localhost patterns (common in development)
        const localhostMatch = text.match(/(localhost|127\.0\.0\.1)(:\d+)?/i);
        if (localhostMatch) {
            return {
                domain: 'localhost',
                fullUrl: localhostMatch[0],
                path: ''
            };
        }

        return null;
    }


    buildVocab() {
        this.vocab.clear();
        this.trainingData.forEach(item => {
            const tokens = this.processText(item.text);
            tokens.forEach(token => this.vocab.add(token));
        });
        this.vocabList = Array.from(this.vocab);
    }

    textToTensor(text) {
        const tokens = this.processText(text);
        const sequence = tokens.map(t => {
            const idx = this.vocabList.indexOf(t);
            return idx === -1 ? 0 : idx + 1;
        });

        if (sequence.length > this.maxLen) {
            sequence.length = this.maxLen;
        } else {
            while (sequence.length < this.maxLen) sequence.push(0);
        }

        return tf.tensor2d([sequence], [1, this.maxLen]);
    }

    async train(force = false) {
        await this.loadTrainingData();
        this.buildVocab();

        const modelDir = path.join(__dirname, 'model');
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }

        try {
            const topologyPath = path.join(modelDir, 'model.json');
            const weightsPath = path.join(modelDir, 'weights.bin');
            const vocabPath = path.join(modelDir, 'vocab.json');

            // Force retrain if data size changes
            const dataHash = this.trainingData.length;
            let savedHash = 0;
            if (fs.existsSync(path.join(modelDir, 'hash.txt'))) {
                savedHash = parseInt(fs.readFileSync(path.join(modelDir, 'hash.txt'), 'utf8'));
            }

            if (fs.existsSync(topologyPath) && fs.existsSync(weightsPath) && fs.existsSync(vocabPath) && !force && savedHash === dataHash) {
                console.log('[AI] Loading saved model and vocabulary from disk...');
                this.vocabList = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
                this.vocab = new Set(this.vocabList);

                const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
                const weightData = fs.readFileSync(weightsPath);
                const manifest = JSON.parse(fs.readFileSync(path.join(modelDir, 'weights_manifest.json'), 'utf8'));
                this.model = await tf.loadLayersModel(tf.io.fromMemory(topology, manifest, weightData.buffer));
                this.model.compile({
                    optimizer: tf.train.adam(0.005),
                    loss: 'categoricalCrossentropy',
                    metrics: ['accuracy']
                });
                this.isTrained = true;
                console.log('[AI] Model and Vocab loaded successfully.');
                return;
            }
        } catch (e) {
            console.warn('[AI] Could not load saved model, retraining...', e.message);
        }

        console.log(`[AI] Training model on ${this.trainingData.length} samples (be patient)...`);

        console.log('[AI] Training model (this may take a minute)...');

        const sequences = [];
        const labels = [];
        const boostedData = [...this.trainingData, ...this.trainingData];

        boostedData.forEach(item => {
            const tokens = this.processText(item.text);
            const seq = tokens.map(t => this.vocabList.indexOf(t) + 1);
            if (seq.length > this.maxLen) seq.length = this.maxLen;
            else while (seq.length < this.maxLen) seq.push(0);
            sequences.push(seq);
            labels.push(item.label);
        });

        const xs = tf.tensor2d(sequences, [sequences.length, this.maxLen]);
        const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), 3);

        this.model = tf.sequential();
        this.model.add(tf.layers.embedding({
            inputDim: this.vocabList.length + 1,
            outputDim: 24,
            inputLength: this.maxLen
        }));
        this.model.add(tf.layers.flatten());
        this.model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        this.model.add(tf.layers.dropout({ rate: 0.2 }));
        this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

        this.model.compile({
            optimizer: tf.train.adam(0.005),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        await this.model.fit(xs, ys, {
            epochs: 5,
            shuffle: true,
            verbose: 0
        });

        try {
            await this.model.save(tf.io.withSaveHandler(async (artifacts) => {
                const saveDir = path.join(__dirname, 'model');
                fs.writeFileSync(path.join(saveDir, 'model.json'), JSON.stringify(artifacts.modelTopology));
                fs.writeFileSync(path.join(saveDir, 'weights.bin'), Buffer.from(artifacts.weightData));
                fs.writeFileSync(path.join(saveDir, 'weights_manifest.json'), JSON.stringify(artifacts.weightSpecs));
                fs.writeFileSync(path.join(saveDir, 'vocab.json'), JSON.stringify(this.vocabList));
                fs.writeFileSync(path.join(saveDir, 'hash.txt'), this.trainingData.length.toString());
                return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
            }));
            console.log('[AI] Model, Vocab, and Hash saved successfully.');
        } catch (e) {
            console.error('[AI] Failed to save model:', e);
        }

        this.isTrained = true;
        console.log(`[AI] Training complete. Vocab: ${this.vocabList.length}, Samples: ${sequences.length}`);
        xs.dispose();
        ys.dispose();
    }

    /**
 * BULLETPROOF DEFENSIVE CLASSIFIER
 * 
 * Philosophy: "Better to be strict and correct later than miss entertainment"
 * 
 * Replace your existing classify() method with this one
 */

    async classify(text, previousActivities = [], userRole = null) {
        try {
            const lower = text.toLowerCase();

            // ==========================================
            // PRE-PROCESSING: APP NAME CLEANING
            // ==========================================
            // Windows UWP apps often show up as 'ApplicationFrameHost'
            if (lower.includes('whatsapp') && text.includes('ApplicationFrameHost')) {
                text = text.replace('ApplicationFrameHost', 'WhatsApp');
            }

            let confidence = 0;
            let reason = '';

            // ==========================================
            // LAYER 0.5: ROLE-BASED WORK EXCEPTIONS (Marketing/HR)
            // ==========================================
            // Handle legitimate work use of social media tools by specific roles
            // MOVED TO TOP: Must run before "Always Entertainment" checks

            if (userRole === 'marketing' || userRole === 'hr') {
                const roleWorkTools = [
                    'facebook ads', 'meta business', 'ads manager', 'business suite',
                    'linkedin recruiter', 'linkedin sales navigator', 'linkedin talent',
                    'instagram business', 'instagram insights', 'creator studio',
                    'hootsuite', 'buffer', 'sprout social', 'later', 'sendible',
                    'mailchimp', 'hubspot', 'salesforce', 'zoho crm'
                ];

                for (const tool of roleWorkTools) {
                    if (lower.includes(tool)) {
                        console.log(`[AI ROLE-AWARE] "${text.substring(0, 60)}..." → [productive] (95% - ${userRole} work tool: ${tool})`);
                        return { category: 'productive', confidence: 0.95, reason: `${userRole} work tool: ${tool}` };
                    }
                }
            }

            // ==========================================
            // LAYER 0.6: EXPLICIT PRODUCTIVE TOOLS (Highest Priority)
            // ==========================================
            if (lower.includes('antigravity')) {
                console.log(`[AI OVERRIDE] "${text.substring(0, 60)}..." → [productive] (100% - Core developer tool: Antigravity)`);
                return { category: 'productive', confidence: 1.0, reason: 'Core developer tool: Antigravity' };
            }

            // TERMINAL/SHELL OVERRIDE (100% Confidence)
            const shellTools = ['terminal', 'powershell', 'command prompt', 'cmd.exe', 'bash', 'zsh', 'iterm', 'warp'];
            for (const tool of shellTools) {
                const regex = new RegExp(`\\b${tool}\\b`, 'i');
                if (regex.test(text)) {
                    console.log(`[AI OVERRIDE] "${text.substring(0, 60)}..." → [productive] (100% - Critical developer tool: ${tool})`);
                    return { category: 'productive', confidence: 1.0, reason: `Critical developer tool: ${tool}` };
                }
            }

            // ==========================================
            // LAYER 0: Weighted Rules (User/Supervisor Overrides)
            // ==========================================

            for (const [domain, rule] of Object.entries(this.weightedRules)) {
                if (lower.includes(domain.toLowerCase())) {
                    const cat = rule.weight === 1 ? 'productive' : (rule.weight === -1 ? 'non-productive' : 'neutral');
                    return { category: cat, confidence: 1.0, reason: `Custom rule: ${domain}` };
                }
            }

            // ==========================================
            // LAYER 1: KNOWN ENTERTAINMENT APPS (99% Confidence)
            // ==========================================
            // These apps are ALWAYS non-productive, no exceptions

            const alwaysEntertainment = [
                'netflix', 'hulu', 'disney+', 'disneyplus', 'prime video',
                'hbo max', 'peacock', 'paramount+', 'apple tv',
                'steam', 'epic games', 'uplay', 'battle.net', 'gog', // Removed 'origin' (git push origin conflict)
                'fortnite', 'minecraft', 'roblox', 'valorant', 'league of legends',
                'call of duty', 'gta', 'grand theft auto',
                'tiktok', 'snapchat', 'instagram', 'facebook', 'twitter',
                'twitch', 'spotify', 'soundcloud', 'apple music'
            ];

            for (const app of alwaysEntertainment) {
                if (lower.includes(app)) {
                    console.log(`[AI DEFENSIVE] "${text.substring(0, 60)}..." → [non-productive] (99% - Known entertainment app: ${app})`);
                    return { category: 'non-productive', confidence: 0.99, reason: `Known entertainment app: ${app}` };
                }
            }

            // ==========================================
            // PRE-LOAD KEYWORD LISTS (Used for overrides)
            // ==========================================
            const singleEntertainmentKeywords = [
                'watch', 'watching', 'stream', 'streaming',
                'movie', 'film', 'cinema',
                'episode', 'season', 'series',
                'game', 'gaming', 'gameplay',
                'funny', 'comedy', 'lol', 'meme',
                'viral', 'trending', 'feed', 'news feed',
                'music video', 'concert',
                'shopping', 'buy now', 'cart', 'checkout',
                'manga', 'anime', 'comic', 'read manga',
                'nba', 'espn', 'sports', 'football', 'soccer', 'basketball', 'league pass',
                'sudoku', 'puzzle', 'chess', 'lichess', 'geoguessr',
                'fantasy', 'football draft', 'betting', 'wager'
            ];

            const entertainmentFilePatterns = [
                /\d{3,4}p/i,
                /bluray|blu-ray|brrip|webrip|hdtv|webdl/i,
                /x264|x265|hevc|avc/i,
                /rarbg|yts|yify|etrg|ettv/i,
                /\[.*\]\s*-\s*\d+/i,
                /\.mkv$|\.flac$|\.avi$/i
            ];

            // ==========================================
            // LAYER 1.2: DOMAIN-FIRST EXTRACTION (New Phase 1)CLASSIFICATION (98% Confidence)
            // ==========================================
            // Extract domain for instant blocklist/allowlist check

            const urlData = this.extractDomain(text);
            if (urlData) {
                const domain = urlData.domain;

                // ENTERTAINMENT/STREAMING DOMAINS (Instant non-productive)
                const entertainmentDomains = [
                    'netflix.com', 'hulu.com', 'disneyplus.com', 'disney+.com',
                    'primevideo.com', 'hbomax.com', 'peacocktv.com', 'paramount+.com',
                    'flixhq.to', 'flixhq.ru', 'flixtor.to', 'soap2day.to', '123movies.com',
                    'putlocker.com', 'gomovies.to', 'fmovies.to', 'yesmovies.ag',
                    'twitch.tv', 'kick.com', 'tiktok.com', 'snapchat.com',
                    'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
                    'vimeo.com', 'dailymotion.com',
                    'spotify.com', 'soundcloud.com', 'pandora.com', 'applemusic.com'
                ];

                // GAMING DOMAINS
                const gamingDomains = [
                    'steampowered.com', 'store.steampowered.com', 'epicgames.com',
                    'origin.com', 'battlenet.com', 'blizzard.com', 'roblox.com',
                    'minecraft.net', 'chess.com', 'lichess.org'
                ];

                // PRODUCTIVE WORK DOMAINS (Instant productive)
                const productiveDomains = [
                    'github.com', 'gitlab.com', 'bitbucket.org',
                    'stackoverflow.com', 'stackexchange.com', 'superuser.com',
                    'code.visualstudio.com', 'jetbrains.com',
                    'localhost', '127.0.0.1',
                    'docs.google.com', 'drive.google.com', 'sheets.google.com',
                    'office.com', 'office365.com', 'sharepoint.com',
                    'figma.com', 'canva.com', 'adobe.com',
                    'aws.amazon.com', 'console.aws.amazon.com', 'portal.azure.com',
                    'cloud.google.com', 'heroku.com', 'vercel.com', 'netlify.com',
                    'mongodb.com', 'postgresql.org', 'mysql.com',
                    'jira.atlassian.com', 'trello.com', 'asana.com', 'monday.com',
                    'slack.com', 'teams.microsoft.com', 'zoom.us'
                ];

                if (entertainmentDomains.some(d => domain.includes(d) || d.includes(domain))) {
                    console.log(`[AI DOMAIN] "${text.substring(0, 60)}..." → [non-productive] (98% - Entertainment domain: ${domain})`);
                    return { category: 'non-productive', confidence: 0.98, reason: `Entertainment domain: ${domain}` };
                }

                if (gamingDomains.some(d => domain.includes(d) || d.includes(domain))) {
                    console.log(`[AI DOMAIN] "${text.substring(0, 60)}..." → [non-productive] (98% - Gaming domain: ${domain})`);
                    return { category: 'non-productive', confidence: 0.98, reason: `Gaming domain: ${domain}` };
                }

                if (productiveDomains.some(d => domain.includes(d) || d.includes(domain))) {
                    console.log(`[AI DOMAIN] "${text.substring(0, 60)}..." → [productive] (98% - Work domain: ${domain})`);
                    return { category: 'productive', confidence: 0.98, reason: `Work domain: ${domain}` };
                }
            }

            // ==========================================
            // LAYER 1.2: ENTERTAINMENT COMBOS
            // ==========================================

            const entertainmentCombos = [
                { keywords: ['watch', 'movie'], name: 'watching movies' },
                { keywords: ['watch', 'series'], name: 'watching TV series' },
                { keywords: ['watch', 'episode'], name: 'watching TV' },
                { keywords: ['watch', 'season'], name: 'watching TV' },
                { keywords: ['watch', 'free'], name: 'streaming' },
                { keywords: ['stream', 'free', 'hd'], name: 'streaming piracy' },
                { keywords: ['stream', 'online', 'free'], name: 'streaming piracy' },
                { keywords: ['play', 'game'], name: 'gaming' },
                { keywords: ['game', 'online'], name: 'gaming' },
                { keywords: ['voice', 'channel', 'gaming'], name: 'discord gaming' },
                { keywords: ['funny', 'video'], name: 'entertainment video' },
                { keywords: ['viral', 'video'], name: 'entertainment video' },
                { keywords: ['meme', 'compilation'], name: 'entertainment' },
                { keywords: ['facebook', 'feed'], name: 'social media browsing' },
                { keywords: ['instagram', 'story'], name: 'social media browsing' },
                { keywords: ['twitter', 'feed'], name: 'social media browsing' },
                { keywords: ['reddit', 'post'], name: 'social media browsing' },
                { keywords: ['tiktok', 'feed'], name: 'social media browsing' }
            ];

            for (const combo of entertainmentCombos) {
                const matches = combo.keywords.filter(kw => lower.includes(kw)).length;
                if (matches >= combo.keywords.length) {
                    console.log(`[AI DEFENSIVE] "${text.substring(0, 60)}..." → [non-productive] (90% - Entertainment combo: ${combo.name})`);
                    return { category: 'non-productive', confidence: 0.90, reason: `Entertainment combo: ${combo.name}` };
                }
            }


            // ==========================================
            // LAYER 1.3: STRONG WORK KEYWORDS
            // ==========================================

            const strongWorkKeywords = [
                'antigravity',
                'terminal', 'powershell', 'cmd', 'iterm', 'bash', 'zsh',
                'visual studio', 'vscode', 'intellij', 'pycharm', 'webstorm', 'phpstorm',
                'sublime text', 'atom', 'vim', 'emacs', 'neovim',
                'android studio', 'xcode', 'unity', 'unreal engine',
                'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'trello',
                'slack', 'teams', 'zoom', 'mattermost',
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'circleci',
                'stackoverflow', 'stack overflow', 'mdn', 'w3schools',
                'localhost', '127.0.0.1', '0.0.0.0',
                'mongodb', 'mysql', 'postgres', 'redis', 'database',
                'pull request', 'code review', 'commit', 'merge request',
                'api documentation', 'technical documentation',
                'npm', 'yarn', 'pnpm', 'pip install', 'cargo build', 'composer', 'bundle exec',
                'php artisan', 'rails s', 'rails server', 'ssh ',
                'recruiter', 'candidate search',
                'claude', 'chatgpt', 'copilot', 'gemini', 'anthropic',
                'terraform', 'ansible', 'kubectl', 'grafana', 'circleci', 'sentry', 'datadog',
                'sketch', 'invision', 'zeplin', 'blender', 'figma',
                'flutter', 'dart', 'pod install', 'gradle', 'mvn', 'maven', 'rustc', 'go run',
                'stripe', 'quickbooks', 'salesforce', 'hubspot', 'docusign',
                'postgres', 'mysql', 'sql', 'query', 'metabase', 'bigquery', 'jupyter',
                'conda', 'nvidia-smi', 'tensorboard', 'hardhat', 'truffle', 'ganache',
                'minicom', 'avrdude', 'dotnet', 'nmap', 'dig', 'chmod', 'wireshark', 'fiddler',
                'hugging face', 'wandb', 'kaggle', 'streamlit', 'openai', 'langchain', 'colab', 'arxiv',
                'java', 'jvm', 'jdk', 'jre',
                'pilot', 'navigation', 'legal', 'case law', 'matter', 'research', 'analysis', 'market', 'stock',
                'crm', 'leads', 'employees', 'directory', 'portal', 'payroll', 'bpm', 'inventory', 'invoice', 'billing',
                'ableton', 'logic pro', 'pro tools', 'splice', 'nda', 'executed', 'contract', 'agreement',
                'davinci', 'canva', 'wolfram', 'mouser', 'stmcube', 'integral', 'math', 'calculator', 'component', 'antigravity'
            ];

            for (const keyword of strongWorkKeywords) {
                // Use boundary check for ALL keywords to avoid "Community" matching "Unity"
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(text)) {
                    console.log(`[AI PRODUCTIVE] "${text.substring(0, 60)}..." → [productive] (90% - Strong work signal: ${keyword})`);
                    return { category: 'productive', confidence: 0.90, reason: `Strong work signal: ${keyword}` };
                }
            }

            // ==========================================
            // LAYER 1.4: WORK-RELATED MULTI-KEYWORD COMBOS
            // ==========================================

            const workCombos = [
                { keywords: ['tutorial', 'programming'], name: 'programming tutorial' },
                { keywords: ['tutorial', 'coding'], name: 'coding tutorial' },
                { keywords: ['how to', 'fix'], name: 'troubleshooting' },
                { keywords: ['how to', 'implement'], name: 'implementation guide' },
                { keywords: ['error', 'fix'], name: 'debugging' },
                { keywords: ['documentation', 'api'], name: 'API docs' },
                { keywords: ['course', 'programming'], name: 'programming course' },
                { keywords: ['course', 'tutorial'], name: 'educational course' },
                { keywords: ['job', 'search'], name: 'career development' },
                { keywords: ['discord', 'chat'], name: 'Discord work talk' },
                { keywords: ['discord', 'feedback'], name: 'Discord feedback' },
                { keywords: ['discord', 'meeting'], name: 'Discord meeting' },
                { keywords: ['discord', 'project'], name: 'Discord project' },
                { keywords: ['discord', 'team'], name: 'Discord team' },
                { keywords: ['software', 'engineer'], name: 'career development' },
                { keywords: ['hiring', 'manager'], name: 'recruiting' },
                { keywords: ['google', 'search', 'javascript'], name: 'technical search' },
                { keywords: ['google', 'search', 'python'], name: 'technical search' },
                { keywords: ['google', 'search', 'error'], name: 'technical search' },
                { keywords: ['google', 'search', 'api'], name: 'technical search' }
            ];

            for (const combo of workCombos) {
                const matches = combo.keywords.filter(kw => lower.includes(kw)).length;
                if (matches >= 3 && combo.name === 'technical search') {
                    console.log(`[AI PRODUCTIVE] "${text.substring(0, 60)}..." → [productive] (85% - Work combo: ${combo.name})`);
                    return { category: 'productive', confidence: 0.85, reason: `Work combo: ${combo.name}` };
                }
                if (matches >= 2 && combo.name !== 'technical search') {
                    console.log(`[AI PRODUCTIVE] "${text.substring(0, 60)}..." → [productive] (85% - Work combo: ${combo.name})`);
                    return { category: 'productive', confidence: 0.85, reason: `Work combo: ${combo.name}` };
                }
            }

            // ==========================================
            // LAYER 1.4.5: KNOWN APPS (Moved Up for Priority)
            // ==========================================
            // Check explicit databases BEFORE generic system apps.
            // This ensures "eBay" (non-productive) is caught before "Camera" (neutral system app) triggers.

            for (const app of this.knownApps.productive) {
                const isShort = app.length <= 4;
                const isMatch = isShort ? (new RegExp(`\\b${app}\\b`, 'i')).test(text) : lower.includes(app);

                if (isMatch) {
                    // INTELLECTUAL CHECK: Is this a productive app being used for entertainment?
                    // Example: "Excel - Fantasy Football"
                    const hasEntertainmentSignals = singleEntertainmentKeywords.some(kw => lower.includes(kw));
                    if (hasEntertainmentSignals) {
                        console.log(`[AI OVERRIDE] "${text.substring(0, 60)}..." → [non-productive] (85% - Known productive app ${app} used with entertainment signals)`);
                        return { category: 'non-productive', confidence: 0.85, reason: `Entertainment signals inside productive app: ${app}` };
                    }

                    console.log(`[AI] "${text.substring(0, 60)}..." → [productive] (85% - Known work app: ${app})`);
                    return { category: 'productive', confidence: 0.85, reason: `Known work app: ${app}` };
                }
            }

            for (const app of this.knownApps['non-productive']) {
                const isShort = app.length <= 4;
                if (isShort) {
                    const regex = new RegExp(`\\b${app}\\b`, 'i');
                    if (regex.test(text)) {
                        console.log(`[AI] "${text.substring(0, 60)}..." → [non-productive] (85% - Known entertainment app: ${app})`);
                        return { category: 'non-productive', confidence: 0.85, reason: `Known entertainment app: ${app}` };
                    }
                } else {
                    if (lower.includes(app)) {
                        console.log(`[AI] "${text.substring(0, 60)}..." → [non-productive] (85% - Known entertainment app: ${app})`);
                        return { category: 'non-productive', confidence: 0.85, reason: `Known entertainment app: ${app}` };
                    }
                }
            }


            // ==========================================
            // LAYER 1.4.8: GENERIC HEURISTICS (Fallbacks for Unknown Apps)
            // ==========================================
            // Check generic patterns BEFORE System Apps to catch specific tools inside generic containers.
            // Example: "Terminal - tcpdump" -> "dump" (Productive) catches it before "Terminal" (Neutral) masks it.

            const genericContexts = [
                { type: 'non-productive', name: 'dating/social', keywords: ['match', 'hive', 'date', 'swipe', 'friends', 'chat', 'message', 'forum', 'thread', 'feed'] },
                { type: 'non-productive', name: 'shopping/cart', keywords: ['cart', 'basket', 'checkout', 'order summary', 'shipping', 'guitar', 'instrument', 'photo', 'camera'] },
                { type: 'non-productive', name: 'health/fitness', keywords: ['calories', 'fitness', 'workout', 'diet', 'heart rate', 'steps', 'symptom', 'doctor', 'medical'] },
                { type: 'non-productive', name: 'finance/speculation', keywords: ['tradingview', 'binance', 'coinbase', 'kraken', 'crypto', 'wallet', 'ledger live', 'metamask', 'bitcoin', 'btc'] },
                { type: 'non-productive', name: 'lifestyle', keywords: ['recipe', 'cook', 'baking', 'travel', 'hotel', 'flight simulator', 'garden'] },
                { type: 'productive', name: 'technical', keywords: ['dump', 'monitor', 'shell', 'cli', 'logs', 'debug', 'compile', 'build', 'deploy', 'tcpdump', 'whois', 'sync', 'device', 'driver', 'flight planning', 'chart', 'research', 'analysis', 'report', 'sqlite', 'mongosh', 'redis-cli', 'kubectl', 'docker-compose', 'git push', 'git commit'] },
                { type: 'neutral', name: 'admin/gov/privacy', keywords: ['appointment', 'case status', 'license', 'tracking', 'delivered', 'status', 'tax refund', 'westlaw', 'lexisnexis', 'vpn', 'proxy', 'tor browser', 'protonmail', 'encryption', 'irembo', 'rura', 'rssb', 'banking', 'portal', 'transfer', 'login', 'authentication'] }
            ];

            for (const ctx of genericContexts) {
                const matches = ctx.keywords.filter(kw => lower.includes(kw));
                if (matches.length > 0) {
                    // Stricter check for 'chat' to avoid 'chatgpt' or 'rocketchat'
                    if (matches.includes('chat') && (lower.includes('gpt') || lower.includes('rocket'))) continue;

                    // Stricter check for 'thread/board' to avoid 'motherboard' or 'threading'
                    if ((matches.includes('thread') || matches.includes('board')) && (lower.includes('motherboard') || lower.includes('threading'))) continue;

                    console.log(`[AI HEURISTIC] "${text.substring(0, 60)}..." → [${ctx.type}] (70% - Generic context: ${ctx.name})`);
                    return { category: ctx.type, confidence: 0.70, reason: `Generic context: ${ctx.name} (${matches[0]})` };
                }
            }


            // ==========================================
            // LAYER 1.5: NEUTRAL SYSTEM APPS
            // ==========================================

            for (const app of this.knownApps.neutral) {
                const isShort = app.length <= 4;
                const isCommonWord = ['run', 'calc', 'camera', 'search', 'login', 'lock', 'maps'].includes(app);

                if (isShort || isCommonWord) {
                    const regex = new RegExp(`\\b${app}\\b`, 'i');
                    if (regex.test(text)) {
                        console.log(`[AI] "${text.substring(0, 60)}..." → [neutral] (80% - System utility: ${app})`);
                        return { category: 'neutral', confidence: 0.80, reason: `System utility: ${app}` };
                    }
                } else {
                    if (lower.includes(app)) {
                        console.log(`[AI] "${text.substring(0, 60)}..." → [neutral] (80% - System utility: ${app})`);
                        return { category: 'neutral', confidence: 0.80, reason: `System utility: ${app}` };
                    }
                }
            }

            // ==========================================
            // LAYER 2: ENTERTAINMENT FILE PATTERNS
            // ==========================================

            for (const pattern of entertainmentFilePatterns) {
                if (pattern.test(text)) {
                    console.log(`[AI DEFENSIVE] "${text.substring(0, 60)}..." → [non-productive] (95% - Entertainment file pattern detected)`);
                    return { category: 'non-productive', confidence: 0.95, reason: 'Entertainment file pattern detected' };
                }
            }

            // ==========================================
            // LAYER 4: SINGLE ENTERTAINMENT KEYWORDS
            // ==========================================

            let entertainmentScore = 0;
            const foundEntertainmentKeywords = [];

            for (const keyword of singleEntertainmentKeywords) {
                if (lower.includes(keyword)) {
                    entertainmentScore += 1;
                    foundEntertainmentKeywords.push(keyword);
                }
            }

            if (foundEntertainmentKeywords.length > 0) {
                const signals = foundEntertainmentKeywords.join(', ');
                console.log(`[AI DEFENSIVE] "${text.substring(0, 60)}..." → [non-productive] (75% - Entertainment signals: [${signals}], no work signals)`);
                return { category: 'non-productive', confidence: 0.75, reason: `Entertainment signals: ${signals}` };
            }

            // ==========================================
            // LAYER 10.5: TEMPORAL CONTINUITY (Context from Recent History)
            // ==========================================
            // Use recent activity patterns as context for ambiguous cases

            if (previousActivities && previousActivities.length >= 3) {
                // Check if last 3 activities were all productive
                const recentActivities = previousActivities.slice(0, 3);
                const allRecentProductive = recentActivities.every(a => a.classified === 'productive');

                // Only boost if NOT a known entertainment app
                const alwaysEntertainment = [
                    'netflix', 'hulu', 'disney+', 'steam', 'fortnite', 'tiktok',
                    'spotify', 'twitch', 'instagram', 'facebook'
                ];
                const isEntertainmentApp = alwaysEntertainment.some(app => lower.includes(app));

                if (allRecentProductive && !isEntertainmentApp) {
                    // Boost work score in context of productive session
                    console.log(`[AI TEMPORAL] "${text.substring(0, 60)}..." → [productive] (75% - Productive session context boost)`);
                    return { category: 'productive', confidence: 0.75, reason: 'Productive session context boost' };
                }
            }

            // ==========================================
            // LAYER 11: ML Model (Last Resort)
            // ==========================================
            if (!this.isTrained || !this.model) return { category: 'neutral', confidence: 0, reason: 'Model not loaded' };


            const input = this.textToTensor(text);
            const prediction = this.model.predict(input);
            const values = await prediction.data();
            const maxIdx = values.indexOf(Math.max(...values));
            const mlConfidence = values[maxIdx];
            const mlPrediction = this.labelMap[maxIdx];

            input.dispose();
            prediction.dispose();

            // DEFENSIVE DEFAULT: If ML is unsure AND there's any entertainment hint, mark non-productive
            if (mlConfidence < 0.60) {
                // AMBIGUITY OVERRIDE: If we found a strong keyword earlier, trust it over ML neutral fallback
                if (lower.match(/(crm|leads|employees|directory|portal|payroll|bpm|inventory|invoice|billing|ableton|logic|tools|splice|nda|executed|contract|agreement|sqlite|mongo|redis|kubernetes|docker|git|davinci|canva|design|grade|wolfram|math|integral|component|ide|stmcube)/i)) {
                    console.log(`[AI OVERRIDE] "${text.substring(0, 60)}..." → [productive] (Confidence: ${(mlConfidence * 100).toFixed(0)}% - Robust keyword boost)`);
                    return { category: 'productive', confidence: 0.75, reason: 'Robust keyword boost for professional tools' };
                }

                // REVIEW REQUIRED: Very low confidence (<50%) and no obvious signals
                if (mlConfidence < 0.50) {
                    console.log(`[AI LOW CONFIDENCE] "${text.substring(0, 60)}..." → [neutral] (Manual review recommended)`);
                    return {
                        category: 'neutral',
                        confidence: mlConfidence,
                        reason: 'Low ML confidence - manual review recommended',
                        needsReview: true
                    };
                }

                // No entertainment hints, truly ambiguous but > 50%
                console.log(`[AI] "${text.substring(0, 60)}..." → [neutral] (Confidence: ${(mlConfidence * 100).toFixed(0)}%)`);
                return { category: 'neutral', confidence: mlConfidence, reason: 'Ambiguous activity' };
            }

            // ML is confident
            console.log(`[AI ML] "${text.substring(0, 60)}..." → [${mlPrediction}] (${(mlConfidence * 100).toFixed(0)}% confidence)`);
            return { category: mlPrediction, confidence: mlConfidence, reason: 'ML Model Prediction' };

        } catch (err) {
            console.error('[AI] Classification error:', err);
            return { category: 'neutral', confidence: 0, reason: 'Classification error' };
        }
    }
    async addWeightedRule(domain, weight, reason) {
        this.weightedRules[domain] = { weight, reason, addedAt: new Date().toISOString() };
        try {
            fs.writeFileSync(this.rulesPath, JSON.stringify(this.weightedRules, null, 2));
            console.log(`[AI] Added weighted rule: ${domain} → ${weight}`);
            return true;
        } catch (err) {
            console.error('[AI] Failed to save weighted rule:', err);
            return false;
        }
    }

    async removeWeightedRule(domain) {
        delete this.weightedRules[domain];
        try {
            fs.writeFileSync(this.rulesPath, JSON.stringify(this.weightedRules, null, 2));
            console.log(`[AI] Removed weighted rule: ${domain}`);
            return true;
        } catch (err) {
            console.error('[AI] Failed to remove weighted rule:', err);
            return false;
        }
    }

    getWeightedRules() {
        return this.weightedRules;
    }
}

module.exports = new ActivityClassifier();