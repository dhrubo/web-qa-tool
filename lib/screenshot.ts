
import { chromium, Page } from 'playwright';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import os from 'os';
import path from 'path';

const ALPHA_DELAY = 20000; // 20 seconds - increased to allow images to fully load

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
    console.log(`Waiting ${ALPHA_DELAY}ms for images to load...`);
    await page.waitForTimeout(ALPHA_DELAY);
    console.log(`Taking original screenshot...`);
    await page.screenshot({ path: originalPath, fullPage: true });
    console.log(`Original screenshot saved to ${originalPath}`);

    const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
    console.log(`Navigating to alpha URL: ${alphaUrl}`);
    await page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log(`Waiting ${ALPHA_DELAY}ms for images to load...`);
    await page.waitForTimeout(ALPHA_DELAY);
    console.log(`Taking alpha screenshot...`);
    await page.screenshot({ path: alphaPath, fullPage: true });
    console.log(`Alpha screenshot saved to ${alphaPath}`);

    console.log(`Reading screenshots for comparison...`);
    const img1_orig = PNG.sync.read(fs.readFileSync(originalPath));
    const img2_orig = PNG.sync.read(fs.readFileSync(alphaPath));

    const maxWidth = Math.max(img1_orig.width, img2_orig.width);
    const maxHeight = Math.max(img1_orig.height, img2_orig.height);

    const img1 = new PNG({ width: maxWidth, height: maxHeight });
    const img2 = new PNG({ width: maxWidth, height: maxHeight });

    for (let y = 0; y < img1_orig.height; y++) {
      for (let x = 0; x < img1_orig.width; x++) {
        const idx = (img1_orig.width * y + x) << 2;
        const newIdx = (maxWidth * y + x) << 2;
        img1.data[newIdx] = img1_orig.data[idx];
        img1.data[newIdx + 1] = img1_orig.data[idx + 1];
        img1.data[newIdx + 2] = img1_orig.data[idx + 2];
        img1.data[newIdx + 3] = img1_orig.data[idx + 3];
      }
    }

    for (let y = 0; y < img2_orig.height; y++) {
      for (let x = 0; x < img2_orig.width; x++) {
        const idx = (img2_orig.width * y + x) << 2;
        const newIdx = (maxWidth * y + x) << 2;
        img2.data[newIdx] = img2_orig.data[idx];
        img2.data[newIdx + 1] = img2_orig.data[idx + 1];
        img2.data[newIdx + 2] = img2_orig.data[idx + 2];
        img2.data[newIdx + 3] = img2_orig.data[idx + 3];
      }
    }

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    console.log(`Comparing images with pixelmatch...`);
    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
    console.log(`Found ${numDiffPixels} different pixels`);

    console.log(`Writing diff image to ${diffPath}`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    // Read images as base64 for embedding in response
    const originalBase64 = `data:image/png;base64,${fs.readFileSync(originalPath).toString('base64')}`;
    const alphaBase64 = `data:image/png;base64,${fs.readFileSync(alphaPath).toString('base64')}`;
    const diffBase64 = `data:image/png;base64,${fs.readFileSync(diffPath).toString('base64')}`;

    // Clean up temp files after encoding
    try {
      fs.unlinkSync(originalPath);
      fs.unlinkSync(alphaPath);
      fs.unlinkSync(diffPath);
      fs.rmdirSync(screenshotDir);
    } catch (e) {
      console.log('Could not clean up temp files:', e);
    }

    console.log(`Screenshot comparison complete!`);
    return {
      original: originalBase64,
      alpha: alphaBase64,
      diff: diffBase64,
      diffPixels: numDiffPixels,
    };
  } catch (error) {
    console.error('Error in takeScreenshots:', error);
    throw error;
  }
}
