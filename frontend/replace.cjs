const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Colors
    content = content.replace(/#95FF00/g, 'var(--color-accent)');
    content = content.replace(/#15171A/g, 'var(--color-bg-void)');
    content = content.replace(/#0B0C0D/g, 'var(--color-bg-surface)');
    content = content.replace(/#FF0033/g, 'var(--color-accent)');

    // Common Button Replacements (Tailwind classes)
    content = content.replace(/variant="sage"/g, 'className="btn-primary"');
    content = content.replace(/variant="ink"/g, 'className="btn-secondary"');

    // Remove the previous corner-card redundant classes since index.css handles it now
    content = content.replace(/bg-black\/40 backdrop-blur-xl p-10 border border-white\/5 relative/g, 'backdrop-blur-xl relative');
    content = content.replace(/bg-black\/40 backdrop-blur-xl p-8 border border-white\/5 relative/g, 'backdrop-blur-xl relative p-8');
    content = content.replace(/bg-black\/40/g, 'bg-[var(--color-bg-surface)]');

    // Card/Container Backgrounds
    content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-[var(--color-accent-fill)]');

    // We can also remove <div className="corner-br" /> <div className="corner-bl" /> since clip-oct does not use them
    content = content.replace(/<div className="corner-br" \/>\s*<div className="corner-bl" \/>/g, '');

    // Replace dm-mono with ibm-plex-mono
    content = content.replace(/dm-mono/g, 'ibm-plex-mono');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceInFile(fullPath);
        }
    }
}

traverseDir(directoryPath);
