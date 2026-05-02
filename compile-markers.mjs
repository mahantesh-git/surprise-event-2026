/**
 * compile-markers.mjs
 * Compiles all marker images in /public/markers/ to .mind format
 * using mind-ar's Node.js compiler API.
 *
 * Usage: node compile-markers.mjs
 * Or:    node compile-markers.mjs 1 3 5  (compile only rounds 1, 3, 5)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MARKERS_DIR = path.join(__dirname, 'frontend', 'public', 'markers');
const TARGETS_DIR = path.join(__dirname, 'frontend', 'public', 'targets');

// ─── Ensure output directory exists ────────────────────────────
if (!fs.existsSync(TARGETS_DIR)) fs.mkdirSync(TARGETS_DIR, { recursive: true });

// ─── Determine which rounds to compile ─────────────────────────
const roundArgs = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n > 0);
const TOTAL_ROUNDS = 10;
const rounds = roundArgs.length > 0 ? roundArgs : Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);

console.log('\n╔═══════════════════════════════════════╗');
console.log('║  QUEST AR — Marker Compiler           ║');
console.log('╚═══════════════════════════════════════╝\n');

// ─── Import mind-ar OfflineCompiler ───────────────────────
let Compiler;
try {
  const mod = await import('mind-ar/src/image-target/offline-compiler.js');
  Compiler = mod.OfflineCompiler;
} catch (err) {
  console.error('❌ Failed to load mind-ar compiler:', err.message);
  console.log('\n💡 Try running: npm install mind-ar canvas --ignore-scripts\n');
  process.exit(1);
}

// ─── Load image as ImageData (using canvas) ─────────────────────
async function loadImageAsImageData(imagePath) {
  const { createCanvas, loadImage } = await import('canvas').catch(() => {
    throw new Error('canvas module not found. Run: npm install canvas --ignore-scripts');
  });
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

// ─── Compile one round ──────────────────────────────────────────
async function compileRound(round) {
  const inputFile = path.join(MARKERS_DIR, `r${round}.jpg`);
  const outputFile = path.join(TARGETS_DIR, `r${round}.mind`);

  if (!fs.existsSync(inputFile)) {
    console.log(`  ⏭  r${round}: Skipped (r${round}.jpg not found)`);
    return false;
  }

  console.log(`  🔄 r${round}: Compiling ${path.basename(inputFile)}...`);

  try {
    const imageData = await loadImageAsImageData(inputFile);
    const compiler = new Compiler();
    await compiler.compileImageTargets([imageData], (progress) => {
      process.stdout.write(`\r      Progress: ${Math.round(progress * 100)}%   `);
    });
    process.stdout.write('\n');

    const exportedBuffer = await compiler.exportData();
    fs.writeFileSync(outputFile, Buffer.from(exportedBuffer));
    console.log(`  ✅ r${round}: Saved to ${path.basename(outputFile)}\n`);
    return true;
  } catch (err) {
    console.error(`  ❌ r${round}: Failed — ${err.message}\n`);
    return false;
  }
}

// ─── Main ───────────────────────────────────────────────────────
let success = 0, skipped = 0, failed = 0;

for (const round of rounds) {
  const result = await compileRound(round);
  if (result === true) success++;
  else if (result === false) skipped++;
  else failed++;
}

console.log('─────────────────────────────────────────');
console.log(`  ✅ Compiled: ${success}   ⏭  Skipped: ${skipped}   ❌ Failed: ${failed}`);
console.log('─────────────────────────────────────────\n');

if (success > 0) {
  console.log('📁 Output files saved to: frontend/public/targets/');
  console.log('🚀 You can now test AR in the app!\n');
}
