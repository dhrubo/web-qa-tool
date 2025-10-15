import { NextApiRequest, NextApiResponse } from 'next';
import { chromium, Page } from 'playwright';
import { playAudit } from 'playwright-lighthouse';

async function checkImageAltTags(page: Page) {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.map(img => ({
      src: img.src,
      hasAlt: img.hasAttribute('alt') && img.getAttribute('alt') !== '',
    })).filter(img => !img.hasAlt);
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
      const response = await fetch(absoluteUrl, { method: 'HEAD' });
      if (!response.ok) {
        brokenLinks.push({ url: absoluteUrl, status: response.status });
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
    console.log('Dynamic content wait complete. Beginning audit blocks...');
    let screenshot;
    let imageAltIssues: { src: string; hasAlt: boolean; }[] = [];
    let brokenLinks: { url: string; status: number; }[] = [];
    let wordCount = 0;
    let lighthouseReport;

    // Search word highlight and screenshot
    try {
      console.log('Entering search word highlight block...');
      if (searchWords && searchWords.length > 0) {
        console.log('Running search word highlight and screenshot...');
        const boundingBoxes = await page.evaluate((searchWords) => {
          const boxes = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent) {
              for (const searchWord of searchWords) {
                const lowerCaseText = node.textContent.toLowerCase();
                const lowerCaseSearchWord = searchWord.toLowerCase();
                let index = lowerCaseText.indexOf(lowerCaseSearchWord);
                while (index !== -1) {
                  const range = document.createRange();
                  range.setStart(node, index);
                  range.setEnd(node, index + searchWord.length);
                  const rect = range.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    boxes.push({
                      x: rect.left + window.scrollX,
                      y: rect.top + window.scrollY,
                      width: rect.width,
                      height: rect.height,
                    });
                  }
                  index = lowerCaseText.indexOf(lowerCaseSearchWord, index + 1);
                }
              }
            }
          }
          return boxes;
        }, searchWords);

        wordCount = boundingBoxes.length;

        if (boundingBoxes.length > 0) {
          // Draw overlays
          await page.evaluate((boxes) => {
            boxes.forEach(box => {
              const div = document.createElement('div');
              div.style.position = 'absolute';
              div.style.left = `${box.x}px`;
              div.style.top = `${box.y}px`;
              div.style.width = `${box.width}px`;
              div.style.height = `${box.height}px`;
              div.style.border = '2px solid red';
              div.style.zIndex = '10000';
              div.style.pointerEvents = 'none';
              document.body.appendChild(div);
            });
          }, boundingBoxes);

          await new Promise(resolve => setTimeout(resolve, 100));

          // Try to get bounding rect of <main>
          const mainRect = await page.evaluate(() => {
            const main = document.querySelector('main');
            if (main) {
              const rect = main.getBoundingClientRect();
              return {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
              };
            }
            return null;
          });

          let clip;
          const padding = 20;
          if (mainRect && mainRect.width > 0 && mainRect.height > 0) {
            clip = {
              x: Math.max(mainRect.x - padding, 0),
              y: Math.max(mainRect.y - padding, 0),
              width: mainRect.width + 2 * padding,
              height: mainRect.height + 2 * padding
            };
            console.log('Cropping screenshot to <main> element.');
          } else {
            // Fallback to union of bounding boxes
            const minX = Math.min(...boundingBoxes.map(b => b.x));
            const minY = Math.min(...boundingBoxes.map(b => b.y));
            const maxX = Math.max(...boundingBoxes.map(b => b.x + b.width));
            const maxY = Math.max(...boundingBoxes.map(b => b.y + b.height));
            clip = {
              x: Math.max(minX - padding, 0),
              y: Math.max(minY - padding, 0),
              width: maxX - minX + 2 * padding,
              height: maxY - minY + 2 * padding
            };
            console.log('Cropping screenshot to union of highlighted boxes.');
          }

          screenshot = await page.screenshot({ clip, type: 'jpeg', quality: 80 });
          console.log('Screenshot taken and cropped to main content area.');
        } else {
          console.log('No search word matches found, skipping screenshot.');
        }
      } else {
        console.log('No search words provided, skipping search word highlight.');
      }
      console.log('Exiting search word highlight block.');
    } catch (err) {
      console.error('Error in search word highlight block:', err);
    }

    // Lighthouse audit
    try {
      console.log('Entering Lighthouse audit block...');
      if (selectedChecks && selectedChecks.accessibility) {
        console.log('Running Lighthouse audit...');
        const auditResults = await playAudit({
          page: page,
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

    // Image alt audit
    try {
      console.log('Entering image alt audit block...');
      if (selectedChecks && selectedChecks.imageAlt) {
        console.log('Running image alt audit...');
        imageAltIssues = await checkImageAltTags(page);
        console.log('Image alt audit complete.');
      } else {
        console.log('Image alt check not selected, skipping image alt audit.');
      }
      console.log('Exiting image alt audit block.');
    } catch (err) {
      console.error('Error in image alt audit block:', err);
    }

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
      imageAltIssues,
      brokenLinks,
      wordCount,
      lighthouseReport,
    });
  } catch (error) {
  console.error('Error in QA checks API:', error);
  res.status(500).json({ error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) });
  }
}
