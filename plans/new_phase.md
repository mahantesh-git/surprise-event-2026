# QUEST: The Code Scavenger
## Implementation Plan — Enigma 4.0 | 9th May 2026

---

## Event Overview

| Detail | Info |
|---|---|
| Event | Enigma 4.0 — JT College, Gadag |
| Date | 9th May 2026 |
| Campus | 32.5 acres, 12 physical locations |
| Teams | 3 teams, 2 members each |
| Arenas | Arena 1 (HTML/CSS/JS) + Arena 2 (Scavenger Hunt) |

---

## Arena Structure

```
ENIGMA 4.0
    │
    ├── ARENA 1 — HTML/CSS/JS Challenge (1 hour)
    │       4 questions × 15 min each
    │       Separate accounts / credentials
    │
    ├── 
    │   Arena 2 credentials announced via Discord
    │
    └── ARENA 2 — The Scavenger Hunt
            10 rounds, full Solver + Runner flow
            Separate accounts / credentials
```

---

## Arena 1 — Implementation

### Overview
- Solver codes on laptop, Runner views live preview on phone
- Both sit together, face-to-face communication
- No walkie-talkie in Arena 1
- Separate account system from Arena 2

### Question Structure
- 4 questions total
- 15 minutes per question (hard timer)
- Auto-skip at 0:00 — no points awarded
- Question types: HTML → CSS → JS → Combined HTML/CSS/JS

### Scoring
- Complete within 15 min = **300 pts**
- Skipped / timed out / swapped = **0 pts**
- Maximum Arena 1 score = **1,200 pts**

### Swap System
- 4 swaps per team for Arena 1
- Swap pulls fresh question from reserve pool
- Timer resets to 15 min for swapped question
- Swapped question = 0 pts

### Live Preview — Technical
- Solver types code in editor
- Code sent via Socket.IO to Runner's phone in real time
- Runner's phone renders live preview in sandboxed iframe
- Debounce emit at 500ms to avoid flood

```
Solver editor → Socket.IO emit → Runner iframe (srcDoc)
```

```tsx
// Runner screen
<iframe
  srcDoc={liveCode}
  sandbox="allow-scripts"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

### Validation — Spec Checker (Option B)
Auto-validates without human review. Rules defined per question:

```typescript
const rules = [
  { check: 'elementExists', selector: '.btn' },
  { check: 'cssProperty', selector: '.btn:hover', property: 'background-color', value: 'red' },
  { check: 'hasAttribute', selector: 'input', attribute: 'placeholder' },
];
// All rules pass → 300 pts awarded → next question unlocks
```

### Build Checklist — Arena 1
- [ ] Separate auth system for Arena 1 (independent from Arena 2)
- [ ] Admin panel: Arena 1 question pool (4 + reserve questions)
- [ ] Per-question 15 min countdown timer
- [ ] Auto-skip logic on timer expiry
- [ ] Socket.IO: real-time code broadcast from Solver to Runner
- [ ] Runner iframe live preview renderer
- [ ] Spec checker validation engine per question
- [ ] Swap system: reserve pool + 4 swaps per team
- [ ] Swap resets timer to 15 min
- [ ] Points calculation: 300 on pass, 0 on skip/swap
- [ ] Arena 1 leaderboard (live, points-based)
- [ ] End of Arena 1: auto-generate full report
- [ ] Report: post to Discord (formatted embed)
- [ ] Report: download as Excel (.xlsx)
- [ ] Report: download option in admin panel

### Arena 1 End Report
Posted to Discord + downloadable from admin panel.

**Discord format:**
```
📊 ARENA 1 — FINAL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━
🥇 Team Alpha  — 1,200 pts (4/4 complete)
🥈 Team Beta   — 900 pts  (3/4 complete)
🥉 Team Gamma  — 300 pts  (1/4 complete)
━━━━━━━━━━━━━━━━━━━━━━━━━
Swaps: Alpha 1 | Beta 2 | Gamma 4
Generated: 9 May 2026, 13:00
```

**Excel columns:**

| Team | Q1 | Q2 | Q3 | Q4 | Swaps Used | Total Points | Rank |
|---|---|---|---|---|---|---|---|
| Alpha | 300 | 300 | 300 | 300 | 1 | 1200 | 1 |
| Beta | 300 | 300 | 300 | 0 | 2 | 900 | 2 |
| Gamma | 300 | 0 | 0 | 0 | 4 | 300 | 3 |

---

## Arena 2 — Implementation

### Overview
- Full scavenger hunt flow
- Solver indoors with laptop + map
- Runner in field with phone
- Push-to-talk walkie-talkie active
- Separate accounts from Arena 1

### Round Flow
same as now 
```

