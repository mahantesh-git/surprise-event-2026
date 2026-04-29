# 🕵️ QUEST: The Code Scavenger
## Player Game Flow Guide

> **10 rounds. 2 roles. 1 team.** This guide explains exactly what happens during the event — no technical details, just the game.

---

## 🎭 The Two Roles

Before the game begins, every team of 2 picks their roles:

| Role | Codename | Where they are | What they do |
|------|----------|----------------|--------------|
| 🧠 | **Solver** | Indoors / Base | Solves coding puzzles on a laptop |
| 🏃 | **Runner** | Out in the field | Navigates to locations, scans QR codes |

> **Both must cooperate every round.** The Solver gives the Runner a secret passkey. Without it, the Runner can't proceed.

---

## 🔐 Before the Game Starts

1. **Team Registration** — Both teammates register on the platform using a shared team name
2. **Role Assignment** — One person logs in as Solver, the other as Runner
3. **Admin Briefing** — The game admin starts the event from the control panel
4. **Round 1 Unlocks** — Solver sees the first coding challenge. The race begins.

---

## 🔄 Every Round — Step by Step

Each of the 10 rounds follows the same sequence:

```
SOLVER solves puzzle  →  gets passkey  →  tells Runner
        ↓
RUNNER navigates to location  →  scans QR  →  enters passkey  →  completes mini-challenge
        ↓
ROUND CLEARED  →  Leaderboard updates  →  Next round unlocks
```

---

## 🧠 Solver's Journey (Indoors)

### Step 1 — Receive the Challenge
The Solver sees a coding problem appear on their screen. It could be:
- A logic puzzle
- A code debugging task
- An algorithm challenge
- A pattern-based problem

### Step 2 — Write & Run Code
The Solver types their solution in the built-in code editor and runs it. They can test as many times as needed.

### Step 3 — Submit & Get the Passkey
Once the solution is correct, the system generates a **secret passkey** (e.g., `QUEST-R3-7842`).

### Step 4 — Hand Off to Runner
The Solver must communicate this passkey to their Runner — **verbally, by call, or by text**. The platform does not do this for them. This is an intentional communication challenge.

> ⏱️ The Solver's clock starts the moment the challenge appears. Faster solving = better leaderboard position.

---

## 🏃 Runner's Journey (Out in the Field)

### Step 1 — Await Ingress Authorization
When the round begins, the Runner's interface is in **Lockdown Mode**. They will see an "Awaiting Operative" status. The sector map and mission coordinates are hidden to prevent pre-deployment.

### Step 2 — Sync Tactical Data
Once the Solver decrypts the puzzle and provides the passkey, they trigger the **"Authorize Field Ingress"** command. Instantly, the Runner's phone will vibrate and unlock the **Sector Map**.

### Step 3 — Navigate to the Location
The Runner can now see:
- 🔵 Their current live position
- 🟢 The target location for this round
- 🗺️ The walking route to reach it
They can walk/run to the spot or tap **"Open Sector Map"** to see the full tactical overlay.

### Step 4 — Scan the QR Code
At the location, the Runner scans the physical **QR code**. The system verifies their physical presence via GPS and the scan data.

### Step 5 — Enter the Passkey & Complete Challenge
The Runner enters the secret passkey from the Solver. This unlocks the **Mini-Challenge** (Target Lock, Neural Decode, or Cipher Crack).

---

## 🎮 The Three Mini-Challenges

### 🎯 Target Lock *(Tap Game)*
> *"Neutralize the target before time runs out."*

A moving crosshair appears on screen. The Runner must **tap it 10 times** within **15 seconds**. Every successful tap sends it jumping to a new position. Miss the timer — start over.

**Triggered on:** Rounds 1, 4, 7, 10

---

### 🃏 Neural Decode *(Memory Match)*
> *"Recall the pattern. Match the pairs."*

12 face-down cards appear in a grid. The Runner flips cards two at a time, trying to **match all 6 symbol pairs**. Mismatches flip back after a short delay. No time limit — pure memory.

**Triggered on:** Rounds 2, 5, 8

---

### 🔴 Cipher Crack *(Sequence Pattern)*
> *"Remember the sequence. Repeat it exactly."*

