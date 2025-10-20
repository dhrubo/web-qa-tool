# Screenshot Timeout - Quick Fix Summary

## Problem
Screenshot generation was timing out after ~4.7 minutes on Railway, causing API requests to fail.

## Root Causes
1. **Long screenshot times**: 80s for single-alpha, 55s × 5 URLs = 275s for multi-desktop
2. **No timeout configuration**: Default Next.js API timeout too short
3. **No keepalive**: Connection dropped during long operations
4. **Too many URLs**: 5 URLs could exceed 5-minute platform limit

## Solutions Implemented ✅

### 1. API Timeout Configuration
**File**: `pages/api/qa-stream.ts`
```typescript
export const config = {
  api: {
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes
};
```

### 2. SSE Keepalive
**File**: `pages/api/qa-stream.ts`
```typescript
// Sends keepalive every 15 seconds to prevent connection timeout
const keepaliveInterval = setInterval(() => {
  res.write(': keepalive\n\n');
}, 15000);
```

### 3. Buffering Prevention
**File**: `pages/api/qa-stream.ts`
```typescript
res.setHeader('X-Accel-Buffering', 'no'); // For nginx/Railway
```

### 4. Reduced URL Limit
**File**: `app/page.tsx`
```typescript
// Changed from 5 to 4 URLs maximum
if (queryMode === "multi-desktop" && urlList.length > 4) {
  alert("Multi Desktop Mode: Maximum 4 URLs allowed to prevent timeout...");
  urlList = urlList.slice(0, 4);
}
```

### 5. Optimized Screenshot Delays
**File**: `lib/screenshot.ts`
```typescript
// Reduced delays for multi-desktop mode
const DESKTOP_ORIGINAL_DELAY = 17000; // was 20000
const DESKTOP_ALPHA_DELAY = 30000;    // was 35000
// Total per URL: 47s (was 55s)
```

## New Timings ⏱️

### Single-Alpha Mode (1 URL)
- Screenshots: 80 seconds
- Other checks: ~40 seconds
- **Total: ~2 minutes** ✅

### Multi-Desktop Mode (4 URLs max)
- Screenshots: 47s × 4 = 188 seconds
- Other checks: ~60 seconds  
- **Total: ~4.1 minutes** ✅

Both well under 5-minute limit!

## Changes Summary

| Component | What Changed | Before | After |
|-----------|--------------|--------|-------|
| API Config | Max duration | No limit (default 60s) | 300s (5 min) |
| Connection | Keepalive | None | Every 15s |
| Max URLs | Multi-desktop | 5 URLs | 4 URLs |
| Screenshot Time | Per URL (multi) | 55s | 47s |
| Total Time | Multi-desktop | ~6-7 min ❌ | ~4 min ✅ |

## Testing Checklist

Before deploying:
- [ ] Test single-alpha mode with complex page
- [ ] Test multi-desktop with 4 URLs
- [ ] Verify no timeout errors in Railway logs
- [ ] Check keepalive messages in network tab
- [ ] Confirm screenshot timer shows 47s for multi-desktop
- [ ] Verify all lazy-load images still captured

After deploying to Railway:
- [ ] Monitor logs for timeout errors
- [ ] Test with production URLs
- [ ] Verify request completes in <5 minutes
- [ ] Check disk space (screenshot cleanup working)

## Deploy Command

```bash
git add .
git commit -m "Fix screenshot timeout issues

- Add SSE keepalive every 15 seconds
- Set API maxDuration to 300s (5 minutes)
- Reduce multi-desktop from 5 to 4 URLs
- Optimize delays: 47s per URL (was 55s)
- Add buffering prevention headers
- Total time now ~4 minutes (well under limit)"

git push
```

## Expected Results

✅ No more "API response exceeds timeout" errors
✅ Requests complete in 2-4 minutes
✅ Keepalive prevents connection drops
✅ All screenshots captured successfully
✅ Lazy-load images still working

## If Issues Persist

1. **Check Railway logs** for specific error messages
2. **Monitor timing** - if still slow, reduce delays further
3. **Consider batch processing** - process 2 URLs at a time
4. **Add progress logging** - more frequent status updates

## Documentation

- Full details: `TIMEOUT_FIX.md`
- Progress animation: `SCREENSHOT_PROGRESS_ANIMATION.md`
- Quick reference: This file

---

**Status**: Ready to deploy! 🚀
