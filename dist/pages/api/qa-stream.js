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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const playwright_1 = require("playwright");
const write_good_1 = __importDefault(require("write-good"));
const dictionary_en_gb_1 = __importDefault(require("dictionary-en-gb"));
const screenshot_1 = require("../../lib/screenshot");
// Function to send SSE messages
const sendEvent = (res, event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};
function checkImageAltTags(page) {
    return __awaiter(this, void 0, void 0, function* () {
        return page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.map(img => ({
                src: img.src,
                hasAlt: img.hasAttribute('alt') && (img.getAttribute('alt') || '').trim() !== '',
            })).filter(img => !img.hasAlt);
        });
    });
}
function checkBrokenLinks(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const links = yield page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        });
        const linkCheckPromises = links.map((link) => __awaiter(this, void 0, void 0, function* () {
            if (!link || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('#')) {
                return null;
            }
            let absoluteUrl = link;
            if (link.startsWith('/')) {
                const siteUrl = new URL(url);
                absoluteUrl = `${siteUrl.protocol}//${siteUrl.host}${link}`;
            }
            try {
                const response = yield fetch(absoluteUrl, { method: 'HEAD' });
                if (!response.ok) {
                    return { url: absoluteUrl, status: response.status };
                }
            }
            catch (error) {
                console.warn(`Could not check link: ${absoluteUrl}`, error);
                // Optionally, report these as "could not check"
                return { url: absoluteUrl, status: 0 }; // Using status 0 to indicate a check error
            }
            return null;
        }));
        const results = yield Promise.all(linkCheckPromises);
        return results.filter(result => result !== null);
    });
}
function checkSpellingAndGrammar(page) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = yield page.evaluate(() => document.body.innerText);
        const suggestions = (0, write_good_1.default)(text, { dictionary: dictionary_en_gb_1.default });
        return suggestions;
    });
}
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method !== 'GET') {
            return res.status(405).json({ message: 'Method not allowed' });
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const { url, searchWords: searchWordsString, selectedChecks: selectedChecksString, viewportWidth: viewportWidthString } = req.query;
        const searchWords = JSON.parse(searchWordsString);
        const selectedChecks = JSON.parse(selectedChecksString);
        const viewportWidth = parseInt(viewportWidthString, 10) || 1280;
        if (!url) {
            sendEvent(res, 'error', { message: 'URL is required' });
            return res.end();
        }
        let browser;
        try {
            console.log('Launching browser...');
            sendEvent(res, 'status', { message: 'Launching browser...' });
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-gpu'],
            });
            const page = yield browser.newPage({
                viewport: { width: viewportWidth, height: 1080 },
                deviceScaleFactor: 1,
            });
            if (typeof url !== 'string') {
                sendEvent(res, 'error', { message: 'URL must be a string' });
                return res.end();
            }
            console.log('Navigating to URL:', url);
            sendEvent(res, 'status', { message: `Navigating to ${url}...` });
            yield page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            console.log('Navigation complete.');
            console.log('Waiting for body selector...');
            yield page.waitForSelector('body', { timeout: 60000 });
            console.log('Body selector found.');
            console.log('Waiting for images to load...');
            yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
                console.log('Inside image evaluation...');
                const imagePromises = Array.from(document.images).map(img => {
                    if (img.complete)
                        return null;
                    return new Promise(resolve => {
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    });
                });
                yield Promise.race([
                    Promise.all(imagePromises.filter(Boolean)),
                    new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
                ]);
                console.log('Image evaluation complete.');
            }));
            console.log('Waiting for dynamic content...');
            yield new Promise(resolve => setTimeout(resolve, 1000));
            sendEvent(res, 'status', { message: 'Initial page load complete.' });
            // Search word highlight
            if (searchWords && searchWords.length > 0) {
                try {
                    sendEvent(res, 'status', { message: 'Searching for words...' });
                    const boundingBoxes = yield page.evaluate((searchWords) => {
                        const boxes = [];
                        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
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
                        yield page.evaluate((boxes) => {
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
                        yield new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                    }
                }
                catch (err) {
                    console.error('Error in search word highlight block:', err);
                    sendEvent(res, 'error', { message: 'Error during search word highlight', error: err.message });
                }
            }
            // Visual diff
            try {
                sendEvent(res, 'status', { message: 'Performing visual diff...' });
                const visualDiffResult = yield (0, screenshot_1.takeScreenshots)(page, url);
                sendEvent(res, 'visual-diff', visualDiffResult);
            }
            catch (err) {
                console.error('Error in visual diff block:', err);
                sendEvent(res, 'error', { message: 'Error during visual diff', error: err.message });
            }
            // Image alt audit
            if (selectedChecks && selectedChecks.imageAlt) {
                try {
                    sendEvent(res, 'status', { message: 'Checking image alt tags...' });
                    const imageAltIssues = yield checkImageAltTags(page);
                    sendEvent(res, 'imageAlt', { imageAltIssues });
                }
                catch (err) {
                    console.error('Error in image alt audit block:', err);
                    sendEvent(res, 'error', { message: 'Error during image alt audit', error: err.message });
                }
            }
            // Broken links audit
            if (selectedChecks && selectedChecks.brokenLinks) {
                try {
                    sendEvent(res, 'status', { message: 'Checking for broken links...' });
                    const brokenLinks = yield checkBrokenLinks(page, url);
                    sendEvent(res, 'brokenLinks', { brokenLinks });
                }
                catch (err) {
                    console.error('Error in broken links audit block:', err);
                    sendEvent(res, 'error', { message: 'Error during broken links audit', error: err.message });
                }
            }
            // Spelling and grammar audit
            if (selectedChecks && selectedChecks.spellingGrammar) {
                try {
                    sendEvent(res, 'status', { message: 'Checking spelling and grammar...' });
                    const spellingGrammarIssues = yield checkSpellingAndGrammar(page);
                    sendEvent(res, 'spellingGrammar', { spellingGrammarIssues });
                }
                catch (err) {
                    console.error('Error in spelling and grammar audit block:', err);
                    sendEvent(res, 'error', { message: 'Error during spelling and grammar audit', error: err.message });
                }
            }
            sendEvent(res, 'done', { message: 'All checks complete.' });
            res.end();
        }
        catch (error) {
            console.error('Error in QA checks stream:', error);
            sendEvent(res, 'error', { message: 'An unexpected error occurred', error: error.message });
            res.end();
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
