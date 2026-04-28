# CLAUDE.md - Development Guide for Claude Bots

This file provides guidance to Claude Code when working on this browser extension project.

## Project Overview

**Time Limit** is a browser extension that helps users stay focused by limiting time spent on distracting websites. Users can:
- Set daily time limits for specific sites or groups of sites
- Set open count limits (how many times a site can be visited per day)
- Receive motivational messages when limits are reached
- Quickly add limits from the toolbar popup

**Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Manifest V3

## Architecture Overview

The extension follows a **modular event-driven architecture** with three main layers:

### 1. Background Scripts (`src/background_scripts/`)
Non-persistent event handlers that manage the extension's core logic:

- **`background.js`**: Main event router listening to browser events (alarms, navigation, messages, toolbar clicks)
- **`site_storage.js`**: CRUD operations for sites and limits
- **`group_storage.js`**: CRUD operations for site groups
- **`usage_recorder.js`**: Tracks time spent and visits per site via alarms
- **`distraction_detector.js`**: Detects if current URL matches any limited sites (flexible pattern matching)
- **`site_blocker.js`**: Blocks/redirects users to timeout page when limits are reached
- **`badge_manager.js`**: Updates toolbar badge with remaining time
- **`daily_reset.js`**: Triggers daily reset of usage stats via alarms
- **`note_storage.js`**: Stores motivational messages for blocked sites
- **`usage_storage.js`**: Daily usage data persistence
- **`validation_utils.js`**: Input validation for sites, limits, notes

### 2. UI Components (`src/pages/` and `src/components/`)
React components that run in isolated contexts:

- **`pages/popup/`**: Toolbar popup component (PluginPopup.tsx) with quick limit setup
- **`pages/settings/`**: Settings page (SettingsPage.tsx) for managing sites, groups, and limits
- **`pages/timeout/`**: Timeout page (TimeoutPage.tsx) shown when users hit their limits

### 3. Shared Libraries (`src/lib/`)
- **`api.ts`**: Type-safe message passing wrapper for background script communication
- **`storage.ts`**: Type definitions and converters for storage objects
- **`hooks/`**: Reusable React hooks for common state management patterns
- **`utils/`**: Utility functions for error handling, formatting, notifications, and constants

## Component Architecture

### Main UI Components Structure
```
src/components/
├── PluginPopup.tsx           # Toolbar popup - manages state and routing
├── SettingsPage.tsx          # Settings page - manages dialogs and data
├── TimeoutPage.tsx           # Timeout page - shows when limits reached
│
├── popup/                    # Popup view components (extracted from PluginPopup)
│   ├── NormalPageView.tsx    # Regular site tracking view
│   ├── DisabledStateView.tsx # Disabled site/group view
│   ├── UnlimitedSiteView.tsx # Unlimited sites view
│   ├── TimeoutPageView.tsx   # Timeout + extension form
│   └── SettingsPageView.tsx  # Settings info view
│
└── settings/                 # Settings tab components (extracted from SettingsPage)
    ├── IndividualSitesTab.tsx    # Individual sites management
    ├── GroupsTab.tsx            # Groups management
    ├── MessagesTab.tsx          # Messages & preferences
    ├── AddSiteDialog.tsx        # Add/edit site dialog
    ├── CreateGroupDialog.tsx    # Create/edit group dialog
    └── AddSiteToGroupDialog.tsx # Add site to group dialog
```

### Component Guidelines

**Main Components (PluginPopup, SettingsPage, TimeoutPage)**
- Manage overall state and data loading
- Handle async operations and API calls
- Route to appropriate view components
- Use custom hooks for state management

