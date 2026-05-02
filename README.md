# 🕵️ QUEST: The Code Scavenger
### *A High-Stakes, Tactical Multi-Operative Scavenger Hunt*

> Quest is a real-time scavenger hunt platform built for live college events. Teams compete across 10 rounds — one teammate solves coding challenges from a control room, the other physically navigates to field locations.

---

## 🌐 Live Production

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend** | https://quest-frontend.onrender.com | Render (Static) |
| **Backend API** | https://quest-backend-production-7b82.up.railway.app | Railway (Docker) |
| **Health Check** | https://quest-backend-production-7b82.up.railway.app/api/health | — |

---

## 🎮 Game Modes

### 💻 ARENA 1: Spec-Checker 
A high-intensity, synchronized frontend coding challenge to weed out the weak.
- **The Objective**: Teams must precisely recreate target web layouts using HTML, CSS, and JS across **4 consecutive rounds (slots)**.
- **The Solver**: Writes code in a built-in tactical Tri-Panel Editor (HTML/CSS/JS).
- **The Runner**: Has no editor. Instead, their device displays a real-time, live-updating visual preview of what the Solver is coding. They act as the "Quality Assurance," directing the Solver on visual accuracy and layout.
- **Mechanics**:
  - **15-Minute Timer**: Each slot has a strict 15-minute server-authoritative time limit.
  - **Admin Verification**: Solvers submit their code. Admins review the live preview and source code to manually approve or reject the submission.
  - **Tactical Options**: Teams can use a "Burn Swap" (0 points, swaps the question) or "Skip" entirely if stuck.
  - **Scoring**: 300 points awarded for every approved slot.

### 🏃 ARENA 2: The Scavenger Hunt
Two teammates. One goal. Ten rounds. Each round follows a strict, synchronized operational sequence:

1. **Solver Decrypts**: The Solver receives a coding challenge (logic, debugging, algorithm) in their browser terminal. Solving it generates a **secret passkey** (e.g., `QUEST-R3-7842`).
2. **Runner Navigation**: Once the Solver provides the passkey and authorizes ingress, the Runner's **Sector Map** unlocks, displaying the target coordinates and a live walking route.
3. **Location Verification**: The Runner physically approaches the target. The hardware-locked QR scanner activates only when GPS confirms they are within a **25-meter radius**. The Runner scans the unique physical QR code to prove their presence.
4. **Mini-Challenge**: The Runner enters the passkey to unlock the final clearance step—a fast-paced mini-game. 
5. **Round Cleared**: Completing the game syncs the progress to the backend, updates the global leaderboard, and unlocks the next round for the Solver.

#### 🏃 Implemented Runner Mini-Games
The Runner faces three distinct mini-games distributed across the 10 rounds:
- 🎯 **Target Lock (Tap Game)**: A test of reflexes where the Runner must tap a fast-moving, evasive crosshair target 10 times within 15 seconds. [Triggered: Rounds 1, 4, 7, 10]
- 🃏 **Neural Decode (Memory Match)**: A cognitive recall challenge requiring the Runner to match 6 pairs of cyber-themed symbols in a 12-card grid. [Triggered: Rounds 2, 5, 8]
- 🔴 **Cipher Crack (Sequence Pattern)**: A "Simon Says" style memory sequence challenge where the Runner must replicate a randomly generated pattern of flashing color blocks. [Triggered: Rounds 3, 6, 9]

*Note: All mini-games feature a **Hard Mode** that scales difficulty (more taps, larger grids, longer sequences) based on the team's completion speed.*

→ See [`GAME_FLOW.md`](./GAME_FLOW.md) for the full Arena 2 player experience and [`runner_games_details.md`](./runner_games_details.md) for in-depth mini-game mechanics.

---

## 🚀 Core Features

### ⚡ Advanced Game Mechanics

#### Dynamic Scoring Engine
- **Base Reward**: 200 points for every successful checkpoint (QR scan) and puzzle completion.
- **Difficulty Bonus**: +283 bonus points automatically awarded for clearing missions in **Hard Mode**.
- **Speed Tiers**: Extra rewards for rapid deployment:
  - `< 10 min`: +500 points
  - `< 15 min`: +250 points
  - `< 25 min`: +100 points

#### Adaptive Difficulty Scaling
- **Intelligence-Based Scaling**: The system monitors operative performance. Completing a mission in under **3 minutes** automatically triggers **Hard Mode** for the next round.
- **Decaying Jackpot**: Hard Mode features a special 1,000-point jackpot that decays by 50 points every 30 seconds, incentivizing extreme speed.

