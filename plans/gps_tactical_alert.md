# GPS, Leaderboard & Add-on System Notifications

## Goal
1. Include Runner GPS coordinates in Discord alerts.
2. Highlight teams on the Leaderboard when help is requested.
3. **Add** Native System Notifications *without* modifying the existing in-game alert UI.

## Proposed Changes

### 1. Database Model
- Add `helpRequested: boolean` (default: `false`) to the Team schema.

### 2. Frontend: Passive System Notifications
#### [MODIFY] [App.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/App.tsx)
- **Keep** existing `adminNotification` UI logic.
- **Add** permission request on startup.
- **Add** `new Notification()` trigger inside the same effect that handles admin messages. This will fire the OS alert alongside the in-game UI.

#### [NEW] [manifest.json](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/public/manifest.json)
- Add PWA manifest to support "Add to Home Screen" on mobile.

### 3. Frontend: Geolocation & Leaderboard
- Capture `navigator.geolocation` on support request.
- Apply `animate-pulse` to help-requesting teams on the Leaderboard.

### 4. Backend: Logic & Discord
- `POST /api/team/request-help`: Set `helpRequested = true` + Discord alert with Map link.
- **Auto-Clear**: Clear `helpRequested` flag when admin responds.

## Verification Plan
1. Confirm existing "COMMAND OVERRIDE" UI still works as expected.
2. Verify a system-level notification pops up *at the same time* as the UI alert.
3. Verify GPS and Leaderboard sync.
