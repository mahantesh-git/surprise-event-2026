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

## 🎮 How It Works

Two teammates. One goal. Ten rounds.

- **Solver** — Stays at base, solves coding puzzles in a browser terminal. Each solved puzzle generates a passkey.
- **Runner** — Goes to the field, navigates via GPS map, scans QR codes at physical locations, enters the passkey, and completes a mini-challenge to clear the round.

→ See [`GAME_FLOW.md`](./GAME_FLOW.md) for the full player experience (no tech details).

---

## 🚀 Core Features

### Dual-Role Gameplay
- **Solver** receives coding challenges in a browser IDE with live code execution
- **Runner** gets a GPS sector map, QR scanner, and mini-game challenges
- Both roles must cooperate — the passkey links them every round

### Discord Tactical Bridge
- Admins manage the event entirely via Discord slash commands
- `/broadcast`, `/team`, `/runner`, `/solver` send messages directly to players' screens
- Players can request help — admin replies in Discord, player sees it instantly on screen
- Bot stays online persistently via Railway (no Render sleep/timeout issues)

### Real-Time Leaderboard
- Live score updates via Socket.IO
- Tracks round completion time and ranking per team
- Visible at `/leaderboard` for spectators

### Premium Interface
- Dark tactical HUD with glassmorphism and animated scanlines
- Haptic feedback for field runners on mobile
- Interactive GPS sector map with walking route overlay

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, TypeScript, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas |
| Real-time | Socket.IO |
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
