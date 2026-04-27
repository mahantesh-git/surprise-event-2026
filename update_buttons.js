const fs = require('fs');
const file = './frontend/src/components/RunnerGame.tsx';
let content = fs.readFileSync(file, 'utf8');
const original = content;

// Replace raw <button> with clip-oct
content = content.replace(/<button([^>]*?)className=\"([^\"]*?)rounded-[a-z]+([^\"]*?)\"/g, '<button$1className=\"$2clip-oct$3\"');

if (content !== original) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated RunnerGame.tsx');
}
