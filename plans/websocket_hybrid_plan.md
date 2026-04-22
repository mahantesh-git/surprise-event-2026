# Implementation Plan - Hybrid WebSocket Architecture

Transition high-frequency data streams (GPS tracking, Leaderboard sync, and Live alerts) to WebSockets while maintaining REST for core transactional logic (Auth, Code Execution).

## Deployment Context: Render
Render supports persistent Node.js processes, which is ideal for Socket.io. This architecture will work natively on Render without external providers.

## Proposed Changes

### [Backend] [Socket.io Integration]

#### [MODIFY] [index.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/index.ts)
- Initialize `socket.io` server attached to the existing HTTP server.
- Implement a `Map<string, string>` to track `teamId` -> `socketId` for targeted broadcasts.
- Setup authentication middleware for the socket connection (verify JWT).

#### [NEW] [socket.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/backend/src/socket.ts)
- Create a dedicated module for socket event handlers (`gps:update`, `game:notify`, `leaderboard:sync`).
- Logic for room management (e.g., joining a `team_ROOM` for private alerts).

---

### [Frontend] [Real-time Context]

#### [NEW] [SocketContext.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/contexts/SocketContext.tsx)
- Create a Provider that initializes the `socket.io-client`.
- Manage reconnection logic and connection status (tactical "ONLINE" indicator).

#### [MODIFY] [useRunnerGps.ts](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/hooks/useRunnerGps.ts)
- Replace (or augment) the current GPS update logic to emit `location:stream` events.

#### [MODIFY] [Leaderboard.tsx](file:///d:/clg-event-builder/quest_-the-code-scavenger/frontend/src/components/Leaderboard.tsx)
- Listen for `leaderboard:update` events to refresh standings instantly without polling.

---

### [Security] [Hardening]

- **JWT Validation**: Sockets will only connect if a valid `Authorization` token is provided.
- **Rate Limiting**: Implement a per-socket message limit to prevent GPS flood attacks.
- **Idempotency**: Ensure that out-of-order GPS packets (due to network jitter) don't overwrite newer positions.

## Verification Plan

### Automated Tests
- Script a "Virtual Runner" to push 100 coordinates via socket and verify they appear on the Admin HUD instantly.
- Test connection drop/resume behavior (HMR and network toggle).

### Manual Verification
- Open Admin HUD and Runner app side-by-side; verify GPS marker movement is fluid (no 5s jump).
- Simulate a "Game Pause" from Admin and verify all clients receive the notification within <200ms.
