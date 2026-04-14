# Implementation Plan - Timer & Ranking System

This plan outlines the addition of a real-time game timer and a leaderboard to track and rank teams based on their completion efficiency and progress.

## User Review Required

> [!IMPORTANT]
> **Timer Start Logic**: I propose starting the timer on the **first login** of the team. This ensures every team is measured from their actual start time in the field.
> **Leaderboard Accessibility**: I will make the leaderboard accessible to all participants via the Navbar so they can see their rank in real-time.

## Proposed Changes

### Backend - Data & Logic

#### [MODIFY] [types.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/types.ts)
- Add `startTime?: string` (ISO date) and `finishTime?: string` (ISO date) to the `GameState` interface.

#### [MODIFY] [game.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/game.ts)
- Update `createInitialGameState` to initialize these fields as `null`.
- Update `sanitizeGameStateUpdate` to allow updating these fields.

#### [MODIFY] [index.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/index.ts)
- **Timer Start**: In the `/api/auth/login` endpoint, if `gameState.startTime` is not set, set it to the current time.
- **Finish Detection**: In the state update logic, if the stage changes to `complete`, set `finishTime`.
- **Leaderboard Endpoint**: Add `GET /api/leaderboard` which:
    - Fetches all teams.
    - Calculates `duration` for finished teams.
    - Sorts by: 
        1. Completion (finished teams first).
        2. Progress (highest round reached).
        3. Time (shortest duration for those finished).

### Frontend - UI components

#### [NEW] [GameTimer.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/GameTimer.tsx)
- A component that calculates elapsed time from `startTime` to `Date.now()` (or `finishTime`).
- Updates every second.

#### [NEW] [Leaderboard.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/Leaderboard.tsx)
- A table/list view showing team names, rounds completed, and their time.
- Use neon styling consistent with the rest of the app.

#### [MODIFY] [Navbar.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/Navbar.tsx)
- Add a "Leaderboard" button/link.
- Display the `GameTimer` in the navbar when a team is logged in.

#### [MODIFY] [App.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/App.tsx)
- Add routing/state logic to switch to the Leaderboard view.

## Verification Plan

### Automated Tests
- Mock a team login and verify `startTime` is created.
- Mock a game completion and verify `finishTime` is set.
- Verify the leaderboard API returns teams in the correct order.

### Manual Verification
- Log in as a team and ensure the timer starts counting.
- Complete the game and check if the total time is captured.
- Open the leaderboard on multiple devices to ensure it updates correctly.
