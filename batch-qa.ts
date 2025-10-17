import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
const BATCH_SIZE = 10;
async function main() {
  console.log('Starting batch QA process...');
  // Read URLs from the CSV file
  const csvContent = fs.readFileSync('/Users/dhrubo.paul/Sites/audi/web-qa-tool/app/http_urls.csv', 'utf-8');
  const urls = csvContent.split('\n').filter(line => line.trim() !== '').map(line => line.split(',')[0]);
  console.log(`Found ${urls.length} URLs to process.`);
  // We will process the URLs in batches
  const url = urls[0];
  await takeScreenshots(url);

  console.log('Batch QA process finished.');
}
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import { analyzeImages } from './lib/vertexAiService.js';
const ALPHA_DELAY = 10000; // 10 seconds
async function takeScreenshots(url: string) {
  console.log(`Taking screenshots for ${url}...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    // Create a directory for the URL
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_');
    const screenshotDir = `/Users/dhrubo.paul/Sites/audi/web-qa-tool/screenshots/${urlSlug}`;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    // Take screenshot of the original URL
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(ALPHA_DELAY);
    await page.screenshot({ path: `${screenshotDir}/original.png`, fullPage: true });
    // Take screenshot of the URL with ?d_alpha=true
    const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
    await page.goto(alphaUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(ALPHA_DELAY);
    await page.screenshot({ path: `${screenshotDir}/alpha.png`, fullPage: true });
    console.log(`Screenshots for ${url} saved to ${screenshotDir}`);

    const img1 = PNG.sync.read(fs.readFileSync(`${screenshotDir}/original.png`));
    const img2 = PNG.sync.read(fs.readFileSync(`${screenshotDir}/alpha.png`));
    console.log(`Image 1 dimensions: ${img1.width}x${img1.height}`);
    console.log(`Image 2 dimensions: ${img2.width}x${img2.height}`);
    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });

    fs.writeFileSync(`${screenshotDir}/diff.png`, PNG.sync.write(diff));

    console.log(`Number of different pixels for ${url}: ${numDiffPixels}`);

  } catch (error) {
    console.error(`Failed to take screenshots for ${url}:`, error);
  } finally {
    await browser.close();
  }
}
main().catch(console.error);
