# Valhalla Routing — Implementation Plan
## Replace OSRM with Valhalla in QUEST: The Code Scavenger

---

## Overview

Replace the existing OSRM routing with Valhalla's public demo server for more accurate pedestrian walking routes on JT College campus.

**Endpoint:**
```
https://valhalla1.openstreetmap.de/route
```

**No API key needed. Free. Full planet graph including India.**

---

## Phase 1 — Test Before Switching

### Step 1 — Test Valhalla on JT College coordinates

Run this in your browser console or Postman before touching any code:

```javascript
fetch("https://valhalla1.openstreetmap.de/route", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Id": "quest-enigma4"
  },
  body: JSON.stringify({
    locations: [
      { lon: 75.6464, lat: 15.4341 },
      { lon: 75.6471, lat: 15.4352 }
    ],
    costing: "pedestrian",
    directions_type: "none"
  })
})
.then(r => r.json())
.then(console.log);
```

**What to check:**
- Response returns without error
- Route shape looks accurate on campus
- Response time under 2 seconds

If this passes — proceed. If not — stay on OSRM.

---

## Phase 2 — Frontend Changes

### Step 2 — Create Valhalla routing utility

Create a new file: `src/utils/routing.ts`

```typescript
const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
const CLIENT_ID = "quest-enigma4";

export interface RouteCoord {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceMetres: number;
  durationSeconds: number;
}

export async function getWalkingRoute(
  from: RouteCoord,
  to: RouteCoord
): Promise<RouteResult | null> {
  try {
    const response = await fetch(VALHALLA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CLIENT_ID
      },
      body: JSON.stringify({
        locations: [
          { lon: from.lng, lat: from.lat },
          { lon: to.lng,   lat: to.lat  }
        ],
        costing: "pedestrian",
        directions_type: "none",
        units: "kilometers"
      })
    });

    if (!response.ok) throw new Error(`Valhalla error: ${response.status}`);

    const data = await response.json();
    const leg = data.trip.legs[0];

    // Decode Valhalla's encoded polyline (precision 6)
    const coordinates = decodePolyline(leg.shape);

    return {
      coordinates,
      distanceMetres: leg.summary.length * 1000,
      durationSeconds: leg.summary.time
    };

  } catch (err) {
    console.error("Valhalla routing failed:", err);
    return null; // triggers fallback
  }
}

// Valhalla uses precision 6 polyline encoding
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    // Valhalla precision 6 = divide by 1e6
    coords.push([lat / 1e6, lng / 1e6]);
  }

  return coords;
}
```

---

### Step 3 — Replace OSRM call in your map hook

Find your existing OSRM call — likely in `src/hooks/useMap.ts` or similar:

**Old OSRM code:**
```typescript
// OSRM — REMOVE THIS
const response = await fetch(
  `https://router.project-osrm.org/route/v1/foot/
  ${from.lng},${from.lat};${to.lng},${to.lat}
  ?overview=full&geometries=geojson`
);
const data = await response.json();
const coords = data.routes[0].geometry.coordinates.map(
  ([lng, lat]) => [lat, lng]
);
```

**New Valhalla code:**
```typescript
// Valhalla — ADD THIS
import { getWalkingRoute } from "../utils/routing";

const route = await getWalkingRoute(
  { lat: from.lat, lng: from.lng },
  { lat: to.lat,   lng: to.lng  }
);

if (!route) {
  // Fallback: draw straight line if routing fails
  drawStraightLine(from, to);
  return;
}

const coords = route.coordinates; // already [lat, lng] for Leaflet
```

---

### Step 4 — Update Leaflet polyline renderer

Find where you draw the route on the map:

```typescript
// Draw neon dashed route line
const routeLine = L.polyline(coords, {
  color: "#00ffb4",
  weight: 3,
  opacity: 0.8,
  dashArray: "8 12"
}).addTo(map);

// Optional: show estimated walk time on Solver's HUD
const minutes = Math.ceil(route.durationSeconds / 60);
setETA(`~${minutes} min walk`);
```