### Roles

| Phase | Solver | Runner |
|---|---|---|
| Puzzle phase | Solving code | Idle standby |
| Navigation phase | Guiding via map + walkie-talkie | Walking, following voice |
| Verification phase | Watching dot hit fence on map | Scanning QR + passkey |
| Mini-game phase | Watching, supporting | Completing challenge |
| Round clear | Auto-gets next puzzle | Returns to idle |

### Scoring Formula
```
Round points = Base + Difficulty bonus + Time tier + Jackpot (Hard Mode only)
```

| Component | Value |
|---|---|
| Base (GPS verified) | +200 pts |
| Base (mini-game complete) | +200 pts |
| Difficulty bonus (Hard Mode) | +283 pts |
| Time tier: under 10 min | +500 pts |
| Time tier: under 15 min | +250 pts |
| Time tier: under 25 min | +100 pts |
| Time tier: over 25 min | +0 pts |
| Hard Mode jackpot (start) | +1,000 pts |
| Jackpot decay | -50 pts / 30 sec |
| Jackpot floor | 0 pts at 10 min |

**Score ranges:**

| Scenario | Total |
|---|---|
| Hard Mode, sub-10 min, full jackpot | ~1,983 pts |
| Hard Mode, over 25 min, no jackpot | 683 pts |
| Normal, sub-10 min | 900 pts |
| Normal, over 25 min | 400 pts |
| Event maximum (10 rounds) | ~19,830 pts |
| Event minimum (10 rounds) | 4,000 pts |

### Adaptive Difficulty
- Hard Mode triggers when round cleared in under 5 min
- Admin can manually override per team
- Hard Mode mini-game parameters scale up

| Mini-game | Normal | Hard |
|---|---|---|
| Target Lock | 10 taps, 15s, standard hitbox | 15 taps, 10s, reduced hitbox |
| Neural Decode | 3×4 grid, 6 pairs, 800ms flip | 4×4 grid, 8 pairs, 500ms flip |
| Cipher Crack | 4 block sequence | 6 block sequence, faster flash |

### Mini-game Schedule
```
R1  R2  R3  R4  R5  R6  R7  R8  R9  R10
🎯  🃏  🔴  🎯  🃏  🔴  🎯  🃏  🔴  🎯
```
- 🎯 Target Lock: Rounds 1, 4, 7, 10
- 🃏 Neural Decode: Rounds 2, 5, 8
- 🔴 Cipher Crack: Rounds 3, 6, 9

### GPS Presence Verification
- Runner GPS runs silently via `navigator.geolocation.watchPosition`
- Server receives coordinates every few seconds
- Server checks distance to target server-side
- Distance ≤ 15m → haptic + push notification to Runner + map confirmation to Solver

```typescript
const distance = haversine(runnerCoords, targetCoords); // metres
if (distance <= 15) {
  io.to(runnerSocket).emit('fence:reached');
  io.to(solverSocket).emit('runner:arrived');
  triggerHaptic(); // on Runner device
}
```

### Walkie-Talkie — WebRTC + OpenRelay
- Push-to-talk half-duplex audio
- OpenRelay TURN/STUN for NAT traversal
- Activates only after Solver authorizes field ingress
- Hold button → mic live → release → mic mutes

```typescript
const iceConfig = {
  iceServers: [
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ]
}
```

### Round Swap System
- Reserve pool: 5-8 spare puzzles pre-loaded before event
- Each spare tagged with difficulty tier
- Spare QR locations pre-planted by volunteers

**Team state logic on swap trigger:**

| Team state | Action |
|---|---|
| Already completed the round | Next upcoming round replaced |
| Scanned QR + entered passkey | No change — finish normally |
| Not yet scanned | Rerouted to substitute location |

### Swap-Burn (Team-triggered)
- Teams can self-trigger a round swap without admin
- Accessible via ⚡ tactical options panel
- Limited uses per event (to be confirmed)
- Pulls from same reserve pool as admin swap

### Tactical Options Panel (⚡)
- **Support** — request admin help → Discord alert
- **Swap-Burn** — team-triggered round change

