
import { chromium, Page } from 'playwright';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import os from 'os';
import path from 'path';

const ORIGINAL_DELAY = 30000; // 30 seconds for original page
const ALPHA_DELAY = 45000; // 45 seconds for alpha page - longer to ensure all lazy-loaded images appear

// Most common mobile viewport - iPhone 12/13/14 Pro
const MOBILE_VIEWPORT = { width: 390, height: 844 };

export async function takeScreenshots(page: Page, url: string): Promise<{ 
  desktopOriginal: string, 
  desktopAlpha: string, 
  mobileOriginal: string, 
  mobileAlpha: string 
}> {
  console.log(`Taking screenshots for ${url}...`);

  try {
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_');
    // Use temp directory that works in Railway
    const screenshotDir = path.join(os.tmpdir(), 'screenshots', urlSlug);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const desktopOriginalPath = `${screenshotDir}/desktop-original.png`;
    const desktopAlphaPath = `${screenshotDir}/desktop-alpha.png`;
    const mobileOriginalPath = `${screenshotDir}/mobile-original.png`;
    const mobileAlphaPath = `${screenshotDir}/mobile-alpha.png`;

    // Cookie selectors for reuse
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

    // Helper function to accept cookies
    const acceptCookies = async () => {
      await page.waitForTimeout(2000);
      for (const selector of cookieSelectors) {
        try {
          const button = await page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            console.log(`Clicking cookie accept button: ${selector}`);
            await button.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Button not found, try next selector
        }
      }
    };

    // Helper function to scroll and wait
    const scrollAndWait = async (delay: number) => {
      console.log(`Scrolling to trigger lazy-loaded images...`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2000);
      console.log(`Waiting ${delay}ms for images to load...`);
      await page.waitForTimeout(delay);
    };

    // ===== DESKTOP SCREENSHOTS =====
    console.log(`\n===== DESKTOP SCREENSHOTS =====`);
    console.log(`Navigating to original URL (desktop): ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies();
    await scrollAndWait(ORIGINAL_DELAY);
    console.log(`Taking desktop original screenshot...`);
    await page.screenshot({ path: desktopOriginalPath, fullPage: true });

    const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
    console.log(`Navigating to alpha URL (desktop): ${alphaUrl}`);
    await page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies();
    await scrollAndWait(ALPHA_DELAY);
    console.log(`Taking desktop alpha screenshot...`);
    await page.screenshot({ path: desktopAlphaPath, fullPage: true });

    // ===== MOBILE SCREENSHOTS =====
    console.log(`\n===== MOBILE SCREENSHOTS =====`);
    console.log(`Setting viewport to mobile (390x844)...`);
    await page.setViewportSize(MOBILE_VIEWPORT);

    console.log(`Navigating to original URL (mobile): ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies();
    await scrollAndWait(ORIGINAL_DELAY);
    console.log(`Taking mobile original screenshot...`);
    await page.screenshot({ path: mobileOriginalPath, fullPage: true });

    console.log(`Navigating to alpha URL (mobile): ${alphaUrl}`);
    await page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies();
    await scrollAndWait(ALPHA_DELAY);
    console.log(`Taking mobile alpha screenshot...`);
    await page.screenshot({ path: mobileAlphaPath, fullPage: true });

    // Read images as base64 for embedding in response
    console.log(`\nConverting screenshots to base64...`);
    const desktopOriginalBase64 = `data:image/png;base64,${fs.readFileSync(desktopOriginalPath).toString('base64')}`;
    const desktopAlphaBase64 = `data:image/png;base64,${fs.readFileSync(desktopAlphaPath).toString('base64')}`;
    const mobileOriginalBase64 = `data:image/png;base64,${fs.readFileSync(mobileOriginalPath).toString('base64')}`;
    const mobileAlphaBase64 = `data:image/png;base64,${fs.readFileSync(mobileAlphaPath).toString('base64')}`;

    // Clean up temp files after encoding
    try {
      fs.unlinkSync(desktopOriginalPath);
      fs.unlinkSync(desktopAlphaPath);
      fs.unlinkSync(mobileOriginalPath);
      fs.unlinkSync(mobileAlphaPath);
      fs.rmdirSync(screenshotDir);
    } catch (e) {
      console.log('Could not clean up temp files:', e);
    }

    console.log(`Screenshot generation complete! (4 screenshots: 2 desktop + 2 mobile)`);
    return {
      desktopOriginal: desktopOriginalBase64,
      desktopAlpha: desktopAlphaBase64,
      mobileOriginal: mobileOriginalBase64,
      mobileAlpha: mobileAlphaBase64,
    };
  } catch (error) {
    console.error('Error in takeScreenshots:', error);
    throw error;
  }
}