---

### Step 5 — Add straight-line fallback

If Valhalla fails (network issue, rate limit), draw a direct line so the map never breaks:

```typescript
function drawStraightLine(from: RouteCoord, to: RouteCoord) {
  L.polyline(
    [[from.lat, from.lng], [to.lat, to.lng]],
    {
      color: "#ff4444",
      weight: 2,
      opacity: 0.5,
      dashArray: "4 8"
    }
  ).addTo(map);

  // Notify Solver
  setRouteError("Direct route shown — routing unavailable");
}
```

Red dashed line = fallback. Solver knows to guide Runner manually.

---

### Step 6 — Refresh route on Runner position update

Route should recalculate as Runner moves closer:

```typescript
// Recalculate every 30 seconds or when Runner moves > 20m
useEffect(() => {
  if (!runnerPosition || !targetPosition) return;

  const interval = setInterval(async () => {
    const route = await getWalkingRoute(runnerPosition, targetPosition);
    if (route) updateRouteOnMap(route.coordinates);
  }, 30000); // every 30s

  return () => clearInterval(interval);
}, [runnerPosition, targetPosition]);
```

Don't recalculate on every GPS ping — 30 second intervals is enough and avoids rate limiting.

---

## Phase 3 — Remove OSRM

### Step 7 — Clean up OSRM references

Search your codebase for these and remove:

```bash
grep -r "router.project-osrm.org" src/
grep -r "osrm" src/
```

Remove any OSRM-related npm packages if installed:

```bash
npm uninstall osrm
```

---

## Phase 4 — Environment Config

### Step 8 — Add to environment variables

```env
# Frontend .env
VITE_ROUTING_URL=https://valhalla1.openstreetmap.de/route
VITE_ROUTING_CLIENT_ID=quest-enigma4
```

Update `routing.ts` to use env vars:

```typescript
const VALHALLA_URL = import.meta.env.VITE_ROUTING_URL;
const CLIENT_ID = import.meta.env.VITE_ROUTING_CLIENT_ID;
```

This makes it easy to swap to a self-hosted Valhalla later if needed.

---

## Phase 5 — Testing

### Step 9 — Test checklist

- [ ] Valhalla responds correctly for JT College coordinates
- [ ] Decoded polyline renders on Leaflet map without errors
- [ ] Route looks accurate on campus (footpaths, not roads)
- [ ] Fallback straight line triggers when Valhalla URL is wrong
- [ ] Route recalculates correctly as Runner position updates
- [ ] No console errors on iOS Safari
- [ ] No console errors on Android Chrome
- [ ] Response time under 2 seconds on college WiFi
- [ ] Works when both phones are on the same WiFi network
- [ ] OSRM references fully removed from codebase

---

## Comparison — OSRM vs Valhalla

| Feature | OSRM | Valhalla |
|---|---|---|
| Pedestrian routing | ✅ | ✅ Better |
| India OSM data | ✅ | ✅ Same source |
| Public server | ✅ | ✅ |
| API key needed | No | No |
| Polyline encoding | GeoJSON | Precision 6 |
| Response format | routes[0].geometry | trip.legs[0].shape |
| Client ID header | Not required | Required |
| Rate limits | Similar | Similar |
| Self-hostable | ✅ | ✅ |

---

## Rate Limit Safety

Your event usage:
- 3 teams × 10 rounds = 30 initial route requests
- Route refresh every 30s × ~5 min avg navigation = ~10 refreshes per round
- Total worst case: 30 + (30 × 10) = **330 requests**

Valhalla public demo is well within fair-use at this volume. No issues expected.

---

## Rollback Plan

If Valhalla behaves unexpectedly on event day, revert in one line:

```typescript
// routing.ts — emergency rollback
const VALHALLA_URL = "https://router.project-osrm.org/route/v1/foot";
// swap fetch body back to OSRM format
```

Keep the OSRM implementation commented out — not deleted — until after the event.

---

*QUEST: The Code Scavenger — Enigma 4.0 | Valhalla Routing Implementation*
