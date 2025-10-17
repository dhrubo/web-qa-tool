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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fs_1 = __importDefault(require("fs"));
const BATCH_SIZE = 10;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting batch QA process...');
        // Read URLs from the CSV file
        const csvContent = fs_1.default.readFileSync('/Users/dhrubo.paul/Sites/audi/web-qa-tool/app/http_urls.csv', 'utf-8');
        const urls = csvContent.split('\n').filter(line => line.trim() !== '').map(line => line.split(',')[0]);
        console.log(`Found ${urls.length} URLs to process.`);
        // We will process the URLs in batches
        const url = urls[0];
        yield takeScreenshots(url);
        console.log('Batch QA process finished.');
    });
}
const playwright_1 = require("playwright");
const pixelmatch_1 = __importDefault(require("pixelmatch"));
const pngjs_1 = require("pngjs");
const ALPHA_DELAY = 10000; // 10 seconds
function takeScreenshots(url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Taking screenshots for ${url}...`);
        const browser = yield playwright_1.chromium.launch();
        const page = yield browser.newPage();
        try {
            // Create a directory for the URL
            const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_');
            const screenshotDir = `/Users/dhrubo.paul/Sites/audi/web-qa-tool/screenshots/${urlSlug}`;
            if (!fs_1.default.existsSync(screenshotDir)) {
                fs_1.default.mkdirSync(screenshotDir, { recursive: true });
            }
            // Take screenshot of the original URL
            yield page.goto(url, { waitUntil: 'load', timeout: 60000 });
            yield page.waitForTimeout(ALPHA_DELAY);
            yield page.screenshot({ path: `${screenshotDir}/original.png`, fullPage: true });
            // Take screenshot of the URL with ?d_alpha=true
            const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
            yield page.goto(alphaUrl, { waitUntil: 'load', timeout: 60000 });
            yield page.waitForTimeout(ALPHA_DELAY);
            yield page.screenshot({ path: `${screenshotDir}/alpha.png`, fullPage: true });
            console.log(`Screenshots for ${url} saved to ${screenshotDir}`);
            const img1 = pngjs_1.PNG.sync.read(fs_1.default.readFileSync(`${screenshotDir}/original.png`));
            const img2 = pngjs_1.PNG.sync.read(fs_1.default.readFileSync(`${screenshotDir}/alpha.png`));
            console.log(`Image 1 dimensions: ${img1.width}x${img1.height}`);
            console.log(`Image 2 dimensions: ${img2.width}x${img2.height}`);
            const { width, height } = img1;
            const diff = new pngjs_1.PNG({ width, height });
            const numDiffPixels = (0, pixelmatch_1.default)(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
            fs_1.default.writeFileSync(`${screenshotDir}/diff.png`, pngjs_1.PNG.sync.write(diff));
            console.log(`Number of different pixels for ${url}: ${numDiffPixels}`);
        }
        catch (error) {
            console.error(`Failed to take screenshots for ${url}:`, error);
        }
        finally {
            yield browser.close();
        }
    });
}
main().catch(console.error);
