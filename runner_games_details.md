# Runner Minigames Details

In the Quest: The Code Scavenger platform, the "Runner" team members are required to physical travel to designated locations and complete quick, engaging minigames to clear rounds. This document explains the available minigames played on the Runner's side.

## 1. Target Lock (Tap Game)
**Description:** A fast-paced reflex and speed challenge.
**Objective:** The runner is presented with a dynamically moving crosshair target on their screen that they must tap before the timer runs out.
**Mechanics:**
- **Goal:** Neutralize the target by tapping it exactly **10 times**.
- **Time Limit:** 15 seconds.
- **Difficulty:** After every successful tap, the target instantly jumps to a new random location on the screen within the game boundary.
- **[HARD MODE]:** The hit requirement scales to **15 taps**, and the target size is reduced by 25%, requiring pinpoint accuracy.
- **Consequence:** If the timer reaches 0 before achieving the hit goal, the runner receives a "Time's Up!" prompt and must restart the challenge from zero hits. 
- **Feedback:** Uses visual progress bars and device haptics on every successful hit.

## 2. Neural Decode (Memory Match Game)
**Description:** A classic card-based memory test for cognitive recall.
**Objective:** Match all pairs of symbols within the grid.
**Mechanics:**
- **Grid Layout:** Consists of 12 unrevealed cards in a 3x4 grid.
- **Symbols:** Contains 6 pairs of tech and cyber-themed emojis (🚀, 💻, ⚡, 🧠, 🔒, 🔑) shuffled randomly.
- **[HARD MODE]:** The grid expands to **16 cards** (4x4), adding 2 more symbol pairs (🛸, 🧬) to increase recall difficulty.
- **Gameplay:** 
  - The runner taps cards to flip them. Only up to 2 cards can be flipped at a time.
  - If the symbols match, they stay locked and highlighted in neon green.
  - If the symbols do not match, the game applies a slight haptic buzz and the cards flip back over after an 800ms delay.
- **Completion:** The game is completed once all pairs have been correctly matched. 

## 3. Cipher Crack (Pattern Sequence Game)
**Description:** A "Simon Says" style memory sequence challenge.
**Objective:** Observe and precisely replicate a sequence of flashing color blocks.
**Mechanics:**
- **Grid Setup:** A 2x2 grid featuring 4 distinctly colored blocks (Rose, Blue, Yellow, Neon Green).
- **Sequence Generation:** Upon starting, the game randomly generates and flashes a sequence of 4 blocks one by one with a short visual and haptic delay.
- **[HARD MODE]:** The sequence length increases to **6 blocks**, and the flash speed is accelerated by 30%.
- **Gameplay:** After the sequence is fully shown, the runner must tap the blocks in the exact same order.
- **Consequence:** If the runner taps a wrong block, the screen flashes red ("Wrong sequence! Restarting..."), buzzes prominently, and after a short 1-second delay, a completely new sequence is generated for the runner to attempt.
- **Completion:** Replicating the exact sequence clears the challenge.

## Runner Workflow & Game Progression
Each minigame serves as the final clearance step of a round, following a strict operational sequence:

### Phase A: Deployment & Navigation (Sector Map)
Before the mission begins, the Runner's device is in **Lockdown Mode**.
- **Authorization Gating:** The Sector Map and mission data remain encrypted until the **Solver** decrypts the round's puzzle and authorizes field ingress.
- **Live GPS Tracking:** Once authorized, the Runner uses the high-precision Sector Map to track their real-time location (Cyan dot) relative to the Target (Neon Green marker).
- **Walking Routes:** The system renders the most efficient walking path using OSRM data, displayed as a dashed neon line.
- **Background Telemetry:** Administrators track runner progress in real-time via background location pings while the map is active.

### Phase B: Location Verification (QR scanning)
Upon arrival, the Runner must prove their physical presence.
- **Scanning:** The Runner must find and scan a physical QR code labeled "QUEST-AUTHORIZED-LOCATION" at the site.
- **Validation:** The scanner validates the QR data. If it doesn't match the authorized string, access remains "Restricted."

### Phase C: Biometric/Passkey Handoff
Once the location is verified, the system requires secret data from the **Solver**.
- **The Secret:** The Solver teammate receives a numeric passkey (e.g., `QUEST-R1`) after finishing their code-based puzzle.
- **Handoff:** The Runner must enter this passkey into their terminal. This creates a mandatory communication link between both teammates.

### Phase D: The Challenge (Minigames)
After successful authentication, the system triggers one of the three specialized minigames. The game selection follows a **Round-Robin logic**, ensuring variety across the 10-round quest:
1. **Target Lock** (Tap) - Triggered on Rounds 1, 4, 7, 10
2. **Neural Decode** (Memory) - Triggered on Rounds 2, 5, 8
3. **Cipher Crack** (Pattern) - Triggered on Rounds 3, 6, 9

## Victory & Round Completion
Upon successfully completing the assigned minigame:
- **Visual Reward:** A Trophy screen appears, confirming round clearance.
- **Backend Sync:** The system performs an encrypted sync to update the global Leaderboard.
- **Progression:** The Solver's terminal automatically unlocks the next puzzle sequence, and the Runner's map updates with the next destination.
