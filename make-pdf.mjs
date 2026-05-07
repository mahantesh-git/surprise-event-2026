import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  const htmlFile = path.join(__dirname, 'briefing.html');
  const pdfFile = path.join(__dirname, 'briefing.pdf');

  if (!fs.existsSync(htmlFile)) {
    console.error('❌ Error: briefing.html not found!');
    process.exit(1);
  }

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  QUEST — Mission Briefing PDF Gen     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  console.log('  🌐 Launching headless browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    const page = await browser.newPage();
    
    console.log('  📄 Loading briefing.html...');
    // Use absolute file path with file:// protocol
    const fileUrl = `file://${htmlFile}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    console.log('  🎨 Generating PDF layout...');
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    console.log('\n  ✅ SUCCESS: briefing.pdf has been generated.');
    console.log(`  📍 Path: ${pdfFile}\n`);

  } catch (error) {
    console.error(`\n  ❌ FAILED: ${error.message}`);
  } finally {
    await browser.close();
  }
}

generatePDF();
