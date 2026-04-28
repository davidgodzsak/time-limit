# Rating Reminder System Documentation

## Overview
The rating reminder system prompts users to rate the extension on app stores. It's non-intrusive and uses smart trigger logic to avoid annoying users. The system has multiple display locations and respects user preferences through delay gates and dismissal limits.

## Core Logic & Rules

All rating trigger rules are evaluated in `src/background_scripts/rating_storage.js` in the `shouldShowRatingPrompt()` function:

### Rule 1: Already Rated (❌ BLOCKS)
- **Logic**: If `hasRated === true`, never show again
- **Persistence**: Set when user clicks "Rate Now" or "Already Rated"
- **Reversible**: No (unless manually reset in storage)

### Rule 2: Max Dismissals Reached (❌ BLOCKS)
- **Logic**: If `declineCount >= 5`, never show again
- **Increment**: +1 when user clicks "Later" / "Dismiss"
- **Effect**: After 5 dismissals, the rating prompt is permanently hidden

### Rule 3: Re-prompt Time Gate (❌ BLOCKS)
- **Logic**: If `nextPromptAfter` is set and current time < `nextPromptAfter`, don't show
- **Window**: 7 days between dismissals
- **When Set**:
  - When user dismisses ("Later"): `nextPromptAfter = now + 7 days`
  - When prompt is shown: `nextPromptAfter = now + 7 days` (via `recordPromptShown`)

### Rule 4: Onboarding Must Be Complete (❌ BLOCKS)
- **Logic**: If `onboardingData.completed !== true`, never show
- **Purpose**: Avoid interrupting new users during setup
- **Related File**: Checked against `onboarding_state` in storage

### Rule 5: Install Age Gate (❌ BLOCKS)
- **Logic**: If extension was just installed, don't show for 4 days
- **Calculation**: Current time - onboarding completion time >= 4 days (345,600,000 ms)
- **Purpose**: Let users get comfortable with the extension first
- **Requirement**: `onboardingData.completedAt` must be set and valid ISO date

**SUMMARY**: All 5 rules must pass for the prompt to be eligible to show. It's a strict AND logic.

---

## Display Locations & Trigger Events

### 1. **Popup Page** (`src/components/PluginPopup.tsx`)

**Component**: `RatingPromptView` (full-screen replacement view)

**Trigger Event**: After user successfully adds a limit on a normal site
```typescript
// PluginPopup.tsx, lines 298-305
if (ratingState.shouldShow) {
  setShowRatingPrompt(true);
  await api.recordRatingPromptShown(); // Set 7-day gate
}
```

**Display Logic**:
- Replaces entire popup UI when conditions met
- Only shows on normal pages (not extension pages like settings, timeout, info)
- Condition check: `pageType === 'normal'` and `showRatingPrompt === true`

**Triggered On**:
- User clicks "Add Limit" after selecting time or open count presets

**Show Count**: Shows whenever threshold is crossed (can show multiple times if dismissed & gate expires)

**User Actions**:
- "Rate Now" → `handleRateNow()` → Opens rating URL + marks as rated
- "Already Rated" → `handleAlreadyRated()` → Marks as rated
- "Later" → `handleDismissRating()` → Increments dismissal count + sets 7-day gate

---

### 2. **Settings Page** (`src/components/SettingsPage.tsx`)

**Component**: `RatingCard` (banner at top)

**Trigger Events**: Two independent events that can each trigger display

#### Event 2A: Initial Load
```typescript
// SettingsPage.tsx, lines 114-130
useEffect(() => {
  const loadRatingState = async () => {
    const ratingState = await api.getRatingState();
    const debugMode = new URLSearchParams(window.location.search).get('debug-rating') === 'true';
    if (ratingState.shouldShow || debugMode) {
      setShowRatingBanner(true);
      await api.recordRatingPromptShown(); // Set 7-day gate
    }
  };
  loadRatingState();
}, []);
```

**Trigger Condition**:
- On page load, if `shouldShow` is true
- Always shows in debug mode: `?debug-rating=true`

