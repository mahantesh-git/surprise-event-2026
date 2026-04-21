# 🕵️ QUEST: The Code Scavenger
### *A High-Stakes, Tactical Multi-Operative Scavenger Hunt*

Quest is a premium, high-fidelity scavenger hunt platform designed for elite tactical gaming events. It features a dual-role gameplay system (Runner & Solver), real-time GPS telemetry, and a state-of-the-art **Discord Tactical Bridge** for live administrative oversight.

---

## 🚀 Core Features

### 🎮 Dual-Role Gameplay
- **Tactical Analyst (Solver)**: Locked in the "Control Room," Solvers receive complex coding challenges and puzzles. Solving them unlocks the next geographical objective for their field operative.
- **Field Operative (Runner)**: Deployed on the ground, Runners use live GPS telemetry and Sector Maps to navigate to physical checkpoints, scanning unique QR codes to verify objectives.

### 📡 Discord Tactical Bridge
A seamless bridge between the game world and Discord, allowing admins to manage the event via mobile or desktop.
- **Slash Command Interface**: Use `/broadcast`, `/team`, `/runner`, and `/solver` to send instructions directly into players' visors.
- **Smart Relay Response**: Admins can respond to player "Help Requests" simply by replying to the Discord alert. The system automatically routes the response to the correct operative.
- **Identity Lockdown**: Administrative commands are restricted to specific Discord channels and authorized roles/IDs.

### 💎 Premium Interface
- **Dynamic HUD**: A minimalist, high-contrast UI with glassmorphism, animated scanlines, and tactical grid backgrounds.
- **Haptic Feedback**: Real-time vibration alerts for field operatives when receiving command overrides or reaching objectives.
- **Interactive Sector Maps**: Live-updating maps showing the operative's position relative to the target node.

---

## 🛠️ Technical Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion (Lucide Icons).
- **Backend**: Node.js (Express), TypeScript, MongoDB.
- **Integration**: Discord.js (V14) for the Tactical Bridge.
- **Telemetry**: Browser Geolocation API & Leaflet.js for mapping.

---

## ⚙️ Configuration (.env)

### Backend
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/quest
JWT_SECRET=your_secret_key

# Discord Tactical Bridge
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
ADMIN_CHANNEL_ID=your_discord_channel_id
ADMIN_DISCORD_USER_ID=your_discord_id (optional)
```

### Frontend
```env
VITE_API_URL=http://localhost:4000/api
VITE_SOLVER_EXIT_KEY=your_exit_phrase
```

---

## 🏃 Running the Operation

### 1. Database Setup
Ensure MongoDB is running locally or via a cloud instance.

### 2. Backend Initialization
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend Deployment
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Operational Security
- **Fail-Safe Bridge**: The backend is designed to initialize even if Discord services are unavailable, ensuring the game never stops.
- **Multi-Layer Auth**: JWT-based session management with role-specific authorization.
- **Sanitized Inputs**: All tactical commands are scrubbed for injection attacks and validated against the team database.

---
*Designed by the Tactical Gaming Group - 2026*
