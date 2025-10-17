"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const playwright_1 = require("playwright");
const playwright_lighthouse_1 = require("playwright-lighthouse");
function checkImageAltTags(page) {
    return __awaiter(this, void 0, void 0, function* () {
        return page.evaluate(() => {
            function getXPathForElement(element) {
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
    });
}
function checkBrokenLinks(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const links = yield page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        });
        const brokenLinks = [];
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
                let response = yield fetch(absoluteUrl, { method: 'HEAD' });
                if (!response.ok) {
                    // If HEAD fails with 400/403/405, try GET
                    if ([400, 403, 405].includes(response.status)) {
                        try {
                            response = yield fetch(absoluteUrl, { method: 'GET' });
                        }
                        catch (err) {
                            // GET also failed, treat as broken
                            brokenLinks.push({ url: absoluteUrl, status: response.status });
                            continue;
                        }
                    }
                    if (!response.ok) {
                        brokenLinks.push({ url: absoluteUrl, status: response.status });
                    }
                }
            }
            catch (error) {
                console.warn(`Could not check link: ${absoluteUrl}`, error);
            }
        }
        return brokenLinks;
    });
}
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method not allowed' });
        }
        const { url, searchWords, selectedChecks, thresholds } = req.body;
        if (!url) {
            return res.status(400).json({ message: 'URL is required' });
        }
        try {
            console.log('Launching browser...');
            const browser = yield playwright_1.chromium.launch({
                headless: true, // headless for CI/server
                args: ['--no-sandbox', '--disable-gpu'],
            });
            console.log('Browser launched. Creating new page...');
            const page = yield browser.newPage({
                viewport: { width: 1280, height: 1080 },
                deviceScaleFactor: 1,
            });
            // Set custom user-agent to mimic a real browser
            yield page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            console.log('Page created. Navigating to URL:', url);
            yield page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            console.log('Navigation complete. Waiting for main selector...');
            yield page.waitForSelector('main', { timeout: 20000 });
            console.log('Main selector found. Waiting for images to load...');
            yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
                const selectors = Array.from(document.images).map(img => {
                    if (img.complete)
                        return null;
                    return new Promise(resolve => {
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    });
                });
                yield Promise.all(selectors.filter(Boolean));
            }));
            console.log('Images loaded. Waiting for dynamic content...');
            yield new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Dynamic content wait complete. Taking screenshots...');
            let screenshot;
            let screenshotAlpha;
            let brokenLinks = [];
            let wordCount = 0;
            let lighthouseReport;
            let spellingGrammarIssues = [];
            // Take full page screenshot of actual URL
            console.log('Taking screenshot of original URL...');
            try {
                screenshot = yield page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
                console.log('Screenshot of original URL taken successfully.');
            }
            catch (err) {
                console.error('Error taking screenshot of original URL:', err);
                screenshot = undefined;
            }
            // Take full page screenshot of URL with ?d_alpha=true
            let alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
            console.log('Navigating to URL with ?d_alpha=true:', alphaUrl);
            try {
                yield page.goto(alphaUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                yield page.waitForSelector('main', { timeout: 20000 });
                yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
                    const selectors = Array.from(document.images).map(img => {
                        if (img.complete)
                            return null;
                        return new Promise(resolve => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                        });
                    });
                    yield Promise.all(selectors.filter(Boolean));
                }));
                yield new Promise(resolve => setTimeout(resolve, 1000));
                screenshotAlpha = yield page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
                console.log('Screenshot of ?d_alpha=true URL taken successfully.');
            }
            catch (err) {
                console.error('Error taking screenshot of ?d_alpha=true URL:', err);
                screenshotAlpha = undefined;
            }
            // Lighthouse audit
            try {
                console.log('Entering Lighthouse audit block...');
                if (selectedChecks && selectedChecks.accessibility) {
                    console.log('Running Lighthouse audit...');
                    const auditResults = yield (0, playwright_lighthouse_1.playAudit)({
                        page: page,
                        port: 9222,
                        thresholds: {
                            performance: (_a = thresholds === null || thresholds === void 0 ? void 0 : thresholds.performance) !== null && _a !== void 0 ? _a : 0,
                            accessibility: (_b = thresholds === null || thresholds === void 0 ? void 0 : thresholds.accessibility) !== null && _b !== void 0 ? _b : 0,
                            'best-practices': (_c = thresholds === null || thresholds === void 0 ? void 0 : thresholds.bestPractices) !== null && _c !== void 0 ? _c : 0,
                            seo: (_d = thresholds === null || thresholds === void 0 ? void 0 : thresholds.seo) !== null && _d !== void 0 ? _d : 0
                        }
                    });
                    lighthouseReport = auditResults.lhr;
                    console.log('Lighthouse audit complete.');
                }
                else {
                    console.log('Accessibility check not selected, skipping Lighthouse audit.');
                }
                console.log('Exiting Lighthouse audit block.');
            }
            catch (err) {
                console.error('Error in Lighthouse audit block:', err);
            }
            // Image alt audit - DISABLED
            // Image alt check is disabled for now
            // Broken links audit
            try {
                console.log('Entering broken links audit block...');
                if (selectedChecks && selectedChecks.brokenLinks) {
                    console.log('Running broken links audit...');
                    brokenLinks = yield checkBrokenLinks(page, url);
                    console.log('Broken links audit complete.');
                }
                else {
                    console.log('Broken links check not selected, skipping broken links audit.');
                }
                console.log('Exiting broken links audit block.');
            }
            catch (err) {
                console.error('Error in broken links audit block:', err);
            }
            yield browser.close();
            console.log('Browser closed, sending response.');
            res.status(200).json({
                screenshot: screenshot ? screenshot.toString('base64') : undefined,
                screenshotAlpha: screenshotAlpha ? screenshotAlpha.toString('base64') : undefined,
                brokenLinks,
                wordCount,
                lighthouseReport,
                spellingGrammarIssues,
            });
        }
        catch (error) {
            console.error('Error in QA checks API:', error);
            res.status(500).json({ error: typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error) });
        }
    });
}