**View Components (popup/*, settings/*)**
- Pure presentation logic
- Receive data and callbacks as props
- Minimal state (only UI state)
- Reusable across different contexts

**Dialog Components**
- Separate from parent component logic
- Handle their own form state
- Call parent callbacks on submit
- Support both create and edit modes

## Reusable Hooks

### useToggleSelection
Manages toggle selection state between a value and null.
```typescript
const [selected, toggle, reset] = useToggleSelection<T>(initialValue);
// toggle(value) - select/deselect
// reset() - reset to initial value
```
**Used in**: PluginPopup (timeLimit/opensLimit selection)

### useDialogManager
Manages dialog open/close state with associated data.
```typescript
const dialog = useDialogManager<T>(initialData);
// dialog.isOpen - dialog visibility
// dialog.open(data) - open with data
// dialog.close() - close dialog
// dialog.reset() - reset to initial state
// dialog.data - current data
// dialog.setIsOpen() - manual state setter
```
**Used in**: SettingsPage (site, group, add-to-group dialogs)

### useEditMode
Manages edit mode state with data tracking.
```typescript
const editor = useEditMode<T>(initialData, getItemId);
// editor.isEditing - editing state
// editor.editingId - currently edited item ID
// editor.editingData - current edit data
// editor.startEdit(data) - start editing
// editor.updateData(data) - update edit data
// editor.finishEdit() - finish editing
// editor.cancelEdit() - cancel without saving
```
**Used in**: SettingsPage (message editing)

## Utility Functions

### Error Handler (`src/lib/utils/errorHandler.ts`)
Consistent error handling across components.

```typescript
// Extract error message from various error types
getErrorMessage(error: unknown): string

// Log error with context
logError(context: string, error: unknown): void

// Get standardized error toast properties
getErrorToastProps(message: string, title?: string): ToastProps

// Get standardized success toast properties
getSuccessToastProps(message: string, title?: string): ToastProps
```

**Pattern**: Use in all async handlers for consistent error UI.

### Constants & Helpers
- **`constants/urls.ts`**: Page identification helpers
- **`constants/suggestions.ts`**: Activity suggestions and motivational quotes
- **`utils/formatting.ts`**: Time conversion utilities
- **`utils/notifications.ts`**: Toast notification templates

## Key Patterns

### Event-Driven Architecture
- Background script listens to: `browser.alarms.onAlarm`, `browser.webNavigation.onBeforeNavigate`, `browser.runtime.onMessage`, `browser.action.onClicked`
- All state stored in `chrome.storage.local`
- Modules are stateless (data fetched on each event)

### Real-Time Synchronization
- UI changes trigger `broadcast_update` messages from background script
- All UI components listen for broadcasts via `useBroadcastUpdates` hook
- Updates are immediate across all open tabs and pages

### Message Passing Protocol
Every message follows this structure:
```typescript
interface Message {
  type: string;
  payload?: any;
  // Background responds with: { success: boolean, data?: any, error?: { message, type, isRetryable } }
}
```

### Site Matching
Flexible URL pattern matching:
- Domain: `facebook.com` matches any path/subdomain
- Subdomain: `mail.google.com` matches exact subdomain
- Protocol: `https://twitter.com` includes protocol
- Case-insensitive matching

### Limit Types
- **Time Limits**: Minutes (1-1440), tracked via daily alarms checking chrome.storage
- **Open Count Limits**: Site visits (1-100), tracked on webNavigation.onBeforeNavigate
- **Combined**: Sites can have both; blocked when ANY limit reached

## Common Development Tasks

### Adding a New Feature
1. Define message types in background script
2. Implement handler in appropriate background module
3. Add API wrapper in `src/lib/api.ts`
4. Use API in React component with proper error handling
5. Add broadcast update if it affects other UI components
6. Test message passing and state synchronization

### Modifying Site Storage
- Always go through `site_storage.js` functions (not direct storage access)
- Changes trigger `broadcast_update` to notify UI
- Automatic cache invalidation in background script

### Updating UI in Real-Time
- Components use `useBroadcastUpdates` hook to listen for background updates
- Hook automatically re-renders when relevant updates occur
- See `PluginPopup.tsx` for example implementation

### Handling Limit Enforcement
- `site_blocker.js` checks limits on every navigation
- If limit reached, user redirected to timeout page
- Timeout page shows remaining time and motivational message
- Opening the blocked site again re-checks limits

## Code Standards

### File Organization
- Keep background scripts under 600 lines
- Group related logic together
- Use clear, descriptive function names
- Export only necessary functions
- Extract view components to separate files (1 component per file)
- Keep main components focused on state/data management, not presentation

### State Management
- Use custom hooks for common patterns (useToggleSelection, useDialogManager, useEditMode)
- Extract reusable state patterns to hooks in `src/lib/hooks/`
- Each component should have a single, clear purpose
- Avoid prop drilling - pass only necessary data to child components

### Error Handling
- Use `errorHandler` utilities for consistent error messages
- Pattern: `logError(context, error)` + `toast(getErrorToastProps(message))`
- Validation happens early via `validation_utils.js`
- Background script wraps responses in `{ success, data, error }`
- API wrapper throws on errors with categorized error types

**Example**:
```typescript
try {
  await api.doSomething();
  toast(getSuccessToastProps("Success message"));
} catch (error) {
  logError("Error context", error);
  toast(getErrorToastProps("User-friendly error message"));
}
```

### TypeScript
- Use strict mode (tsconfig.json)
- Define interfaces in `src/lib/storage.ts` for storage objects
- API responses include proper type definitions
- React components use proper event handler typing
- Use generic types for reusable hooks

### Component Decomposition
When a component exceeds ~400 lines:
1. Identify logical sections (related UI blocks)
2. Extract to separate view/tab components
3. Move data fetching/state to parent
4. Pass data and callbacks as props to children

### Testing
- Unit test background scripts in isolation
- Integration tests verify message passing between components
- Test storage operations with mock storage
- Test custom hooks with React Testing Library

## Storage Schema

```
chrome.storage.local keys:
- distracting_sites: Site[] (array of site objects with limits)
- site_groups: Group[] (array of group objects)
- usage_data: { [siteId]: UsageEntry } (daily tracking)
- timeout_notes: { [siteId]: string } (motivational messages)
- extension_version: string (for migrations)
```

## Building & Running

```bash
# From root directory
npm run build          # Build dist/
npm run dev           # Dev server with HMR
npm run lint          # ESLint check
npm run preview       # Preview production build

# To load in Firefox:
1. Go to about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select src/manifest.json
```

## Important Notes

- **Manifest V3 Compliance**: Use `chrome.alarms` instead of `setInterval`/`setTimeout` for background tasks
- **Non-persistent Background**: Background script only runs when events occur
- **Message Passing**: All communication goes through browser.runtime.sendMessage
- **Storage Limits**: chrome.storage.local has limits (~10MB total)
- **Security**: Always validate user input; avoid eval; sanitize URLs

## Project Evolution & Documentation

### Cleanup Phases Completed

**Phase 1-4**: Foundation cleanup
- Extracted constants and helpers to dedicated files
- Removed excessive documentation and console logs
- Cleaned up imports and unused code

**Phase 5**: Component extraction (PluginPopup)
- Extracted 5 view components from monolithic PluginPopup
- Reduced from 989 → 541 lines (-45%)

**Phase 5b**: Component extraction (SettingsPage)
- Extracted 3 tab components from SettingsPage
- Reduced from 1244 → 831 lines (-33%)

**Phase 6**: State management consolidation
- Part 1: Created reusable hooks for common patterns
- Part 2: Refactored components to use new hooks
- Part 3: Integrated error handler utility across components
- Result: Consolidated 11+ manual state variables into 4 reusable hooks

**Phase 1 (Audit)**: Component & dependency audit
- Documented UI component usage (13 active, 30 for future)
- Removed 3 unused dependencies (date-fns, zod, @hookform/resolvers)
- Fixed all npm vulnerabilities (8 → 0)

### Reference Documents

- **PHASE1_UI_AUDIT.md** - Component usage analysis and dependency documentation
- **CLEANUP_SUMMARY.md** - Overall cleanup phase metrics and improvements
- **PHASE6_ANALYSIS.md** - State duplication analysis and refactoring guide

## Common Gotchas

1. **State Management**: Don't try to store state in background script variables; always use chrome.storage
2. **Event Handlers**: Each event listener should be defined at top-level in background.js
3. **Alarms**: Create alarms in initialization; they persist across extension reloads
4. **Cache Invalidation**: Changes to sites/limits need to update badge, re-check blocked tabs
5. **URL Matching**: The same URL pattern may match multiple sites; extension blocks based on highest match priority
6. **Hook Dependencies**: Custom hooks must return consistent types; use generics for flexibility
7. **Dialog Management**: Always reset dialog state when closing to prevent data leaks between operations

## UI Component Library

### Available UI Components
The `src/components/ui/` folder contains 43 shadcn/ui components available for use:

**Actively Used** (13): Badge, Button, Card, Dialog, Input, Label, Progress, Switch, Tabs, Textarea, Toaster, Sonner, TooltipProvider, Toast

**Available for Future Use** (30): accordion, alert-dialog, aspect-ratio, avatar, breadcrumb, calendar, carousel, checkbox, collapsible, command, context-menu, dropdown-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, radio-group, scroll-area, select, separator, sheet, skeleton, slider, table, toggle, toggle-group

### Using UI Components

All shadcn/ui components follow consistent patterns:
```typescript
// Import from @/components/ui/
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Use with Tailwind classes for styling
<Button className="bg-primary hover:bg-primary/90">Click me</Button>

// Components are accessible and keyboard-navigable out of the box
```

### Adding New Components

When you need a new component not in the list:
1. Check `src/components/ui/` for existing implementations
2. If needed, components can be easily added via shadcn/cli
3. Import and use with consistent Tailwind styling
4. Document new component usage in this guide

See [shadcn/ui Components](https://ui.shadcn.com/) for documentation and visual examples.

## References

- [MDN WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [React Component Docs](https://react.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
