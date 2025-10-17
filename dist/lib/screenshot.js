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
exports.takeScreenshots = takeScreenshots;
const fs_1 = __importDefault(require("fs"));
const pixelmatch_1 = __importDefault(require("pixelmatch"));
const pngjs_1 = require("pngjs");
const ALPHA_DELAY = 10000; // 10 seconds
function takeScreenshots(page, url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Taking screenshots for ${url}...`);
        try {
            const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_');
            const screenshotDir = `/Users/dhrubo.paul/Sites/audi/web-qa-tool/public/screenshots/${urlSlug}`;
            if (!fs_1.default.existsSync(screenshotDir)) {
                fs_1.default.mkdirSync(screenshotDir, { recursive: true });
            }
            const originalPath = `${screenshotDir}/original.png`;
            const alphaPath = `${screenshotDir}/alpha.png`;
            const diffPath = `${screenshotDir}/diff.png`;
            yield page.goto(url, { waitUntil: 'load', timeout: 60000 });
            yield page.waitForTimeout(ALPHA_DELAY);
            yield page.screenshot({ path: originalPath, fullPage: true });
            const alphaUrl = url.includes('?') ? `${url}&d_alpha=true` : `${url}?d_alpha=true`;
            yield page.goto(alphaUrl, { waitUntil: 'load', timeout: 60000 });
            yield page.waitForTimeout(ALPHA_DELAY);
            yield page.screenshot({ path: alphaPath, fullPage: true });
            const img1_orig = pngjs_1.PNG.sync.read(fs_1.default.readFileSync(originalPath));
            const img2_orig = pngjs_1.PNG.sync.read(fs_1.default.readFileSync(alphaPath));
            const maxWidth = Math.max(img1_orig.width, img2_orig.width);
            const maxHeight = Math.max(img1_orig.height, img2_orig.height);
            const img1 = new pngjs_1.PNG({ width: maxWidth, height: maxHeight });
            const img2 = new pngjs_1.PNG({ width: maxWidth, height: maxHeight });
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
            const diff = new pngjs_1.PNG({ width, height });
            const numDiffPixels = (0, pixelmatch_1.default)(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
            fs_1.default.writeFileSync(diffPath, pngjs_1.PNG.sync.write(diff));
            return {
                original: `/screenshots/${urlSlug}/original.png`,
                alpha: `/screenshots/${urlSlug}/alpha.png`,
                diff: `/screenshots/${urlSlug}/diff.png`,
                diffPixels: numDiffPixels,
            };
        }
        finally {
            // The browser is no longer closed here
        }
    });
}
