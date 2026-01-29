
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
const componentsDir = path.join(__dirname, 'frontend', 'src', 'components');

const dirs = [pagesDir, componentsDir];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (file.endsWith('.jsx') || file.endsWith('.js')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('user.userId')) {
                console.log(`Fixing ${filePath}`);
                // Regex to replace user.userId with user.id, but be careful not to double replace
                content = content.replace(/user\.userId/g, 'user.id');
                fs.writeFileSync(filePath, content);
            }
        }
    });
});
console.log('Frontend patch complete.');
