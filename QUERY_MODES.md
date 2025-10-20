# QA Tool - Query Modes Documentation

## Overview
The Web QA Tool now supports two query modes optimized for different use cases:

### 1. Single URL - Full Alpha Test
**Purpose**: Comprehensive testing of one URL with both desktop and mobile screenshots

**Features**:
- 1 URL maximum
- 4 total screenshots:
  - Desktop Original (1280px width)
  - Desktop Alpha (with `?d_alpha=true`)
  - Mobile Original (390x844px - iPhone 12/13/14 Pro)
  - Mobile Alpha (with `?d_alpha=true`)

**Timing**:
- Desktop Original: 30 seconds wait time
- Desktop Alpha: 50 seconds wait time + aggressive scroll
- Mobile Original: 30 seconds wait time
- Mobile Alpha: 50 seconds wait time + aggressive scroll
- **Total estimated time**: ~3.5-4.5 minutes per URL

**Note**: Alpha pages use aggressive scrolling (multiple incremental scrolls) to ensure ALL lazy-loaded images below the fold are triggered and loaded.

**Best for**:
- Detailed QA testing of critical pages
- Testing responsive design differences
- Verifying alpha changes across devices
- When you need thorough image loading validation

---

### 2. Multi URL - Desktop Only
**Purpose**: Quick comparison testing of multiple URLs (desktop only)

**Features**:
- Up to 5 URLs
- 2 screenshots per URL:
  - Desktop Original (1280px width)
  - Desktop Alpha (with `?d_alpha=true`)

**Timing (Optimized)**:
- Desktop Original: 20 seconds wait time
- Desktop Alpha: 35 seconds wait time + aggressive scroll
- **Total estimated time per URL**: ~60-70 seconds
- **5 URLs**: ~5-6 minutes total

**Note**: Alpha pages use aggressive scrolling to ensure lazy-loaded images are captured.

**Best for**:
- Batch testing multiple pages
- Quick alpha comparison across pages
- Desktop-focused QA workflows
- Faster turnaround when mobile screenshots aren't needed

---

## Technical Implementation

### Code Optimizations

1. **Separate Screenshot Functions**:
   - `takeScreenshots()`: Full mode with desktop + mobile
   - `takeDesktopScreenshots()`: Optimized desktop-only mode

2. **Reduced Delays in Multi-Desktop Mode**:
   - Original: 30s → 20s (33% faster)
   - Alpha: 45s → 25s (44% faster)
   - This reduces screenshot time by ~40% for desktop-only mode

3. **Shared Helper Functions**:
   - `acceptCookies()`: Cookie banner detection and auto-acceptance
   - `scrollAndWait()`: Lazy-load image trigger via scrolling

4. **Common Features Across Both Modes**:
   - Full-page screenshots
   - Cookie banner auto-acceptance (13 common selectors)
   - Lazy-load image handling (scroll to bottom, wait, scroll back)
   - Base64 encoding for Railway compatibility

---

## Usage Guide

### Selecting a Mode

1. Open the Web QA Tool
2. Look for the "Query Mode" section at the top
3. Click on your preferred mode card:
   - **Single URL - Full Alpha Test** (left card)
   - **Multi URL - Desktop Only** (right card)

### Input Field Changes

- **Single-Alpha Mode**: Single-line input field (1 URL)
- **Multi-Desktop Mode**: Multi-line textarea (up to 5 URLs, one per line)

### Example URLs

**Single URL Mode**:
```
https://www.audi.co.uk/en/models/a1/a1-sportback/
```

**Multi URL Mode**:
```
https://www.audi.co.uk/en/models/a1/a1-sportback/
https://www.audi.co.uk/en/models/q4/q4-e-tron/
https://www.audi.co.uk/en/used-cars/used-car-range/
https://www.audi.co.uk/en/owners/service-and-maintenance/service-plans/
https://www.audi.co.uk/en/find-and-buy/test-drive-booking/
```

---

## Screenshot Display

### Single-Alpha Mode
Shows two sections:
1. **Desktop Screenshots**: Original vs Alpha side-by-side
2. **Mobile Screenshots**: Original vs Alpha side-by-side

### Multi-Desktop Mode
Shows one section:
- **Desktop Screenshots**: Original vs Alpha side-by-side

---

## Performance Comparison

| Mode | URLs | Screenshots/URL | Total Screenshots | Time/URL | Total Time |
|------|------|-----------------|-------------------|----------|------------|
| Single-Alpha | 1 | 4 | 4 | ~3.5-4.5 min | ~3.5-4.5 min |
| Multi-Desktop | 5 | 2 | 10 | ~60-70s | ~5-6 min |

**Note**: Times increased to ensure complete lazy-load image capture on alpha pages.

**Key Insight**: Multi-Desktop mode processes 10 screenshots (5 URLs × 2) in about the same time as Single-Alpha mode processes 4 screenshots (1 URL × 4).

---

## Files Modified

1. **Frontend**:
   - `app/page.tsx`: Added mode selector UI, conditional input fields, mode-aware display
   - `app/actions.ts`: Added queryMode parameter to API call

2. **Backend**:
   - `lib/screenshot.ts`: 
     - Refactored to extract helper functions
     - Added `takeDesktopScreenshots()` optimized function
     - Reduced delays for desktop-only mode
   - `pages/api/qa-stream.ts`: Added queryMode parameter handling, conditional screenshot function call

3. **Interface Updates**:
   - QAResult interface now includes optional `mode` property
   - Visual diff interface supports optional mobile properties

---

## Future Enhancements

Potential improvements:
- Custom viewport dimensions
- Tablet viewport option (768x1024)
- Per-URL delay customization
- Parallel screenshot processing for multi-desktop mode
- Download all screenshots as ZIP
- Side-by-side comparison (desktop vs mobile)

---

## Troubleshooting

### Issue: Screenshots taking too long
**Solution**: Use Multi-Desktop mode if you don't need mobile screenshots

### Issue: Images not loading below the fold
**Solution**: Use Single-Alpha mode (longer delays) for pages with many lazy-loaded images

### Issue: Want to test more than 5 URLs
**Solution**: Run the tool multiple times, or request increase of URL limit

---

## API Parameters

The `/api/qa-stream` endpoint now accepts:
- `url`: The URL to test
- `searchWords`: Array of words to highlight (JSON string)
- `selectedChecks`: Object of enabled checks (JSON string)
- `viewportWidth`: Desktop viewport width (default: 1280)
- **`queryMode`**: `"single-alpha"` or `"multi-desktop"` (**NEW**)

---

## Changelog

**Version 2.0** (Current)
- Added two-mode system (single-alpha / multi-desktop)
- Optimized delays for multi-desktop mode (40% faster)
- Refactored screenshot functions for code reuse
- Added mode selector UI with visual cards
- Dynamic input field (single vs multi-line)
- Conditional screenshot display based on mode

**Version 1.0** (Previous)
- Single mode only (4 screenshots per URL)
- 1 URL limit
- Fixed delays (30s/45s)
