const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/\bbackdrop-blur-[a-z0-9]+\b/g, '');
  content = content.replace(/backdropFilter:\s*['"]blur\([^)]+\)['"]/g, '');
  content = content.replace(/backdrop-filter:\s*blur\([^)]+\);?/g, '');
  
  // Clean up multiple spaces that might have been left
  content = content.replace(/ className=\"\s+/g, ' className=\"');
  content = content.replace(/\s+\"/g, '\"');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