#### Tactical Round Swap (Reserve Pool)
- **Obstruction Bypass**: Admins can trigger a "Tactical Swap," instantly pulling a fresh mission from a secondary **Reserve Pool**. This allows teams to bypass physical obstructions or buggy puzzles without losing progress.

#### 📍 Spectator Live-Link & Comms
- **Live-Map Tracking**: Solvers have real-time visibility of the Runner's GPS location, path history, and bearing on the Sector Map.
- **🎙️ Integrated Walkie-Talkie**: Built-in Push-To-Talk (PTT) voice link between teammates, eliminating the need for external calls.
- **Tactical Support Channel**: Integrated "Request Help" mechanism with two-way alerts and smart notification persistence.

#### 🛡️ Anti-Spoof Security & Logistics
- **Strict Geofence Enforcement**: Runner QR scanners are physically locked. The scanner only activates when the operative's live GPS falls within a **25-meter radius** of the target location, backed by server-side distance validation.
- **Automated Asset Dispatch**: Unique Location QR codes are dynamically generated and instantly dispatched to a secure Discord channel for on-site printing when admins configure new waypoints.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, TypeScript, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas |
| Real-time | Socket.IO + WebRTC |
| Audio Relay | OpenRelay (TURN Server) |
| Maps | Leaflet.js + OSRM routing |
| Discord | Discord.js v14 |
| Code Execution | Piston API (self-hosted via Docker) |
| Backend Host | Railway (Docker deployment) |
| Frontend Host | Render (Static site) |

---

## ⚙️ Local Development

### Prerequisites
- Node.js 20+
- Docker (for Piston code execution engine)
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
cp .env.example .env     # fill in your values
npm install
npm run dev              # runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env     # set VITE_API_HOST=http://localhost:4000
npm install
npm run dev              # runs on http://localhost:3000
```

### Environment Variables

**Backend** (`.env`):
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/quest
MONGODB_DB_NAME=quest
JWT_SECRET=your_64char_hex_secret
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=your_password
FRONTEND_ORIGIN=http://localhost:3000
PISTON_API_URL=http://localhost:2000/api/v2/execute
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
ADMIN_CHANNEL_ID=your_channel_id
ADMIN_CHANNEL_ID_QR=your_qr_assets_channel_id
ADMIN_DISCORD_USER_ID=your_discord_id
```

**Frontend** (`.env`):
```env
VITE_API_HOST=http://localhost:4000
VITE_DEV_MODE=true    # shows answer autofill in dev only — NEVER in production
```

---

## 📦 Deployment

Full production deployment guide → [`DEPLOYMENT.md`](./DEPLOYMENT.md)

**Quick summary:**
- Backend deploys to Railway via Docker on every `git push main`
- Frontend deploys to Render as a static site on every `git push main`
- All secrets are stored in Railway / Render environment variable panels — never in code

---

## 📁 Project Structure

```
quest_-the-code-scavenger/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express app + Socket.IO setup
│   │   ├── discord-bridge.ts  # Discord bot tactical bridge
│   │   ├── routes/            # API route handlers
│   │   └── models/            # MongoDB schemas
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app + role routing
│   │   ├── components/        # UI components (HUD, map, editor)
│   │   └── hooks/             # Game state, socket, geolocation
│   └── vite.config.ts
├── event_qr_codes/            # Generated QR code images per round
├── GAME_FLOW.md               # Player-facing game flow guide
├── DEPLOYMENT.md              # Production deployment steps
├── render.yaml                # Render frontend config
└── docker-compose.yml         # Local dev compose setup
```

---

## 🛡️ Security

- JWT-based session auth with role separation (solver / runner / admin)
- Admin Discord commands restricted to specific channel + user ID
- **Hardware/Location Lock**: Runners cannot scan QR codes unless physically verified via GPS within a 25-meter radius of the target coordinates.
- Unique QR payloads per location to prevent unauthorized remote scans.
- `VITE_DEV_MODE=false` enforced in production (disables answer autofill)
- All secrets in environment variables — never committed to git

---

## 📄 Docs

| Document | Description |
|----------|-------------|
| [`GAME_FLOW.md`](./GAME_FLOW.md) | How to play — player-facing, no tech details |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Full production deployment guide |
| [`runner_games_details.md`](./runner_games_details.md) | Mini-game mechanics reference |

---

*Built for the 2026 College Tech Fest — Tactical Gaming Group*
