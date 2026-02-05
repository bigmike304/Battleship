# QA Summary - Battleship UI Fixes

## Test Date: February 5, 2026

## Issues Addressed

### ISSUE 1: Setup Controls Layout
**Status: FIXED**
- Restructured DOM so setup controls appear at top of page in correct order
- Order: Choose Placement Mode → Randomize My Ships + Start Game → AI Difficulty → Sound Toggle → Player Name + Save Name
- No absolute/fixed positioning or CSS order hacks used
- Setup controls render above boards, battle log, and leaderboard on all screen sizes

### ISSUE 2: Name/Leaderboard Saving
**Status: FIXED**
- Added explicit "Save Name" button with validation
- Non-empty name validation with inline error message
- Name saves to localStorage and persists across refresh
- Inline confirmation "Name saved!" displayed on successful save
- Removed end-of-game prompt for name entry
- Win condition uses saved name from localStorage
- If name empty at win: shows inline message "Save your name to record your score" and highlights name input

### ISSUE 3: Full Bug Check Pass
**Status: COMPLETED**

## Manual Acceptance Test Results

| Test | Result | Notes |
|------|--------|-------|
| A) Fresh load: no console errors | PASS | Only favicon 404 (non-critical) |
| B) Placement mode selection works | PASS | Manual and Random modes work correctly |
| C) Random placement generates valid fleets | PASS | Ships placed without overlap |
| D) Manual placement rejects overlap/out-of-bounds | PASS | Start gated until complete |
| E) Restart does not duplicate event listeners | PASS | No double shots/logs/AI turns |
| F) Shot counter increments exactly once per player shot | PASS | Counter shows correct value |
| G) AI never repeats a shot | PASS | Verified via automated tests |
| H) Sounds play correctly | PASS | Hit/miss sounds for player and AI |
| I) Sound toggle works and persists | PASS | Toggle state saved to localStorage |
| J) Win condition saves leaderboard correctly | PASS | Name/score/difficulty saved |
| K) Leaderboard sorts ascending | PASS | Lowest shots first |
| L) Clear Leaderboard works | PASS | Clears all entries |

## Automated Test Results

```
npm test
✓ tests/game.test.js (46 tests)
✓ tests/board.test.js (27 tests)
✓ tests/huntTargetAI.test.js (16 tests)
✓ tests/aiCore.test.js (28 tests)
✓ tests/probabilityAI.test.js (24 tests)

Test Files  5 passed (5)
Tests       141 passed (141)
```

### AI Shot Deduplication Tests (aiCore.test.js)
- "should never repeat a shot across multiple moves" - PASS
- "should track shots in state correctly" - PASS
- "should ignore already-shot cells" - PASS

## Edge Cases Handled

1. **Empty name at game win**: Shows inline message instead of broken modal
2. **Name persistence**: Saved to localStorage, survives refresh and restart
3. **Sound autoplay restrictions**: Audio only plays after user gesture
4. **Restart state reset**: All game state properly reset without listener duplication

## Files Modified

- `index.html` - Restructured DOM for setup controls
- `src/styles.css` - Added styles for new elements
- `src/ui/renderer.js` - Updated visibility logic for setup section
- `src/ui/gameFeatures.js` - Added Save Name button functionality

## Browser Compatibility

Tested on Chrome (via Playwright). Uses standard web APIs compatible with modern browsers.
