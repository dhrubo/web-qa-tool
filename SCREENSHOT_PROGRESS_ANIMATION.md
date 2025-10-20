# Screenshot Progress Animation

## Overview
Added animated progress bar that shows real-time countdown during screenshot capture phase.

## Features

### 1. **Dual Progress Display**
- **Overall Progress**: Shows total QA check progress across all checks
- **Screenshot Progress**: Dedicated animated timer for screenshot phase

### 2. **Real-Time Countdown**
- Updates every 100ms for smooth animation
- Shows remaining seconds in real-time
- Displays accurate percentage progress

### 3. **Mode-Specific Timing**
```typescript
single-alpha mode:
- Original screenshots: 30 seconds
- Alpha screenshots: 50 seconds
- Total: 80 seconds

multi-desktop mode:
- Original screenshots: 20 seconds
- Alpha screenshots: 35 seconds
- Total: 55 seconds
```

### 4. **Visual Indicators**
- 📷 Animated pulsing icon during screenshot capture
- ⏱️ Live countdown timer (e.g., "45s", "23s", "5s")
- Progress bar with smooth animation
- Mode description showing what's being captured

## UI Components

### Screenshot Progress Card
```
┌─────────────────────────────────────────────┐
│ 📷 Taking Screenshots (4 images)    ⏱️ 45s  │
├─────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────────┤
│ Desktop + Mobile | Original + Alpha    56% │
└─────────────────────────────────────────────┘
```

## Technical Implementation

### State Management
```typescript
const [screenshotProgress, setScreenshotProgress] = useState(0);
const [timeRemaining, setTimeRemaining] = useState(0);
const [isTakingScreenshots, setIsTakingScreenshots] = useState(false);
```

### Timer Logic
1. **Start**: Triggered when "Taking screenshots" status received
2. **Update**: Every 100ms, calculates elapsed time and remaining seconds
3. **Stop**: Triggered when moving to next stage (visual diff, checks, etc.)
4. **Cleanup**: Timer cleared on component unmount

### Animation Smoothness
- Updates 10 times per second (100ms interval)
- Smooth progress bar fill animation
- Prevents timer overflow with `Math.min()` and `Math.max()`

## User Experience Benefits

### Before
- Single progress bar showing overall progress
- No visibility into screenshot timing
- Users uncertain why progress seemed "stuck" at 30%

### After
- ✅ Clear visibility into screenshot phase
- ✅ Real-time countdown reduces anxiety
- ✅ Users know exactly how long to wait
- ✅ Mode-specific timing displayed
- ✅ Visual indication of what's being captured

## Code Changes

### Files Modified
- `app/page.tsx`: Added screenshot timer state, refs, and UI components

### Key Functions
```typescript
// Start animated countdown
startScreenshotTimer(mode: "single-alpha" | "multi-desktop")

// Stop timer and reset
stopScreenshotTimer()
```

### Timer Lifecycle
```
Status: "Taking screenshots" → Start Timer
  ↓
Every 100ms: Update progress & countdown
  ↓
Status: "Performing visual diff" → Stop Timer
```

## Testing Checklist

- [ ] Run single-alpha mode - verify 80s total (30s + 50s)
- [ ] Run multi-desktop mode - verify 55s total (20s + 35s)
- [ ] Check smooth animation (no jumps or freezes)
- [ ] Verify countdown accuracy (1s = 1 second)
- [ ] Test with multiple URLs (timer resets for each)
- [ ] Check mobile responsiveness of progress cards
- [ ] Verify timer cleanup (no memory leaks)

## Future Enhancements

1. **Per-Screenshot Timing**: Show individual progress for each of 4 screenshots
2. **Pause/Resume**: Allow users to pause screenshot capture
3. **Speed Options**: Let users choose faster/slower screenshot modes
4. **Audio Alert**: Optional sound when screenshots complete
5. **Progress Persistence**: Save progress across page refreshes

## Performance Notes

- Minimal overhead: Timer uses 100ms intervals (10 updates/second)
- No impact on screenshot timing (runs in parallel)
- Cleanup on unmount prevents memory leaks
- Uses refs to avoid unnecessary re-renders
