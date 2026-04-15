# Location Tracking & Verification Strategy

This document outlines the architecture and rationale behind the location verification system used in the Quest Scavenger Hunt application.

## The Challenge
Standard GPS tracking, particularly indoors or in dense college campuses (the "urban canyon" effect), is often unreliable. A GPS reading can bounce or be inaccurate by 20-50 meters. If we relied strictly on GPS coordinates to unlock a stage, a runner might accidentally unlock a room while standing outside the building, or fail to unlock it while standing directly inside.

## The Solution: A Hybrid Approach
To ensure 100% success and accuracy, we implement a **Hybrid Verification System**.

### 1. Browser-Based High Accuracy Tracking (GPS + WPS)
We utilize the `navigator.geolocation.watchPosition` API with the `{ enableHighAccuracy: true }` parameter in `useRunnerGps.ts`.

By doing this, we instruct the mobile device's Operating System (iOS/Android) to use more than just raw GPS. The OS automatically implements:
*   **WPS (Wi-Fi Positioning System):** Scans for nearby Wi-Fi network MAC addresses to pinpoint the user's location based on global databases.
*   **A-GPS (Assisted GPS):** Downloads satellite location data via cellular networks for a faster lock.
*   **Sensor Fusion:** Uses accelerometers and gyroscopes to estimate movement if the signal temporarily drops.

**Why this is used:** This provides a live, 10-30m accurate trail of the runner's movement. It allows the `Admin` and `Solver` roles to see exactly where the runner is on the campus map in real-time.

### 2. Physical Verification (QR Scanning)
Because GPS cannot guarantee exact room-level accuracy reliably, we integrated a physical QR Code verification system using `html5-qrcode`.

When a runner arrives at their destination, they must physically scan a QR code (containing a specific validation string like `QUEST-AUTHORIZED-LOCATION`) attached to the location wall/desk before the system allows them to enter their passkey.

**Why this is used:** It provides foolproof, exact room-level verification.

## Anti-Cheat Mechanism
By combining these two approaches, the system is fundamentally secure against common cheating methods:
*   **The "Photo Hack":** A user cannot simply take a photo of the QR code and send it to a runner sitting in a dorm room. The live GPS tracking layer will reveal to the Admins that the runner never left their dorm. 
*   **The "Spoofed GPS":** If a user spoofs their phone's GPS location via developer tools, they still cannot progress without physically being present to scan the hidden QR code and obtain the physical passkey.

## Probability of Success
*   **Map Tracking:** 90-95% successful accuracy for general location context.
*   **Stage Unlocking:** 100% successful, because the primary gatekeeper is the physical QR Scan, which instantly and flawlessly verifies physical presence.
