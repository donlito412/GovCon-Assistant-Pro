const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            walk(filePath);
        } else if (file === 'page.tsx' || file === 'page.js') {
            processFile(filePath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes("export const dynamic = 'force-dynamic'")) {
        console.log(`Updating ${filePath}`);
        const dynamicLine = "export const dynamic = 'force-dynamic';\n";
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, '', dynamicLine);
        } else {
            lines.unshift(dynamicLine, '');
        }
        fs.writeFileSync(filePath, lines.join('\n'));
    }
}

walk('./app/(dashboard)');
