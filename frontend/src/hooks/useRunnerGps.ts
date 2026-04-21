import { useEffect, useRef } from 'react';
import { updateRunnerLocation } from '@/lib/api';

const SEND_INTERVAL_MS = 250;

/**
 * Watches the runner's real GPS position and streams it to the backend
 * while the runner is in a field stage. Stops silently when at base.
 */
export function useRunnerGps(token: string | null, stage: string | null) {
  const watchIdRef = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<{ lat: number; lng: number; heading: number | null } | null>(null);
  const latestRotationRef = useRef<number | null>(null);

  useEffect(() => {
    const isActive = !!token && !!stage && stage !== 'lobby';

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
      window.removeEventListener('deviceorientation', handleOrientation);
      latestPositionRef.current = null;
      latestRotationRef.current = null;
      return;
    }

    if (!('geolocation' in navigator)) return;

    // Watch GPS — updates latestPositionRef on each fix
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPositionRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
        };
      },
      () => { },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // Orientation listener
    // Orientation listener with Low-Pass Filtering
    function handleOrientation(e: any) {
      if (e.webkitCompassHeading !== undefined) {
        latestRotationRef.current = (360 - e.webkitCompassHeading) % 360;
      } else if (e.alpha !== null) {
        latestRotationRef.current = (360 - e.alpha) % 360;
      }
    }

    // Permission check for iOS
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((resp: string) => {
          if (resp === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    // Send latest position every SEND_INTERVAL_MS
    sendTimerRef.current = setInterval(() => {
      const pos = latestPositionRef.current;
      if (!pos || !token) return;

      // Use compass rotation if available, fallback to GPS heading
      const h = latestRotationRef.current !== null ? latestRotationRef.current : pos.heading;

      updateRunnerLocation(token, pos.lat, pos.lng, h).catch(() => {
        // Silent — don't disrupt game flow on network errors
      });
    }, SEND_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sendTimerRef.current !== null) {
        clearInterval(sendTimerRef.current);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [token, stage]);
}
