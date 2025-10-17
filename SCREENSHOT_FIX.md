# Screenshot Fix Summary

## Problem
The web version wasn't showing screenshots even though the API was generating them correctly.

## Root Cause
The frontend was looking for **base64-encoded** screenshot data in `result.screenshot` and `result.screenshotAlpha`, but the API (`lib/screenshot.ts`) was returning **file paths** in the `visualDiff` object.

## Solution
Updated `app/page.tsx` to use the `visualDiff` data (which contains file paths) for displaying screenshots instead of looking for base64 data.

## How It Works Now (Matches batch-qa.ts)

### Backend (`lib/screenshot.ts`)
1. Navigates to original URL
2. Waits 10 seconds (`ALPHA_DELAY = 10000`)
3. Takes full-page screenshot → saves to `public/screenshots/{urlSlug}/original.png`
4. Navigates to URL + `?d_alpha=true`
5. Waits 10 seconds again
6. Takes full-page screenshot → saves to `public/screenshots/{urlSlug}/alpha.png`
7. Uses `pixelmatch` to generate diff image → saves to `public/screenshots/{urlSlug}/diff.png`
8. Returns file paths: `/screenshots/{urlSlug}/original.png`, `/screenshots/{urlSlug}/alpha.png`, `/screenshots/{urlSlug}/diff.png`

### Frontend (`app/page.tsx`)
- Displays **two side-by-side screenshots** (Original and Alpha) using `result.visualDiff.original` and `result.visualDiff.alpha`
- Shows **pixel diff count** and displays the diff image below
- All images are clickable to open full-size in a new window

## Testing
To test the web version:
1. Start the dev server: `pnpm dev`
2. Open http://localhost:3000
3. Enter a URL (e.g., `https://www.audi.co.uk/uk/web/en/models/q5/sq5.html`)
4. Click "Run QA Checks"
5. Wait for screenshots to generate (about 20-30 seconds with the 10s delays)
6. Results page will show:
   - Original screenshot (left)
   - Alpha screenshot with `?d_alpha=true` (right)
   - Diff image showing changed pixels in pink (full width below)
   - Pixel difference count

## Files Modified
- `/Users/dhrubo.paul/Sites/audi/web-qa-tool/app/page.tsx` - Updated screenshot display logic to use `visualDiff` paths
