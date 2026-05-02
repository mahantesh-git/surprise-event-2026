# Arena 2 — AR Implementation Plan
## MindAR Image Marker Integration

---

## Overview

Replaces the QR scan step with image-based AR marker detection.  
No ARCore required. Works in browser. Production-safe for live event.

**Final flow:**
```
GPS fence (≤15m) → AR camera opens → Runner points at marker
→ TARGET LOCKED → checkpoint captured → passkey entry → mini-game
```

---

## Phase 1 — Prepare Markers

### Step 1 — Create marker images

- 10 unique images, one per round
- Save to `/public/markers/`

```
/public/markers/
├── r1.jpg
├── r2.jpg
├── r3.jpg
...
└── r10.jpg
```

**Marker rules:**
- High contrast, unique pattern per round
- No repeated visuals across rounds
- Print on A4, matte finish (no reflective surfaces)
- Place at eye level at each location
- Minimum size: A4 (210 × 297mm)

---

### Step 2 — Compile markers to .mind format

Use the MindAR compiler to convert each image:

```bash
npx mind-ar-compiler --input public/markers/r1.jpg --output public/targets/r1.mind
npx mind-ar-compiler --input public/markers/r2.jpg --output public/targets/r2.mind
# repeat for all 10
```

Output structure:
```
/public/targets/
├── r1.mind
├── r2.mind
...
└── r10.mind
```

> Only load the marker for the current round — never load all 10 at once.

---

## Phase 2 — Frontend Setup

### Step 3 — Install dependencies

```bash
npm install mind-ar three
```

---

### Step 4 — Create AR Runner Component

`src/components/RunnerAR.tsx`

```tsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Socket } from "socket.io-client";

interface RunnerARProps {
  round: number;
  token: string;
  socket: Socket;
  onCapture: () => void;
  onFail: () => void;
}

export default function RunnerAR({ round, token, socket, onCapture, onFail }: RunnerARProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mindarThree: any;

    const start = async () => {
      try {
        const { MindARThree } = await import("mind-ar/dist/mindar-image-three.prod.js");

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: `/targets/r${round}.mind`,
        });

        const { renderer, scene, camera } = mindarThree;
        const anchor = mindarThree.addAnchor(0);

        // Tactical target object
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ffcc,
          wireframe: true,
        });
        const cube = new THREE.Mesh(geometry, material);
        anchor.group.add(cube);

        // On marker detected
        anchor.onTargetFound = () => {
          navigator.vibrate?.(200);

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              socket.emit("checkpoint:capture", {
                round,
                token,
                gps: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                },
              });
            },
            () => onFail()
          );
        };

        anchor.onTargetLost = () => {
          // Optional: show "keep camera steady" prompt
        };

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
          cube.rotation.y += 0.02;
          renderer.render(scene, camera);
        });

      } catch (err) {
        console.error("AR failed:", err);
        onFail();
      }
    };

    start();

    return () => {
      mindarThree?.stop();
    };
  }, [round]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100dvh", position: "relative" }}
    />
  );
}
```

---

### Step 5 — AR Screen States

`src/components/RunnerARScreen.tsx`

```tsx
type ARState = "searching" | "scanning" | "locked" | "captured" | "failed";

const stateConfig = {
  searching: { label: "📡 SEARCHING FOR SIGNAL...", color: "#888" },
  scanning:  { label: "🧿 SCANNING MARKER...",      color: "#00ccff" },
  locked:    { label: "🎯 TARGET LOCKED",            color: "#00ffcc" },
  captured:  { label: "✅ CHECKPOINT CAPTURED",      color: "#00ff88" },
  failed:    { label: "⚠️ AR FAILED — USE MANUAL",   color: "#ff4444" },
};
```

Render state label as HUD overlay on top of the AR camera feed.

---

## Phase 3 — Integrate into Existing Flow

### Step 6 — Replace QR scan step with AR

**Old flow:**
```
GPS fence reached → QR scan → passkey → mini-game
```

**New flow:**
```
GPS fence reached → AR camera opens → marker detected
→ checkpoint captured → passkey → mini-game
```

In your Runner screen component:

```tsx
// After GPS fence triggers
if (distanceToTarget <= 15) {
  setPhase("ar"); // opens AR camera
}

// Render based on phase
{phase === "ar" && (
  <RunnerAR
    round={currentRound}
    token={sessionToken}
    socket={socket}
    onCapture={() => setPhase("passkey")}
    onFail={() => setPhase("manual")} // fallback
  />
)}
```