4 colored blocks flash in a specific order. The Runner must **tap them in the exact same sequence**. One wrong tap resets the sequence entirely with a new pattern.

**Triggered on:** Rounds 3, 6, 9

---

## 🏆 Round Cleared!

Once the mini-challenge is complete:

- ✅ A **Victory Screen** appears on the Runner's phone.
- 🔄 **Auto-Sync**: The Solver's screen instantly updates to the next challenge (no refresh needed).
- 📊 The **leaderboard updates** in real time for all spectators.
- ⏱️ Round time is **locked in** — speed is key for your ranking.

---

## 📡 Advanced Tactical Systems

### 📍 Spectator Live-Link (Map Sync)
The Solver isn't just sitting blind. The **Sector Map** on the Solver's HUD provides a live feed of the Runner's progress, including:
- **Live GPS Position**: See exactly where your partner is in real-time.
- **Path History**: View the route taken by the operative.
- **Bearing & Direction**: See which way they are facing to provide verbal navigation support.

### 🎙️ Integrated Walkie-Talkie (PTT)
Operatives no longer need external apps or calls to coordinate. The platform features a high-fidelity, built-in **Push-To-Talk (PTT)** system:
- **Push-To-Talk**: Press the mic icon (or `Spacebar` on laptop) to transmit audio.
- **Bi-Directional**: Real-time voice link between Runner and Solver.
- **Production Reliable**: Powered by **WebRTC** with global **TURN Server** support, ensuring the link works even if one person is on 5G/LTE and the other is on WiFi.
- **Privacy Guaranteed**: Voice traffic is isolated to your team only—other teams cannot hear you.

### 💬 Tactical Comms & Intel
The communication bridge is now smarter and less intrusive:
- **Direct Intel**: Receive system alerts, passkeys, and coordinator messages in a dedicated tactical feed.
- **Smart Notifications**: The system tracks which alerts you've already seen, preventing "notification spam" when you refresh the page.
- **Request Support**: Use the "Request Intel" feature to ping Command (Admins) for immediate clarification on a sector.

---

## 📊 Scoring & Ranking

The leaderboard is visible to everyone throughout the event. Rankings are determined by **Total Points**, followed by **Total Time**.

### 💎 How to Earn Points
- **Checkpoint Authorization**: +200 points for every successful QR scan.
- **Data Extraction**: +200 points base for completing the mini-challenge.
- **Difficulty Bonus**: **+283 points** automatically awarded if the round is cleared in **Hard Mode**.
- **Speed Rewards**: Extra points for rapid completion:
  - Under 10 minutes: **+500 points**
  - Under 15 minutes: **+250 points**
  - Under 25 minutes: **+100 points**

### 🔥 Adaptive Difficulty (Hard Mode)
The system monitors your efficiency. If a team clears a round in **under 3 minutes**, the next round automatically scales to **Hard Mode**.
- **Increased Complexity**: Mini-games become more difficult (e.g., faster targets, larger grids).
- **Decaying Jackpot**: Hard Mode rounds feature a **1,000-point jackpot** that decays by 50 points every 30 seconds. Move fast to claim the maximum reward!

> 🔴 Live updates happen the moment a round is cleared — no refreshing needed.

---

## 🏁 End of the Event

The event ends when:
- All 10 rounds are cleared by a team *(first to finish wins)*, **OR**
- The admin ends the event from the control panel

The admin announces the winners via Discord broadcast, which appears on every player's screen simultaneously.

---

## 📋 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│              QUEST — ROUND SEQUENCE              │
├─────────────────────────────────────────────────┤
│  SOLVER                   RUNNER                │
│  ───────                  ──────                │
│  1. Decrypt Puzzle        1. Await Authorization│
│  2. Generate Passkey      2. Receive Field Sync │
│  3. Share Passkey         3. Navigate to Sector │
│  4. Authorize Ingress     4. Scan QR + Passkey  │
│                           5. Complete Challenge │
├─────────────────────────────────────────────────┤
│  ROUND CLEARED → Auto-Sync → Next Round          │
└─────────────────────────────────────────────────┘

Mini-Games by Round:
  R1  R2  R3  R4  R5  R6  R7  R8  R9  R10
  🎯  🃏  🔴  🎯  🃏  🔴  🎯  🃏  🔴  🎯
```

---

