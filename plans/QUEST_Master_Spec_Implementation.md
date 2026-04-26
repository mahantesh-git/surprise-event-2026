# Implementation Plan - QUEST Master Spec

This plan outlines the changes required to implement the core features of the **QUEST Master Spec**: Advanced Points System, Adaptive Difficulty Scaling, and the Round Swap Logic.

## User Review Required

> [!IMPORTANT]
> **Scoring Reset**: Implementing the new points system will make existing scores inconsistent. I recommend a score reset for all teams after deployment.
> **Difficulty Thresholds**: I have proposed thresholds for difficulty scaling (e.g., < 3 mins for hard). Please confirm if these align with your expectations.

## Proposed Changes

### 1. Database & Schema Updates

#### [MODIFY] [types.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/types.ts)
- Add `difficulty: 'normal' | 'hard'` to `GameState`.
- Add `currentRoundStartTime?: string` to `GameState` to track precise puzzle-solving time.
- Add `difficultyTier: 'normal' | 'hard'` to `TeamDocument`.
- Update `QuestionDocument` to include optional `parTime` (for future reference).

#### [MODIFY] [db.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/db.ts)
- Add `getReservePoolCollection` to handle the spare rounds pool.
- Add indexes for the reserve pool.

---

### 2. Advanced Points System (Feature 1)

#### [MODIFY] [index.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/index.ts)
- Update `/api/runner/complete-round` to use the Master Spec formula:
    - **Base**: 200 pts.
    - **Difficulty Bonus**: +283 pts (if round was 'hard').
    - **Speed Bonus (Tiers)**:
        - < 10 mins: +500 pts.
        - 10-15 mins: +250 pts.
        - 15-25 mins: +100 pts.
        - > 25 mins: 0 pts.

---

### 3. Adaptive Difficulty Scaling (Feature 2)

#### [MODIFY] [game.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/game.ts)
- Implement `calculateDifficulty(averageTime: number): 'normal' | 'hard'`.
- Update `createInitialGameState` to include default difficulty.

#### [MODIFY] [index.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/index.ts)
- Update Solver's "ingress authorization" (passkey verification) to set `currentRoundStartTime`.
- In `/api/runner/complete-round`, calculate the time delta and update the team's difficulty for the *next* round based on their performance.

#### [MODIFY] [RunnerGame.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/RunnerGame.tsx)
- Pass `difficulty` prop to minigames.
- **Minigame Scaling**:
    - **Target Lock**: Hard = 15 hits (Normal = 10), Time = 12s (Normal = 15s).
    - **Neural Decode**: Hard = 8 pairs (Normal = 6).
    - **Cipher Crack**: Hard = Pattern length 6 (Normal = 4).

---

### 4. Round Swap System (Feature 3)

#### [NEW] [round-swap-service.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/round-swap-service.ts)
- Logic to pull a round from the `ReservePool` and replace a specific round in the global sequence.
- Broadcast the change to all connected teams (via the existing state sync).

#### [MODIFY] [AdminPanel.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/AdminPanel.tsx)
- Add "Manage Reserve Pool" section.
- Add "Swap Round" button next to each round in the timeline.

---

## Verification Plan

### Automated Tests
- Script to simulate round completion with different times and verify point calculation.
- Mock database tests for round swapping to ensure state consistency.

### Manual Verification
1. **Scoring**: Complete a round in < 10 mins and verify +700 (200+500) total points in leaderboard.
2. **Scaling**: Intentionally fail or take long in a round, then check if the next round minigame is easier.
3. **Swap**: Swap Round 3 with a reserve round and verify the Solver sees the new puzzle immediately without refresh.