---

## Phase 4 — Backend (Reuse Existing Logic)

### Step 7 — Checkpoint capture handler

Reuse your existing QR validation socket handler — just rename the event:

```typescript
socket.on("checkpoint:capture", async (data) => {
  const { teamId, round, token, gps } = data;

  // Validate token
  if (!isValidToken(token)) {
    return socket.emit("capture:failed", { reason: "Invalid token" });
  }

  // Validate GPS radius (server-side, cheat-proof)
  const target = await getRoundTarget(round);
  const distance = haversine(gps, target.coords);
  if (distance > 25) {
    return socket.emit("capture:failed", { reason: "GPS out of range" });
  }

  // Prevent replay attack
  if (await isTokenUsed(token)) {
    return socket.emit("capture:failed", { reason: "Token already used" });
  }

  // Mark complete
  await markCheckpointComplete(teamId, round);
  await markTokenUsed(token);

  socket.emit("capture:success");
});
```

> AR is the visual trigger only. Backend validates everything independently.

---

### Step 8 — Passkey step (unchanged)

After `capture:success`:

```typescript
// Existing passkey verification — no changes needed
POST /api/verify-passkey
{
  "teamId": "T1",
  "round": 3,
  "passkey": "QUEST-R3-7842"
}
```

---

## Phase 5 — Fallback System

### Step 9 — Manual capture fallback

If AR fails (camera denied, MindAR crash, poor lighting):

```tsx
{phase === "manual" && (
  <div className="fallback-screen">
    <p>AR unavailable. Admin has been notified.</p>
    <button onClick={triggerManualCapture}>
      MANUAL CAPTURE
    </button>
  </div>
)}
```

Manual capture still validates GPS + token server-side.  
Admin gets a Discord alert when manual fallback is used.

```typescript
socket.on("checkpoint:manual", async (data) => {
  // Same validation as AR capture
  // Additionally notify admin
  await discordBridge.send(`⚠️ Team ${data.teamId} used manual capture — Round ${data.round}`);
});
```

---

## Phase 6 — UX Enhancements

### Step 10 — Haptics + sound on target lock

```typescript
anchor.onTargetFound = () => {
  // Haptic
  navigator.vibrate?.([100, 50, 200]);

  // Sound
  const audio = new Audio("/sounds/target-lock.mp3");
  audio.play();

  // State update
  setARState("locked");

  // Brief delay before capture for dramatic effect
  setTimeout(() => captureCheckpoint(), 1200);
};
```

### Step 11 — Glitch animation on lock

Use your existing Framer Motion glitch variant on the "TARGET LOCKED" overlay:

```tsx
<motion.div
  variants={glitchVariants}
  initial="initial"
  animate="animate"
  className="target-locked-overlay"
>
  🎯 TARGET LOCKED
</motion.div>
```

---

## Phase 7 — Testing Checklist

### Per marker (run before event day)

- [ ] Marker detects at 1m distance
- [ ] Marker detects at 2-3m distance
- [ ] Marker detects in outdoor daylight
- [ ] Marker detects in partial shade
- [ ] Tested on all 3 Runner phones
- [ ] Detection time under 3 seconds
- [ ] Fallback triggers correctly if camera denied

### Per round location

- [ ] Marker printed A4, matte finish
- [ ] Placed at eye level
- [ ] Not on reflective surface
- [ ] Volunteer knows to keep marker visible and flat
- [ ] Spare printed marker carried by volunteer

---

## Security Summary

| Layer | Method | Where |
|---|---|---|
| GPS presence | Haversine ≤ 15m | Server-side |
| Token validity | One-time token check | Server-side |
| Round matching | Token tied to round number | Server-side |
| Replay attack | Token marked used after capture | Server-side |
| AR detection | Visual trigger only | Client-side |

> AR = immersive UX trigger. All real validation happens on the server.

---

## File Structure

```
/public/
├── markers/          # Source images (jpg)
│   ├── r1.jpg
│   └── ...
├── targets/          # Compiled MindAR files
│   ├── r1.mind
│   └── ...
└── sounds/
    └── target-lock.mp3

/src/components/
├── RunnerAR.tsx      # MindAR + Three.js component
└── RunnerARScreen.tsx # State management + HUD overlay
```

---

## Dependencies

```json
{
  "mind-ar": "latest",
  "three": "latest"
}
```

---

*QUEST: The Code Scavenger — Enigma 4.0 | Arena 2 AR Implementation*