#### Event 2B: After Adding a Site
```typescript
// SettingsPage.tsx, lines 425-432
try {
  const ratingState = await api.getRatingState();
  if (ratingState.shouldShow) {
    setShowRatingBanner(true);
    await api.recordRatingPromptShown();
  }
} catch { /* non-critical */ }
```

**Trigger Condition**:
- After user creates a new site (not editing existing)
- Called within `handleAddSite()` after successful API call

#### Event 2C: After Creating a Group
```typescript
// SettingsPage.tsx, lines 504-511
try {
  const ratingState = await api.getRatingState();
  if (ratingState.shouldShow) {
    setShowRatingBanner(true);
    await api.recordRatingPromptShown();
  }
} catch { /* non-critical */ }
```

**Trigger Condition**:
- After user creates a new group (not editing existing)
- Called within `handleCreateGroup()` after successful API call

**Display Logic**:
- Shows as inline banner at top of page (above tabs)
- Condition: `showRatingBanner === true`
- Persists across tab switches

**User Actions**:
- "Rate Now" → Opens rating URL + marks as rated
- "Already Rated" → Marks as rated
- "Later" → Increments dismissal count + sets 7-day gate

---

### 3. **Info Page** (`src/components/InfoPage.tsx`)

**Component**: `RatingCard` (inline card section)

**Trigger Event**: Page load only
```typescript
// InfoPage.tsx, lines 36-48
useEffect(() => {
  const loadRatingState = async () => {
    const ratingState = await api.getRatingState();
    const debugMode = new URLSearchParams(window.location.search).get('debug-rating') === 'true';
    setHasRated(ratingState.hasRated && !debugMode); // Hides card if already rated
  };
  loadRatingState();
}, []);
```

**Trigger Condition**:
- Shows by default unless `hasRated === true`
- Shows regardless of 4-day gate or other rules
- Ignores onboarding requirement
- Ignores dismissal count
- Always shown if in debug mode: `?debug-rating=true`

**Display Logic**:
- Shows conditionally as card section: `{!hasRated && <RatingCard ...>}`
- Only hides if user has already marked as rated

**User Actions**:
- "Rate Now" → Opens rating URL + marks as rated
- "Already Rated" → Marks as rated
- No "Later" button (dismissal not tracked for info page)

**Note**: Info page has relaxed rules - it's meant to be a persistent option regardless of dismissals.

---

## State Management

### Storage Structure
```javascript
// chrome.storage.local key: 'rating_state'
{
  hasRated: boolean,           // true = never show again
  declineCount: number,        // 0-5, increments on "Later"
  lastPromptDate: ISO string,  // when prompt was last shown
  nextPromptAfter: ISO string  // when user is eligible to see it again
}
```

### State Mutations

| Action | Function | Changes |
|--------|----------|---------|
| User clicks "Rate Now" | `markRated()` | `hasRated = true`, `declineCount = 0`, `nextPromptAfter = null` |
| User clicks "Already Rated" | `markRated()` | Same as "Rate Now" |
| User clicks "Later" | `declineRating()` | `declineCount += 1`, `nextPromptAfter = now + 7 days` |
| Prompt is shown (called automatically) | `recordPromptShown()` | `nextPromptAfter = now + 7 days` |

---

## Flow Diagrams

### Decision Tree for Showing Prompt
```
START: Component needs to display rating
  ↓
Check: hasRated?
  ├─ YES → HIDE ❌
  └─ NO → Continue
  ↓
Check: declineCount >= 5?
  ├─ YES → HIDE ❌
  └─ NO → Continue
  ↓
Check: nextPromptAfter gate passed?
  ├─ NO (still gated) → HIDE ❌
  └─ YES → Continue
  ↓
Check: Onboarding completed?
  ├─ NO → HIDE ❌
  └─ YES → Continue
  ↓
Check: Install age >= 4 days?
  ├─ NO → HIDE ❌
  └─ YES → Continue
  ↓
SHOW ✅ (shouldShow = true)
```

