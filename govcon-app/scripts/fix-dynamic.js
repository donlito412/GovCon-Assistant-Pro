const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            walk(filePath);
        } else if (file === 'route.ts' || file === 'route.js' || file === 'page.tsx' || file === 'page.js') {
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
        let insertIndex = 0;
        
        // Skip 'use client' or 'use server'
        if (lines[0].trim().startsWith("'use client'") || lines[0].trim().startsWith('"use client"') ||
            lines[0].trim().startsWith("'use server'") || lines[0].trim().startsWith('"use server"')) {
            insertIndex = 1;
        }
        
        lines.splice(insertIndex, 0, dynamicLine);
        fs.writeFileSync(filePath, lines.join('\n'));
    }
}

walk('./app/api');
walk('./app/(dashboard)');
