import { NextApiRequest, NextApiResponse } from 'next';
import { chromium, Page } from 'playwright';
import writeGood from 'write-good';
import dictionary from 'dictionary-en-gb';

// Function to send SSE messages
const sendEvent = (res: NextApiResponse, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

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

async function checkSpellingAndGrammar(page: Page) {
  const text = await page.evaluate(() => document.body.innerText);
  const suggestions = writeGood(text, { dictionary: dictionary });
  return suggestions;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { url, searchWords: searchWordsString, selectedChecks: selectedChecksString, viewportWidth: viewportWidthString } = req.query;

  const searchWords = JSON.parse(searchWordsString as string);
  const selectedChecks = JSON.parse(selectedChecksString as string);
  const viewportWidth = parseInt(viewportWidthString as string, 10) || 1280;

  if (!url) {
    sendEvent(res, 'error', { message: 'URL is required' });
    return res.end();
  }

  let browser;
  try {
    console.log('Launching browser...');
    sendEvent(res, 'status', { message: 'Launching browser...' });
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage({
      viewport: { width: viewportWidth, height: 1080 },
      deviceScaleFactor: 1,
    });

    console.log('Navigating to URL:', url);
    sendEvent(res, 'status', { message: `Navigating to ${url}...` });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Navigation complete.');

    console.log('Waiting for body selector...');
    await page.waitForSelector('body', { timeout: 60000 });
    console.log('Body selector found.');

    console.log('Waiting for images to load...');
    await page.evaluate(async () => {
      console.log('Inside image evaluation...');
      const imagePromises = Array.from(document.images).map(img => {
        if (img.complete) return null;
        return new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      });

      await Promise.race([
        Promise.all(imagePromises.filter(Boolean)),
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
      ]);
      console.log('Image evaluation complete.');
    });

    console.log('Waiting for dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    sendEvent(res, 'status', { message: 'Initial page load complete.' });

    // Search word highlight
    if (searchWords && searchWords.length > 0) {
      try {
        sendEvent(res, 'status', { message: 'Searching for words...' });
        const boundingBoxes = await page.evaluate((searchWords) => {
          const boxes: { x: number; y: number; width: number; height: number }[] = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
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

        const wordCount = boundingBoxes.length;
        sendEvent(res, 'wordCount', { wordCount });

        if (boundingBoxes.length > 0) {
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
              document.body.appendChild(div);
            });
          }, boundingBoxes);

          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      } catch (err) {
        console.error('Error in search word highlight block:', err);
        sendEvent(res, 'error', { message: 'Error during search word highlight', error: err.message });
      }
    }

    // Always take a screenshot
    try {
      sendEvent(res, 'status', { message: 'Taking screenshot...' });
      const screenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
      sendEvent(res, 'screenshot', { screenshot: screenshot.toString('base64') });
    } catch (err) {
      console.error('Error taking screenshot:', err);
      sendEvent(res, 'error', { message: 'Error during screenshot', error: err.message });
    }

    // Image alt audit
    if (selectedChecks && selectedChecks.imageAlt) {
      try {
        sendEvent(res, 'status', { message: 'Checking image alt tags...' });
        const imageAltIssues = await checkImageAltTags(page);
        sendEvent(res, 'imageAlt', { imageAltIssues });
      } catch (err) {
        console.error('Error in image alt audit block:', err);
        sendEvent(res, 'error', { message: 'Error during image alt audit', error: err.message });
      }
    }

    // Broken links audit
    if (selectedChecks && selectedChecks.brokenLinks) {
      try {
        sendEvent(res, 'status', { message: 'Checking for broken links...' });
        const brokenLinks = await checkBrokenLinks(page, url);
        sendEvent(res, 'brokenLinks', { brokenLinks });
      } catch (err) {
        console.error('Error in broken links audit block:', err);
        sendEvent(res, 'error', { message: 'Error during broken links audit', error: err.message });
      }
    }

    // Spelling and grammar audit
    if (selectedChecks && selectedChecks.spellingGrammar) {
      try {
        sendEvent(res, 'status', { message: 'Checking spelling and grammar...' });
        const spellingGrammarIssues = await checkSpellingAndGrammar(page);
        sendEvent(res, 'spellingGrammar', { spellingGrammarIssues });
      } catch (err) {
        console.error('Error in spelling and grammar audit block:', err);
        sendEvent(res, 'error', { message: 'Error during spelling and grammar audit', error: err.message });
      }
    }

    sendEvent(res, 'done', { message: 'All checks complete.' });
    res.end();

  } catch (error) {
    console.error('Error in QA checks stream:', error);
    sendEvent(res, 'error', { message: 'An unexpected error occurred', error: error.message });
    res.end();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}