### Account Lock (One Session Per Account)
- One active session per team role at a time
- Second login attempt → blocked with "Account already active on another device"
- Session tied to device fingerprint via FingerprintJS
- On event end → all sessions cleared automatically

### Build Checklist — Arena 2
- [ ] Separate auth system for Arena 2
- [ ] Account lock: one session per account (Option B — first device wins)
- [ ] Device fingerprinting via FingerprintJS
- [ ] Solver screen: code editor + map + walkie-talkie + comms
- [ ] Runner screen: standby → navigation → QR scan → passkey → mini-game
- [ ] Runner idle screen: "OPERATIVE STANDBY" with animated pulse
- [ ] Silent GPS background tracking on Runner phone
- [ ] Server-side 15m geofence check via haversine formula
- [ ] Haptic + push notification on fence breach
- [ ] Map confirmation to Solver on Runner arrival
- [ ] Walkie-talkie: WebRTC peer connection via Socket.IO signalling
- [ ] Push-to-talk button: hold = live mic, release = mute
- [ ] PTT UI: pulsing ring animation + TRANSMITTING status
- [ ] Passkey auto-delivery to Runner on Solver authorize
- [ ] QR scan verification (ZXing)
- [ ] Three mini-games with Normal + Hard Mode variants
- [ ] Adaptive difficulty: sub-5 min trigger + admin override
- [ ] Hard Mode decaying jackpot: 1000 pts, -50/30s, floor 0
- [ ] Points system: base + difficulty + time tier + jackpot
- [ ] Live leaderboard: points-based, real-time Socket.IO updates
- [ ] Round swap system: reserve pool + team state logic
- [ ] Swap-Burn: team-triggered via tactical options panel
- [ ] Support request: Discord alert via admin bridge
- [ ] Discord admin bridge: /broadcast /team /runner /solver
- [ ] Admin panel: difficulty override per team
- [ ] Admin panel: round swap trigger
- [ ] Admin panel: handicap / time adjustment per team
- [ ] Spectator live map: all Runner positions visible
- [ ] Spectator live feed: round completion callouts
- [ ] End-game victory sequence: confetti + leaderboard freeze
- [ ] Post-event result card: shareable per team

---

## Full Event Points Summary

| Arena | Max Points |
|---|---|
| Arena 1 (4 questions × 300) | 1,200 pts |
| Arena 2 (10 rounds, all Hard, full jackpot) | ~19,830 pts |
| **Event Total Maximum** | **~21,030 pts** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Animations | Framer Motion |
| Styling | Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas |
| Real-time | Socket.IO |
| Maps | Leaflet.js + OSRM routing |
| Walkie-talkie | WebRTC + OpenRelay TURN/STUN |
| Code execution | Piston API (DSA) + iframe (HTML/CSS/JS) |
| Discord | Discord.js v14 |
| Device fingerprint | FingerprintJS |
| Backend host | Railway (Docker) |
| Frontend host | Render (Static) |

---

## Pre-Event Checklist

### Locations (12 total)
- [ ] All 12 QR codes printed and laminated
- [ ] Volunteers briefed on each location
- [ ] Spare QR codes carried by each volunteer
- [ ] GPS coordinates confirmed and tested for all 12 locations
- [ ] 15m geofence tested at each location

### Tech
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and accessible
- [ ] WebRTC walkie-talkie tested on college WiFi
- [ ] Socket.IO real-time sync tested with 3 simultaneous teams
- [ ] OpenRelay TURN fallback (TCP 443) confirmed working
- [ ] All 3 Runner phones tested for GPS accuracy
- [ ] Arena 1 and Arena 2 credentials prepared
- [ ] Reserve question pool loaded (Arena 1)
- [ ] Reserve puzzle pool loaded (Arena 2)
- [ ] Discord bot connected and slash commands tested
- [ ] Admin panel tested: swap, handicap, broadcast

### Day of Event
- [ ] Arena 1 credentials distributed to teams
- [ ] Arena 1 launched from admin panel
- [ ] Arena 1 report generated + posted to Discord after 1 hour
- [ ] Lunch break — Arena 2 credentials announced via Discord
- [ ] Arena 2 launched from admin panel
- [ ] Volunteers deployed to all 12 locations
- [ ] Spectator screen live on projector
- [ ] Winners announced via Discord broadcast

---

*QUEST: The Code Scavenger — Enigma 4.0 | JT College Gadag | 9th May 2026*
