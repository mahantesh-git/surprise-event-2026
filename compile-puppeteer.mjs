import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MARKERS_DIR = path.join(__dirname, 'frontend', 'public', 'markers');
const TARGETS_DIR = path.join(__dirname, 'frontend', 'public', 'targets');

if (!fs.existsSync(TARGETS_DIR)) fs.mkdirSync(TARGETS_DIR, { recursive: true });

const roundArgs = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n > 0);
const TOTAL_ROUNDS = 10;
const rounds = roundArgs.length > 0 ? roundArgs : Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);

console.log('\n╔═══════════════════════════════════════╗');
console.log('║  QUEST AR — Headless Marker Compiler  ║');
console.log('╚═══════════════════════════════════════╝\n');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Create a temporary download path
  const downloadPath = path.join(__dirname, 'temp_downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  console.log('  🌐 Opening MindAR online compiler...');
  await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile/', { waitUntil: 'networkidle2' });

  let success = 0, skipped = 0, failed = 0;

  for (const round of rounds) {
    const inputFile = path.join(MARKERS_DIR, `r${round}.jpg`);
    const outputFile = path.join(TARGETS_DIR, `r${round}.mind`);

    if (!fs.existsSync(inputFile)) {
      console.log(`  ⏭  r${round}: Skipped (r${round}.jpg not found)`);
      skipped++;
      continue;
    }

    console.log(`  🔄 r${round}: Uploading and compiling ${path.basename(inputFile)}...`);

    try {
      // Find the file input and upload
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(inputFile);
      
      // Click start
      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent.includes('Start'));
      });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const startBtn = btns.find(b => b.textContent.includes('Start'));
        if(startBtn) startBtn.click();
      });

      console.log(`  ⏳ r${round}: Waiting for compilation to finish (this takes 10-30s)...`);
      
      // Wait for Download button
      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent.includes('Download'));
      }, { timeout: 60000 });

      console.log(`  ⬇️ r${round}: Downloading compiled .mind file...`);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dlBtn = btns.find(b => b.textContent.includes('Download'));
        if(dlBtn) dlBtn.click();
      });

      // Wait for file to appear in temp_downloads
      let downloadedFile;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const files = fs.readdirSync(downloadPath);
        const mindFile = files.find(f => f.endsWith('.mind'));
        if (mindFile) {
          downloadedFile = path.join(downloadPath, mindFile);
          break;
        }
      }

      if (downloadedFile) {
        fs.renameSync(downloadedFile, outputFile);
        console.log(`  ✅ r${round}: Saved to ${path.basename(outputFile)}\n`);
        success++;
      } else {
        throw new Error('Download timed out');
      }

    } catch (err) {
      console.error(`  ❌ r${round}: Failed — ${err.message || err}\n`);
      failed++;
    }
  }

  await browser.close();
  if (fs.existsSync(downloadPath)) fs.rmSync(downloadPath, { recursive: true, force: true });

  console.log('─────────────────────────────────────────');
  console.log(`  ✅ Compiled: ${success}   ⏭  Skipped: ${skipped}   ❌ Failed: ${failed}`);
  console.log('─────────────────────────────────────────\n');
})();
