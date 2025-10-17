import { NextApiRequest, NextApiResponse } from 'next';
import { chromium, Page } from 'playwright';
import { playAudit } from 'playwright-lighthouse';

async function checkImageAltTags(page: Page) {
  return page.evaluate(() => {
    function getXPathForElement(element: any) {
      if (element.id) {
        return 'id("' + element.id + '")';
      }
      const parts = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let nbOfPreviousSiblings = 0;
        let hasNextSiblings = false;
        let sibling = element.previousSibling;
        while (sibling) {
          if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE && sibling.nodeName === element.nodeName) {
            nbOfPreviousSiblings++;
          }
          sibling = sibling.previousSibling;
        }
        sibling = element.nextSibling;
        while (sibling) {
          if (sibling.nodeName === element.nodeName) {
            hasNextSiblings = true;
            break;
          }
          sibling = sibling.nextSibling;
        }
        const prefix = element.prefix ? element.prefix + ":" : "";
        const nth = nbOfPreviousSiblings || hasNextSiblings ? `[${nbOfPreviousSiblings + 1}]` : "";
        parts.push(prefix + element.nodeName.toLowerCase() + nth);
        element = element.parentNode;
      }
      return parts.length ? "/" + parts.reverse().join("/") : null;
    }
    const images = Array.from(document.querySelectorAll('img'));
    return images
      .filter(img => !img.hasAttribute('alt') || img.getAttribute('alt') === '')
      .map(img => {
        let outerHTML = img.outerHTML;
        if (!outerHTML || typeof outerHTML !== 'string') {
          // Fallback: construct minimal HTML string
          let src = img.getAttribute('src') || '';
          outerHTML = `<img src="${src}" alt="">`;
        }
        return {
          src: img.src,
          outerHTML,
          xpath: getXPathForElement(img)
        };
      });
  });
}

async function checkBrokenLinks(page: Page, url: string) {
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => a.href);
  });

  const brokenLinks: { url: string; status: number; }[] = [];
  for (const link of links) {
    if (!link || link.startsWith('mailto:') || link.startsWith('tel:')) {
      continue;
    }

    let absoluteUrl = link;
    if (link.startsWith('/')) {
      const siteUrl = new URL(url);
      absoluteUrl = `${siteUrl.protocol}//${siteUrl.host}${link}`;
    }

    try {
      let response = await fetch(absoluteUrl, { method: 'HEAD' });
      if (!response.ok) {
        // If HEAD fails with 400/403/405, try GET
        if ([400, 403, 405].includes(response.status)) {
          try {
            response = await fetch(absoluteUrl, { method: 'GET' });
          } catch (err) {
            // GET also failed, treat as broken
            brokenLinks.push({ url: absoluteUrl, status: response.status });
            continue;
          }
        }
        if (!response.ok) {
          brokenLinks.push({ url: absoluteUrl, status: response.status });
        }
      }
    } catch (error) {
      console.warn(`Could not check link: ${absoluteUrl}`, error);
    }
  }
  return brokenLinks;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, searchWords, selectedChecks, thresholds } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true, // headless for CI/server
      args: ['--no-sandbox', '--disable-gpu'],
    });
    console.log('Browser launched. Creating new page...');
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1080 },
      deviceScaleFactor: 1,
    });
    // Set custom user-agent to mimic a real browser
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    console.log('Page created. Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Navigation complete. Waiting for main selector...');
    await page.waitForSelector('main', { timeout: 20000 });
    console.log('Main selector found. Waiting for images to load...');
    await page.evaluate(async () => {
      const selectors = Array.from(document.images).map(img => {
        if (img.complete) return null;
        return new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      });
      await Promise.all(selectors.filter(Boolean));
    });
    console.log('Images loaded. Waiting for dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Dynamic content wait complete. Taking screenshots...');
  
  let screenshot;
  let screenshotAlpha;
  let brokenLinks: { url: string; status: number; }[] = [];
  let wordCount = 0;
  let lighthouseReport;
  let spellingGrammarIssues: any[] = [];

    // Take full page screenshot of actual URL
    console.log('Taking screenshot of original URL...');
    try {
      screenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
      console.log('Screenshot of original URL taken successfully.');
    } catch (err) {
      console.error('Error taking screenshot of original URL:', err);
      screenshot = undefined;
    }

    // Take full page screenshot of URL with ?d_alpha=true
    let alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
    console.log('Navigating to URL with ?d_alpha=true:', alphaUrl);
    try {
      await page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('main', { timeout: 20000 });
      await page.evaluate(async () => {
        const selectors = Array.from(document.images).map(img => {
          if (img.complete) return null;
          return new Promise(resolve => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
          });
        });
        await Promise.all(selectors.filter(Boolean));
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      screenshotAlpha = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
      console.log('Screenshot of ?d_alpha=true URL taken successfully.');
    } catch (err) {
      console.error('Error taking screenshot of ?d_alpha=true URL:', err);
      screenshotAlpha = undefined;
    }

    // Lighthouse audit
    try {
      console.log('Entering Lighthouse audit block...');
      if (selectedChecks && selectedChecks.accessibility) {
        console.log('Running Lighthouse audit...');
        const auditResults = await playAudit({
          page: page,
          port: 9222,
          thresholds: {
            performance: thresholds?.performance ?? 0,
            accessibility: thresholds?.accessibility ?? 0,
            'best-practices': thresholds?.bestPractices ?? 0,
            seo: thresholds?.seo ?? 0
          }
        });
        lighthouseReport = auditResults.lhr;
        console.log('Lighthouse audit complete.');
      } else {
        console.log('Accessibility check not selected, skipping Lighthouse audit.');
      }
      console.log('Exiting Lighthouse audit block.');
    } catch (err) {
      console.error('Error in Lighthouse audit block:', err);
    }

    // Image alt audit - DISABLED
    // Image alt check is disabled for now

    // Broken links audit
    try {
      console.log('Entering broken links audit block...');
      if (selectedChecks && selectedChecks.brokenLinks) {
        console.log('Running broken links audit...');
        brokenLinks = await checkBrokenLinks(page, url);
        console.log('Broken links audit complete.');
      } else {
        console.log('Broken links check not selected, skipping broken links audit.');
      }
      console.log('Exiting broken links audit block.');
    } catch (err) {
      console.error('Error in broken links audit block:', err);
    }

    await browser.close();
    console.log('Browser closed, sending response.');
    res.status(200).json({
      screenshot: screenshot ? screenshot.toString('base64') : undefined,
      screenshotAlpha: screenshotAlpha ? screenshotAlpha.toString('base64') : undefined,
      brokenLinks,
      wordCount,
      lighthouseReport,
      spellingGrammarIssues,
    });
  } catch (error) {
  console.error('Error in QA checks API:', error);
  res.status(500).json({ error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) });
  }
}
