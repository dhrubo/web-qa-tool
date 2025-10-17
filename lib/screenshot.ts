
import { chromium, Page } from 'playwright';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import os from 'os';
import path from 'path';

const ORIGINAL_DELAY = 30000; // 30 seconds for original page
const ALPHA_DELAY = 45000; // 45 seconds for alpha page - longer to ensure all lazy-loaded images appear

export async function takeScreenshots(page: Page, url: string): Promise<{ original: string, alpha: string, diff: string, diffPixels: number }> {
  console.log(`Taking screenshots for ${url}...`);

  try {
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_');
    // Use temp directory that works in Railway
    const screenshotDir = path.join(os.tmpdir(), 'screenshots', urlSlug);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const originalPath = `${screenshotDir}/original.png`;
    const alphaPath = `${screenshotDir}/alpha.png`;
    const diffPath = `${screenshotDir}/diff.png`;

    console.log(`Navigating to original URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Try to accept cookies - wait a bit for cookie banner to appear
    console.log(`Waiting for cookie banner...`);
    await page.waitForTimeout(2000);
    
    // Try multiple common cookie accept button selectors
    const cookieSelectors = [
      'button:has-text("Accept All")',
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("Agree")',
      'button:has-text("I agree")',
      'button:has-text("OK")',
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="cookie"]',
      'a:has-text("Accept")',
      '#onetrust-accept-btn-handler',
      '.cookie-accept',
      '.accept-cookies',
    ];
    
    for (const selector of cookieSelectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`Clicking cookie accept button: ${selector}`);
          await button.click();
          await page.waitForTimeout(1000); // Wait for animation
          break;
        }
      } catch (e) {
        // Button not found, try next selector
      }
    }
    
    // Scroll to bottom to trigger lazy loading
    console.log(`Scrolling to trigger lazy-loaded images...`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    
    console.log(`Waiting ${ORIGINAL_DELAY}ms for images to load...`);
    await page.waitForTimeout(ORIGINAL_DELAY);
    console.log(`Taking original screenshot...`);
    await page.screenshot({ path: originalPath, fullPage: true });
    console.log(`Original screenshot saved to ${originalPath}`);

    const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
    console.log(`Navigating to alpha URL: ${alphaUrl}`);
    await page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Accept cookies again for alpha page
    console.log(`Waiting for cookie banner on alpha page...`);
    await page.waitForTimeout(2000);
    
    for (const selector of cookieSelectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`Clicking cookie accept button on alpha page: ${selector}`);
          await button.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        // Button not found, try next selector
      }
    }
    
    // Scroll to bottom to trigger lazy loading - extra important for alpha page
    console.log(`Scrolling alpha page to trigger lazy-loaded images...`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000); // Wait longer for images to start loading
    
    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);
    
    console.log(`Waiting ${ALPHA_DELAY}ms for images to load...`);
    await page.waitForTimeout(ALPHA_DELAY);
    console.log(`Taking alpha screenshot...`);
    await page.screenshot({ path: alphaPath, fullPage: true });
    console.log(`Alpha screenshot saved to ${alphaPath}`);

    // Read images as base64 for embedding in response
    console.log(`Converting screenshots to base64...`);
    const originalBase64 = `data:image/png;base64,${fs.readFileSync(originalPath).toString('base64')}`;
    const alphaBase64 = `data:image/png;base64,${fs.readFileSync(alphaPath).toString('base64')}`;

    // Clean up temp files after encoding
    try {
      fs.unlinkSync(originalPath);
      fs.unlinkSync(alphaPath);
      fs.rmdirSync(screenshotDir);
    } catch (e) {
      console.log('Could not clean up temp files:', e);
    }

    console.log(`Screenshot generation complete!`);
    return {
      original: originalBase64,
      alpha: alphaBase64,
      diff: '', // No diff image
      diffPixels: 0, // No pixel comparison
    };
  } catch (error) {
    console.error('Error in takeScreenshots:', error);
    throw error;
  }
}
