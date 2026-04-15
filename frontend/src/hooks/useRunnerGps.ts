import { useEffect, useRef } from 'react';
import { updateRunnerLocation } from '@/lib/api';

const FIELD_STAGES = new Set(['runner_travel', 'runner_game', 'runner_done']);
const SEND_INTERVAL_MS = 5000;

/**
 * Watches the runner's real GPS position and streams it to the backend
 * while the runner is in a field stage. Stops silently when at base.
 */
export function useRunnerGps(token: string | null, stage: string | null) {
  const watchIdRef = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const isActive = !!token && !!stage && FIELD_STAGES.has(stage);

    if (!isActive) {
      // Stop watching
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (sendTimerRef.current !== null) {
        clearInterval(sendTimerRef.current);
        sendTimerRef.current = null;
      }
      latestPositionRef.current = null;
      return;
    }

    if (!('geolocation' in navigator)) return;

    // Watch GPS — updates latestPositionRef on each fix
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPositionRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    // Send latest position every SEND_INTERVAL_MS
    sendTimerRef.current = setInterval(() => {
      const pos = latestPositionRef.current;
      if (!pos || !token) return;
      updateRunnerLocation(token, pos.lat, pos.lng).catch(() => {
        // Silent — don't disrupt game flow on network errors
      });
    }, SEND_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (sendTimerRef.current !== null) {
        clearInterval(sendTimerRef.current);
        sendTimerRef.current = null;
      }
    };
  }, [token, stage]);
}
