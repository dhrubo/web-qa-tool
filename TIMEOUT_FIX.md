# Screenshot Timeout Fix

## Problem
Screenshot generation was timing out after ~4.7 minutes (282 seconds), causing the API request to fail. This was happening because:

1. **Long screenshot delays**: Single-alpha mode takes 80 seconds (30s + 50s), and the entire request can take 3-5 minutes
2. **Default Next.js API timeout**: Next.js API routes have default timeouts (10-60 seconds depending on deployment)
3. **Railway/Platform timeout**: Most platforms have HTTP request timeouts (typically 30 seconds to 5 minutes)
4. **Connection timeout**: Without keepalive, the SSE connection could be dropped during long operations

## Solutions Implemented

### 1. **API Route Configuration** (`pages/api/qa-stream.ts`)
Added explicit configuration to extend timeout limits:

```typescript
export const config = {
  api: {
    responseLimit: false,        // Disable 4MB response limit
    bodyParser: {
      sizeLimit: '10mb',          // Allow larger request bodies
    },
  },
  maxDuration: 300,               // 5 minutes max (Vercel/Railway)
};
```

**Effect**: Allows API route to run for up to 5 minutes instead of default timeout

### 2. **SSE Keepalive Messages**
Added periodic keepalive to prevent connection timeout:

```typescript
// Send keepalive comments every 15 seconds to prevent timeout
const keepaliveInterval = setInterval(() => {
  res.write(': keepalive\n\n');
}, 15000);
```

**Effect**: 
- Keeps the connection alive during long screenshot operations
- Prevents proxy/platform from closing idle connections
- Comments are ignored by EventSource client
- Cleared in `finally` block to prevent memory leaks

### 3. **Response Headers**
Added headers to prevent buffering and maintain connection:

```typescript
res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx/Railway
```

**Effect**: Ensures SSE messages are sent immediately, not buffered by proxy servers

### 4. **Next.js Config** (`next.config.mjs`)
Added experimental settings for better body handling:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '10mb',
  },
},
```

**Effect**: Allows larger payloads for server actions

## Timeout Timeline

### Before Fix
```
0s     - Request starts
10s    - Default timeout kicks in → REQUEST FAILS ❌
```

### After Fix
```
0s     - Request starts, keepalive begins
15s    - Keepalive ping
30s    - Keepalive ping
45s    - Keepalive ping
...continuing...
80s    - Screenshots complete (single-alpha mode)
120s   - Visual diff complete
150s   - All checks complete → REQUEST SUCCESS ✅
300s   - Maximum allowed time (5 minutes)
```

## Expected Timings

### Single-Alpha Mode (1 URL)
- **Screenshot phase**: 80 seconds (30s original + 50s alpha)
- **Visual diff**: 20-30 seconds
- **Other checks**: 10-20 seconds
- **Total**: ~2-2.5 minutes

### Multi-Desktop Mode (5 URLs)
- **Screenshots per URL**: 55 seconds (20s original + 35s alpha)
- **Total screenshots**: 55s × 5 = 275 seconds = 4.5 minutes
- **Visual diffs**: 30-60 seconds
- **Other checks**: 20-40 seconds
- **Total**: ~6-7 minutes ⚠️ **Exceeds 5-minute limit!**

## Remaining Issue: Multi-URL Timeout

The multi-desktop mode with 5 URLs can exceed the 5-minute limit. Options:

### Option 1: Reduce Maximum URLs
Change from 5 to 3 URLs maximum:
```typescript
// In app/page.tsx
if (queryMode === "multi-desktop" && urlList.length > 3) {
  alert("Multi Desktop Mode: Maximum 3 URLs allowed...");
  urlList = urlList.slice(0, 3);
}
```
**Effect**: 3 URLs × 55s = 165s + overhead = ~3.5 minutes ✅

### Option 2: Reduce Screenshot Delays
Reduce delays for multi-desktop mode:
```typescript
// In lib/screenshot.ts
const DESKTOP_ORIGINAL_DELAY = 15000; // 15s instead of 20s
const DESKTOP_ALPHA_DELAY = 25000;    // 25s instead of 35s
```
**Effect**: 5 URLs × 40s = 200s + overhead = ~4 minutes ✅

### Option 3: Process URLs in Batches
Process 2-3 URLs at a time, return results incrementally:
- More complex implementation
- Better user experience
- Avoids timeout completely

## Recommended Solution

**Combine Option 1 + Option 2**:
1. Reduce max URLs from 5 to 4
2. Reduce delays slightly (17s + 30s = 47s per URL)
3. Total: 4 × 47s = 188s + overhead = ~3.5 minutes ✅

This provides:
- ✅ Under 5-minute limit
- ✅ Still allows multiple URLs
- ✅ Maintains good screenshot quality
- ✅ No complex refactoring needed

## Implementation (Recommended)

### Step 1: Update URL limit
```typescript
// In app/page.tsx line ~117
if (queryMode === "multi-desktop" && urlList.length > 4) {
  alert("Multi Desktop Mode: Maximum 4 URLs allowed. Processing first 4 URLs only.");
  urlList = urlList.slice(0, 4);
}
```

### Step 2: Adjust delays
```typescript
// In lib/screenshot.ts line ~46-47
const DESKTOP_ORIGINAL_DELAY = 17000; // 17 seconds
const DESKTOP_ALPHA_DELAY = 30000;    // 30 seconds
```

### Step 3: Update timer display
```typescript
// In app/page.tsx screenshot timing constants
'multi-desktop': {
  original: 17000,
  alpha: 30000,
  total: 47000
}
```

## Testing Checklist

After implementing fixes:

- [ ] Test single-alpha mode with long page (should complete in <3 minutes)
- [ ] Test multi-desktop mode with 4 URLs (should complete in <4 minutes)
- [ ] Check Railway logs for no timeout errors
- [ ] Verify keepalive messages in network tab
- [ ] Monitor screenshot timer accuracy
- [ ] Confirm all screenshots captured fully
- [ ] Check lazy-load images still working

## Monitoring

### Signs of Success
- ✅ No "504 Gateway Timeout" errors
- ✅ No "API request timeout" errors
- ✅ Requests complete within expected time
- ✅ Keepalive messages visible in logs/network tab

### Signs of Issues
- ❌ Requests timing out after 5 minutes
- ❌ Connection dropping during screenshots
- ❌ "Network error" in browser console
- ❌ Incomplete screenshot captures

## Railway-Specific Configuration

If still experiencing timeouts on Railway, add to `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "networking": {
    "timeout": 300
  }
}
```

Or set environment variable:
```bash
railway variables:set HTTP_TIMEOUT=300
```

## Summary

**Changes Made**:
1. ✅ Added API route config with 5-minute `maxDuration`
2. ✅ Added SSE keepalive every 15 seconds
3. ✅ Added buffering prevention headers
4. ✅ Added Next.js experimental config for body limits

**Next Steps** (Recommended):
1. Reduce multi-desktop max from 5 to 4 URLs
2. Reduce multi-desktop delays from 55s to 47s
3. Test on Railway to confirm no timeouts
4. Update documentation with new limits

**Result**: Screenshot generation should now complete successfully without timeout errors!
