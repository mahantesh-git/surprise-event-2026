# Implementation Plan: Story-Driven AR Tactical Mission

This plan outlines the transformation of the scavenger hunt from a QR-scanning game into a cinematic, storytelling-driven AR experience using "Tap-to-Place" (WebXR).

## Goal
Replace the static QR code verification with a dynamic AR deployment flow where Runners "deploy" 3D tactical gear at each coordinate to unlock the next stage of the story.

## User Review Required

> [!IMPORTANT]
> **Device Compatibility**: 
> - **Compatible**: Android (ARCore / Android 8.0+), iOS (ARKit / iPhone 6S+ / iOS 12+).
> - **Unsupported**: Devices older than 2018 or budget phones without gyroscopes.
> - **Solution**: We will implement a "Manual Bypass" button for unsupported devices to ensure no runner gets stuck.

> [!NOTE]
> **3D Assets**: We will use high-fidelity `.glb` assets. I will provide placeholders for the initial build.

## Proposed Changes

### 1. Foundation & Assets
#### [MODIFY] `frontend/index.html`
- Add: `<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>`

#### [NEW] `frontend/src/config/missionData.ts`
- Define the `MISSION_DATA` array:
  - **Round 1**: "UPLINK INGRESS" (Model: Satellite Antenna)
  - **Round 2**: "DATA BREACH" (Model: Server Core)
  - **Round 3**: "SIGNAL SCRAMBLER" (Model: Jammer)
  - **Round 4**: "CORE PULSE" (Model: Fusion Reactor)

### 2. Runner Experience
#### [MODIFY] `frontend/src/components/RunnerGame.tsx`
- **AR Deployment Component**:
  - Integrate `<model-viewer>` with `ar` and `ar-placement="floor"`.
  - Use `onARStatusChange` to detect successful deployment.
- **Verification Logic**: 
  - Bypass QR scan if the AR deployment is successful and GPS matches.

### 3. Solver Experience
#### [MODIFY] `frontend/src/App.tsx`
- **Live Sync**: Update Solver's card to show: *"STATUS: RUNNER DEPLOYING UPLINK..."*
- **Tactical Progress Bar**: Update labels to match the story titles.

---

## 4. Minor Changes & Polish
- **Typewriter Briefing**: Each round starts with a scrolling "INCOMING INTEL" text box.
- **Glitch SFX**: Add audio/visual glitch effect when opening the AR tactical lens.

## Verification Plan
1.  **Browser Check**: Verify `<model-viewer>` loads on Chrome/Safari.
2.  **GPS Check**: Test that deployment is blocked until `distance < 20m`.
3.  **Fallback Check**: Manually disable AR on a device to ensure the "Manual Bypass" appears.
