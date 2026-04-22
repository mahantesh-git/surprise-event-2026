import { useEffect, useRef } from 'react';
import { updateRunnerLocation } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';

/**
 * How often to stream position/heading to the backend.
 * 100 ms = 10 Hz — fast enough for smooth direction arrows without flooding.
 */
const SEND_INTERVAL_MS = 100;

/**
 * Watches the runner's GPS + compass and streams to the backend.
 *
 * Key design decisions
 * ─────────────────────
 * 1. `socket` and `status` are kept in **refs**, not captured in the effect
 *    closure.  This means the send interval NEVER goes stale: even after
 *    a WebSocket reconnect the timer keeps firing and immediately picks up
 *    the new socket without ever restarting.
 *
 * 2. The GPS watchPosition and setInterval are guarded so they only start
 *    ONCE per active session (not on every React re-render or socket event).
 *
 * 3. `deviceorientationabsolute` (Android) is preferred over
 *    `deviceorientation` (iOS / fallback) for drift-free compass readings.
 */
export function useRunnerGps(token: string | null, stage: string | null) {
  const { socket, status } = useSocket();

  // ── Always-fresh refs — avoids stale closures inside setInterval ──────────
  const socketRef  = useRef(socket);
  const statusRef  = useRef(status);
  const tokenRef   = useRef(token);
  socketRef.current = socket;
  statusRef.current = status;
  tokenRef.current  = token;

  // ── Internal state ────────────────────────────────────────────────────────
  const watchIdRef       = useRef<number | null>(null);
  const sendTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<{ lat: number; lng: number; heading: number | null } | null>(null);
  const latestRotationRef = useRef<number | null>(null); // compass heading (preferred)

  // ── Full cleanup helper ───────────────────────────────────────────────────
  const stopAll = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendTimerRef.current !== null) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    latestPositionRef.current = null;
    latestRotationRef.current = null;
  };

  // ── Mount-time cleanup (unmount) ──────────────────────────────────────────
  useEffect(() => stopAll, []);

  // ── Main effect — only re-runs when token/stage change ───────────────────
  useEffect(() => {
    const isActive = !!token && !!stage && stage !== 'lobby';

    if (!isActive) {
      stopAll();
      return;
    }

    if (!('geolocation' in navigator)) return;

    // ── 1. GPS watch — create only once ─────────────────────────────────────
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          latestPositionRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading,
          };
        },
        () => { /* silent — don't disrupt game flow */ },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    // ── 2. Compass listener ──────────────────────────────────────────────────
    // `deviceorientationabsolute` gives a true-north heading on Android.
    // iOS uses `webkitCompassHeading` inside `deviceorientation`.
    // The `hasAbsolute` flag ensures the fallback alpha doesn't override
    // an already-accurate absolute reading.
    let hasAbsolute = false;
    const handleOrientation = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      if ((e as any).type === 'deviceorientationabsolute') {
        hasAbsolute = true;
        if (e.alpha !== null) latestRotationRef.current = (360 - e.alpha) % 360;
      } else if ((e as any).type === 'deviceorientation') {
        if (e.webkitCompassHeading !== undefined) {
          // iOS: webkitCompassHeading is already clockwise from true north
          latestRotationRef.current = (360 - e.webkitCompassHeading) % 360;
        } else if (!hasAbsolute && e.alpha !== null) {
          latestRotationRef.current = (360 - e.alpha) % 360;
        }
      }
    };

    if (
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // iOS 13+ permission gate (must be called from a user gesture — already
      // requested at login via App.tsx handleLogin)
      (window as any).DeviceOrientationEvent.requestPermission()
        .then((resp: string) => {
          if (resp === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation as any, true);
          }
        })
        .catch(console.warn);
    } else {
      window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.addEventListener('deviceorientation',         handleOrientation as any, true);
    }

    // ── 3. Send timer — create only once, reads fresh refs ──────────────────
    if (sendTimerRef.current === null) {
      sendTimerRef.current = setInterval(() => {
        const pos = latestPositionRef.current;
        const tok = tokenRef.current;
        if (!pos || !tok) return;

        // Compass heading takes priority over GPS heading
        const h = latestRotationRef.current !== null
          ? latestRotationRef.current
          : pos.heading;

        const payload = {
          lat: pos.lat,
          lng: pos.lng,
          heading: h,
          timestamp: Date.now(),
        };

        // ── Primary: WebSocket (always fresh via ref) ────────────────────────
        const s  = socketRef.current;
        const st = statusRef.current;
        if (s && st === 'connected') {
          s.emit('location:stream', payload);
          return;
        }

        // ── Fallback: REST ──────────────────────────────────────────────────
        updateRunnerLocation(tok, pos.lat, pos.lng, h).catch(() => { /* silent */ });
      }, SEND_INTERVAL_MS);
    }

    // Only remove orientation listeners on cleanup (GPS + timer persist until stopAll)
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.removeEventListener('deviceorientation',         handleOrientation as any, true);
    };

    // ⚠ Intentionally NOT including socket/status here.
    // They are accessed via refs above — adding them would cause the GPS
    // watch to restart every time the socket reconnects, creating gaps.
  }, [token, stage]); // eslint-disable-line react-hooks/exhaustive-deps
}
