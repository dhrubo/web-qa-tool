
import { chromium, Page } from 'playwright';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import os from 'os';
import path from 'path';

// Use public directory for serving screenshots
const getPublicScreenshotDir = () => {
  return path.join(process.cwd(), 'public', 'screenshots');
};

// Clean up old screenshots (older than 1 hour)
export function cleanupOldScreenshots() {
  try {
    const screenshotDir = getPublicScreenshotDir();
    if (!fs.existsSync(screenshotDir)) return;

    const files = fs.readdirSync(screenshotDir);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    files.forEach(file => {
      const filePath = path.join(screenshotDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old screenshot: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up screenshots:', error);
  }
}

// Full mode delays (single-alpha - more thorough)
const ORIGINAL_DELAY = 20000; // 20 seconds for original page (reduced from 30s)
const ALPHA_DELAY = 35000; // 35 seconds for alpha page (reduced from 50s)

// Desktop-only mode delays (multi-desktop) - Optimized to prevent timeout
const DESKTOP_ORIGINAL_DELAY = 12000; // 12 seconds for original page (reduced from 17s)
const DESKTOP_ALPHA_DELAY = 20000; // 20 seconds for alpha page (reduced from 30s)

// Most common mobile viewport - iPhone 12/13/14 Pro
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// Cookie selectors for reuse
const COOKIE_SELECTORS = [
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
async function acceptCookies(page: Page) {
  await page.waitForTimeout(2000);
  for (const selector of COOKIE_SELECTORS) {
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
}

// Helper function to wait for images to load
async function waitForImages(page: Page, maxWait: number = 5000) {
  await page.evaluate((timeout) => {
    return Promise.race([
      Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      ),
      new Promise(resolve => setTimeout(resolve, timeout))
    ]);
  }, maxWait);
}

// Helper function to scroll and wait (optimized)
async function scrollAndWait(page: Page, delay: number) {
  console.log(`Scrolling to trigger lazy-loaded images...`);
  
  // Quick scroll to bottom and back
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000); // Reduced from 3000ms
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500); // Reduced from 2000ms
  
  console.log(`Waiting for images to load (max ${delay}ms)...`);
  
  // Wait for images with timeout
  await waitForImages(page, delay);
  
  // Small additional buffer for late loaders
  await page.waitForTimeout(2000);
}

// Enhanced lazy-load function for alpha pages (optimized aggressive scroll)
async function aggressiveScrollAndWait(page: Page, delay: number) {
  console.log(`[ALPHA] Performing optimized aggressive scroll...`);
  
  // Get page height
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  
  // Scroll in larger increments (faster) - 80% overlap instead of 70%
  const scrollSteps = Math.ceil(scrollHeight / (viewportHeight * 0.8));
  console.log(`[ALPHA] Page height: ${scrollHeight}px, will scroll ${scrollSteps} times`);
  
  for (let i = 0; i <= scrollSteps; i++) {
    const scrollTo = Math.min((viewportHeight * 0.8) * i, scrollHeight);
    await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await page.waitForTimeout(800); // Reduced from 1500ms
  }
  
  // Scroll to absolute bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000); // Reduced from 3000ms
  
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500); // Reduced from 2000ms
  
  // Wait for images intelligently
  console.log(`[ALPHA] Waiting for images to load (max ${delay}ms)...`);
  await waitForImages(page, delay);
  
  // Small buffer for stragglers
  await page.waitForTimeout(2000);
  
  console.log(`[ALPHA] Optimized aggressive scroll complete`);
}

// Helper function to capture a single screenshot with navigation
async function captureScreenshot(
  page: Page,
  url: string,
  filepath: string,
  isAlpha: boolean,
  delay: number,
  viewport: { width: number; height: number } | null,
  onProgress?: (message: string) => void
): Promise<void> {
  const log = (msg: string) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  const targetUrl = isAlpha 
    ? (url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`)
    : url;

  const viewportType = viewport ? 'mobile' : 'desktop';
  const versionType = isAlpha ? 'alpha' : 'original';

  log(`📄 Navigating to ${versionType} URL (${viewportType})...`);
  
  if (viewport) {
    await page.setViewportSize(viewport);
  }
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  
  if (isAlpha) {
    log(`⏳ [ALPHA] Performing aggressive scroll (${delay / 1000}s) to load lazy images...`);
    await aggressiveScrollAndWait(page, delay);
  } else {
    log(`⏳ Scrolling page and waiting ${delay / 1000}s for images to load...`);
    await scrollAndWait(page, delay);
  }
  
  log(`📸 Taking ${viewportType} ${versionType} screenshot...`);
  await page.screenshot({ path: filepath, fullPage: true });
}

// Desktop-only screenshots (optimized for multi-URL mode) - NOW WITH PARALLEL EXECUTION
export async function takeDesktopScreenshots(
  page: Page, 
  url: string,
  onProgress?: (message: string) => void
): Promise<{ 
  desktopOriginal: string, 
  desktopAlpha: string 
}> {
  const log = (msg: string) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  log(`Taking DESKTOP-ONLY screenshots for ${url}... (PARALLEL MODE - 2x faster)`);

  try {
    const timestamp = Date.now();
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const screenshotDir = getPublicScreenshotDir();
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const desktopOriginalFilename = `${urlSlug}_${timestamp}_desktop_original.png`;
    const desktopAlphaFilename = `${urlSlug}_${timestamp}_desktop_alpha.png`;
    
    const desktopOriginalPath = path.join(screenshotDir, desktopOriginalFilename);
    const desktopAlphaPath = path.join(screenshotDir, desktopAlphaFilename);

    // Get browser instance from the page
    const browser = page.context().browser();
    if (!browser) {
      throw new Error('Browser instance not available');
    }

    // Create two parallel contexts for original and alpha
    log(`🚀 Creating parallel browser contexts...`);
    const [contextOriginal, contextAlpha] = await Promise.all([
      browser.newContext({ viewport: { width: 1280, height: 1080 }, deviceScaleFactor: 1 }),
      browser.newContext({ viewport: { width: 1280, height: 1080 }, deviceScaleFactor: 1 })
    ]);

    const [pageOriginal, pageAlpha] = await Promise.all([
      contextOriginal.newPage(),
      contextAlpha.newPage()
    ]);

    // ===== PARALLEL DESKTOP SCREENSHOTS =====
    log(`⚡ Capturing original and alpha in parallel...`);
    
    await Promise.all([
      captureScreenshot(pageOriginal, url, desktopOriginalPath, false, DESKTOP_ORIGINAL_DELAY, null, onProgress),
      captureScreenshot(pageAlpha, url, desktopAlphaPath, true, DESKTOP_ALPHA_DELAY, null, onProgress)
    ]);

    // Clean up contexts
    await Promise.all([
      contextOriginal.close(),
      contextAlpha.close()
    ]);

    // Return file paths (not base64)
    log(`✅ Desktop screenshot generation complete! (Parallel mode)`);
    return {
      desktopOriginal: `/screenshots/${desktopOriginalFilename}`,
      desktopAlpha: `/screenshots/${desktopAlphaFilename}`,
    };
  } catch (error) {
    console.error('Error in takeDesktopScreenshots:', error);
    throw error;
  }
}

// Full screenshots including mobile (for single-alpha mode)
export async function takeScreenshots(
  page: Page, 
  url: string,
  onProgress?: (message: string) => void
): Promise<{ 
  desktopOriginal: string, 
  desktopAlpha: string, 
  mobileOriginal: string, 
  mobileAlpha: string 
}> {
  const log = (msg: string) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  log(`Taking FULL screenshots (desktop + mobile) for ${url}...`);

  try {
    const timestamp = Date.now();
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const screenshotDir = getPublicScreenshotDir();
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const desktopOriginalFilename = `${urlSlug}_${timestamp}_desktop_original.png`;
    const desktopAlphaFilename = `${urlSlug}_${timestamp}_desktop_alpha.png`;
    const mobileOriginalFilename = `${urlSlug}_${timestamp}_mobile_original.png`;
    const mobileAlphaFilename = `${urlSlug}_${timestamp}_mobile_alpha.png`;
    
    const desktopOriginalPath = path.join(screenshotDir, desktopOriginalFilename);
    const desktopAlphaPath = path.join(screenshotDir, desktopAlphaFilename);
    const mobileOriginalPath = path.join(screenshotDir, mobileOriginalFilename);
    const mobileAlphaPath = path.join(screenshotDir, mobileAlphaFilename);

    // Get browser instance from the page
    const browser = page.context().browser();
    if (!browser) {
      throw new Error('Browser instance not available');
    }

    // Create two parallel contexts for original and alpha
    log(`� Creating parallel browser contexts...`);
    const [contextOriginal, contextAlpha] = await Promise.all([
      browser.newContext({ viewport: { width: 1280, height: 1080 }, deviceScaleFactor: 1 }),
      browser.newContext({ viewport: { width: 1280, height: 1080 }, deviceScaleFactor: 1 })
    ]);

    const [pageOriginal, pageAlpha] = await Promise.all([
      contextOriginal.newPage(),
      contextAlpha.newPage()
    ]);

    // ===== DESKTOP SCREENSHOTS IN PARALLEL =====
    log(`\n===== �️  DESKTOP SCREENSHOTS =====`);
    log(`⚡ Capturing desktop original and alpha in parallel...`);
    
    await Promise.all([
      captureScreenshot(pageOriginal, url, desktopOriginalPath, false, ORIGINAL_DELAY, null, onProgress),
      captureScreenshot(pageAlpha, url, desktopAlphaPath, true, ALPHA_DELAY, null, onProgress)
    ]);

    // ===== MOBILE SCREENSHOTS IN PARALLEL =====
    log(`\n===== 📱 MOBILE SCREENSHOTS =====`);
    log(`⚡ Capturing mobile original and alpha in parallel...`);
    
    await Promise.all([
      captureScreenshot(pageOriginal, url, mobileOriginalPath, false, ORIGINAL_DELAY, MOBILE_VIEWPORT, onProgress),
      captureScreenshot(pageAlpha, url, mobileAlphaPath, true, ALPHA_DELAY, MOBILE_VIEWPORT, onProgress)
    ]);

    // Clean up contexts
    await Promise.all([
      contextOriginal.close(),
      contextAlpha.close()
    ]);

    // Return file paths (not base64)
    log(`✅ Screenshot generation complete! (4 screenshots: 2 desktop + 2 mobile) - PARALLEL MODE 2x faster`);
    return {
      desktopOriginal: `/screenshots/${desktopOriginalFilename}`,
      desktopAlpha: `/screenshots/${desktopAlphaFilename}`,
      mobileOriginal: `/screenshots/${mobileOriginalFilename}`,
      mobileAlpha: `/screenshots/${mobileAlphaFilename}`,
    };
  } catch (error) {
    console.error('Error in takeScreenshots:', error);
    throw error;
  }
}