### Timeline Example
```
Day 0 (Installation)
  ├─ User completes onboarding: completedAt = now
  ├─ Popup: No prompt (onboarding not done)
  └─ Settings: No prompt (onboarding not done)

Day 1-3
  ├─ User adds limits: Checks show (fails 4-day gate)
  └─ Settings: No prompt (fails 4-day gate)

Day 4
  ├─ User adds limit: Check passes! Shows prompt
  ├─ nextPromptAfter = Day 11
  └─ Settings: Shows on load or after actions

Day 5
  ├─ User dismisses ("Later")
  ├─ declineCount = 1
  ├─ nextPromptAfter = Day 12 (recalculated)
  └─ Won't show until Day 12

Day 12
  ├─ 7 days passed, gate expired
  ├─ User adds limit: Shows again
  └─ Repeats cycle...

After 5 dismissals (Day 32+)
  ├─ declineCount = 5
  └─ NEVER shows again (even if gates expire)
```

---

## Debug Mode & Testing

### Debug Query Parameters

Add `?debug-rating=true` to any page URL to enable debug mode:
- **Settings Page**: Shows banner regardless of state (even if already rated)
- **Info Page**: Shows card regardless of `hasRated` flag
- **Popup**: Cannot force show (must add limit to trigger)

Example:
```
chrome-extension://xxx/ui/settings/settings.html?debug-rating=true
chrome-extension://xxx/pages/info/index.html?debug-rating=true
```

---

## Summary Table

| Location | Component | Trigger | Shows If | Can Dismiss | Remembers |
|----------|-----------|---------|----------|----------|-----------|
| Popup | RatingPromptView | Add limit | All 5 rules pass | Yes (Later) | Yes |
| Settings | RatingCard | Load, Add site, Add group | All 5 rules pass* | Yes (Later) | Yes |
| Info | RatingCard | Load | hasRated = false** | No button | Not tracked |

*Settings checks same rules as popup
**Info page ignores all gating rules except hasRated

---

## Browser Support

The rating URLs differ by browser target (defined in `src/lib/constants/rating.ts`):

```typescript
RATING_URLS = {
  firefox: 'https://addons.mozilla.org/firefox/addon/time-limit/reviews/',
  chrome: 'https://chromewebstore.google.com/detail/time-limit/PLACEHOLDER_ID/reviews'
}
```

The active URL is determined by the `__BROWSER_TARGET__` Vite variable.

---

## API Methods

All rating operations go through `src/lib/api.ts`:

```typescript
// Get current rating state + computed shouldShow flag
getRatingState(): Promise<RatingState>

// Mark user as having rated
markRated(): Promise<void>

// Record that user dismissed the prompt (increment decline count)
declineRating(): Promise<void>

// Record that prompt was shown (sets 7-day gate)
recordRatingPromptShown(): Promise<void>
```

---

## Known Behaviors & Edge Cases

1. **Dismissal Counter Only Increments on "Later"**:
   - "Rate Now" and "Already Rated" set `hasRated = true` immediately
   - They reset `declineCount = 0` (user won't be bugged again)

2. **Each "Later" Click Extends the Gate**:
   - `recordPromptShown()` is called automatically when prompt shows
   - `declineRating()` is called when user clicks "Later"
   - Both set `nextPromptAfter = now + 7 days`
   - This means: even if prompt shows, user has ~7 days before it can show again

3. **Info Page Persistence**:
   - Unlike popup/settings, info page doesn't respect dismissal counter
   - It's designed as a "permanent" option for users who want to rate later
   - The "Later" button doesn't exist on info page

4. **Onboarding State Dependency**:
   - Rating system requires `onboarding_state` to exist and have `completedAt`
   - If onboarding fails or is skipped, rating prompt never shows
   - This is intentional to avoid bothering incomplete setups

5. **Non-critical Error Handling**:
   - Rating checks are wrapped in try-catch blocks with non-blocking fallback
   - If rating API fails, it doesn't break the main flow
   - Users just won't see the prompt (safe to ignore)
