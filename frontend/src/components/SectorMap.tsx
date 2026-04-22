import { useState, useEffect, useRef } from 'react';
import { RoundQuestion } from '@/lib/api';
import { Navigation, ExternalLink, LocateFixed, AlertCircle, Maximize, Minimize } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function parseCoord(raw: string): number {
  if (typeof raw !== 'string') return Number(raw) || 0;
  const clean = raw.trim();

  // Capture degrees, minutes, seconds, and direction
  // Matches: 15° 26' 03.4" N, 15.4348° N, 15°26'N, 15 26 03 N, etc.
  const parts = clean.match(/([\d.]+)[°\s]*([\d.]*)['\s]*([\d.]*)["\s]*([NSEW]?)/i);
  if (!parts) return 0;

  const d = parseFloat(parts[1] || '0');
  const m = parseFloat(parts[2] || '0');
  const s = parseFloat(parts[3] || '0');
  const dir = (parts[4] || '').toUpperCase();

  let decimal = d + (m / 60) + (s / 3600);
  if (dir === 'S' || dir === 'W') decimal = -decimal;

  // Final safeguard: if result is clearly an integer that was meant to be DMS 
  // but failed (e.g. 1526 instead of 15.43), we don't want to send it.
  // But our new parser handles 15°26' as 15.4333, so 1526 shouldn't happen anymore.
  return decimal;
}

interface SectorMapProps {
  rounds: RoundQuestion[];
  currentRound: number;
  roundsDone: boolean[];
  stage: string;
  visible?: boolean;
}

type GeoStatus = 'idle' | 'watching' | 'denied' | 'unavailable';

export function SectorMap({ rounds, currentRound, stage, visible }: SectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const runnerRingRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const [routeCoords, setRouteCoords] = useState<L.LatLngTuple[]>([]); // live route path for cone bearing
  const hasCenteredRef = useRef<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const pathHistoryRef = useRef<L.LatLngTuple[]>([]);
  const pathLayerRef = useRef<L.Polyline | null>(null);

  const isComplete = stage === 'complete';
  const isRunnerStage = ['runner_travel', 'runner_game', 'runner_done'].includes(stage);

  const visibleRoundIndex = isRunnerStage ? currentRound : currentRound - 1;
  const current = visibleRoundIndex >= 0 ? rounds?.[Math.min(visibleRoundIndex, rounds.length - 1)] : null;

  const [runnerCoords, setRunnerCoords] = useState<[number, number, number, number | null] | null>(null);
  const [rotation, setRotation] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  const targetLat = current?.coord?.lat ? parseCoord(current.coord.lat) : null;
  const targetLng = current?.coord?.lng ? parseCoord(current.coord.lng) : null;
  const hasTarget = isRunnerStage && targetLat !== null && targetLng !== null && !isComplete;

  const defaultLat = 15.4229;
  const defaultLng = 75.6162;

  // ── Helper: start GPS watch ─────────────────────────────────
  const startWatching = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    if (watchIdRef.current !== null) return; // already watching

    setGeoStatus('watching');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setRunnerCoords([
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.heading
        ]);
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    // Orientation listener for "rotating"
    const handleOrientation = (e: any) => {
      // iOS Webkit support
      if (e.webkitCompassHeading !== undefined) {
        setRotation(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        // Android / standard: alpha is 0 at North, counter-clockwise
        setRotation(360 - e.alpha);
      }
    };

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

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Auto-start watching when runner's turn
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (isRunnerStage) {
      cleanup = startWatching();
    } else {
      stopWatching();
    }
    return () => {
      stopWatching();
      if (cleanup) cleanup();
    };
  }, [isRunnerStage]);

  // ── Init Leaflet map ────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 17);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 21, maxNativeZoom: 19, subdomains: 'abcd' }
    ).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Invalidate size when panel becomes visible ───────────────
  // When hidden via CSS (display:none) Leaflet renders into 0x0;
  // call invalidateSize() the moment the container is shown again.
  useEffect(() => {
    if (visible && mapRef.current) {
      // Small delay to let the browser repaint the container first
      const t = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Handle invalidate size when toggling fullscreen
  useEffect(() => {
    if (mapRef.current) {
      const t = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isFullScreen]);

  // ── Update target marker ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (targetMarkerRef.current) {
      map.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }

    if (hasTarget && targetLat !== null && targetLng !== null) {
      const icon = L.divIcon({
        className: 'target-marker',
        html: `<div class="animate-pulse" style="
          width:32px;height:32px;
          background:var(--color-accent);
          border:4px solid #000;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 0 20px var(--color-accent), 0 0 40px rgba(238, 58, 23, 0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="width:8px;height:8px;background:black;border-radius:50%;transform:rotate(45deg);"></div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      targetMarkerRef.current = L.marker([targetLat, targetLng], { icon, zIndexOffset: 500 })
        .addTo(map)
        .bindPopup(`<b>${current?.coord?.place || 'Target'}</b>`);

      if (!runnerCoords) {
        map.setView([targetLat, targetLng], 19);
      }
    } else if (!runnerCoords) {
      map.setView([defaultLat, defaultLng], 17);
    }
  }, [hasTarget, targetLat, targetLng]);

  // ── Update runner marker (live) ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !runnerCoords) return;
    const [lat, lng, accuracy, heading] = runnerCoords;

    // Use compass heading if available, fall back to GPS heading, then null
    const finalRot = rotation !== null ? rotation : (heading !== null ? heading : null);
    const hasRealHeading = finalRot !== null;

    // Compute bearing from runner → next path node (or target) as a directional fallback
    // so the cone always points along the road even when compass/GPS heading is unavailable.
    let targetBearing: number | null = null;
    if (!hasRealHeading && hasTarget && targetLat !== null && targetLng !== null) {
      let nextLat = targetLat;
      let nextLng = targetLng;

      if (routeCoords && routeCoords.length > 1) {
        // Find a point at least 5 meters ahead for a stable bearing
        for (let i = 1; i < routeCoords.length; i++) {
          nextLat = routeCoords[i][0];
          nextLng = routeCoords[i][1];
          // use simple distance check, approx: 1 deg = 111km
          const dY = (nextLat - lat) * 111000;
          const dX = (nextLng - lng) * 111000 * Math.cos(lat * Math.PI / 180);
          const dist = Math.sqrt(dX * dX + dY * dY);
          if (dist > 5) break; // found a point sufficiently ahead
        }
      }

      const dLng = (nextLng - lng) * (Math.PI / 180);
      const φ1 = lat * (Math.PI / 180);
      const φ2 = nextLat * (Math.PI / 180);
      const y = Math.sin(dLng) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
      targetBearing = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
    }

    // displayRot: real heading → target bearing → null (no cone)
    const displayRot = finalRot ?? targetBearing;
    const hasAnyCone = displayRot !== null;

    // Accurate GPS < 100m → bright cyan; IP-based / poor → dimmer
    const isAccurate = accuracy <= 100;
    const dotColor = isAccurate ? '#00BFFF' : '#4D8076';
    const ringRadius = Math.min(accuracy, 500);

    // Cone color: cyan = real heading | amber = computed target bearing
    const coneColor = hasRealHeading ? dotColor : '#F59E0B';
    const coneLabel = hasRealHeading ? '' : `
      <div style="
        position:absolute;
        bottom:-18px;
        left:50%;transform:translateX(-50%);
        font-size:8px;font-family:monospace;
        color:#F59E0B;opacity:0.8;white-space:nowrap;letter-spacing:0.05em;
      ">ALONG PATH</div>`;

    const markerHtml = `
      <div style="width:64px;height:64px;position:relative;display:flex;align-items:center;justify-content:center;">
        ${hasAnyCone ? `
          <!-- Direction cone (cyan=real heading, amber=target bearing) -->
          <div style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform: rotate(${displayRot}deg);
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
          ">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
              <!-- Outer glow cone -->
              <path d="M32 32 L18 4 A30 30 0 0 1 46 4 Z"
                fill="${coneColor}" fill-opacity="0.18" />
              <!-- Inner solid cone -->
              <path d="M32 32 L22 10 A14 14 0 0 1 42 10 Z"
                fill="${coneColor}" fill-opacity="${hasRealHeading ? '0.55' : '0.35'}" />
              <!-- Arrowhead tip -->
              <polygon points="32,3 26,15 38,15"
                fill="${coneColor}" opacity="0.95"/>
            </svg>
          </div>
          ${coneLabel}
        ` : `
          <!-- No cone possible: plain outer ring -->
          <div style="
            position:absolute;
            width:48px;height:48px;
            border-radius:50%;
            border:1.5px solid ${dotColor};
            opacity:0.25;
          "></div>
        `}

        <!-- Center dot -->
        <div style="
          position:relative;
          width:16px;height:16px;
          border-radius:50%;
          background:${dotColor};
          border:2.5px solid #ffffff;
          box-shadow:0 0 0 3px ${dotColor}40, 0 0 18px ${dotColor};
          z-index:2;
        "></div>
        <!-- Pulse ring -->
        <div style="
          position:absolute;
          width:16px;height:16px;
          border-radius:50%;
          background:${dotColor};
          opacity:0.4;
          animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
          z-index:1;
        "></div>
      </div>
      <style>
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.4; }
          70%  { transform: scale(2.5); opacity: 0;   }
          100% { transform: scale(2.5); opacity: 0;   }
        }
      </style>
    `;

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([lat, lng]);
      const el = runnerMarkerRef.current.getElement();
      if (el) {
        el.innerHTML = markerHtml;
      }
      runnerRingRef.current?.setLatLng([lat, lng]);
      runnerRingRef.current?.setRadius(ringRadius);
    } else {
      const runnerIcon = L.divIcon({
        className: 'runner-location-marker',
        html: markerHtml,
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      runnerMarkerRef.current = L.marker([lat, lng], { icon: runnerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`📍 Your Location<br/><span style="font-size:11px;opacity:0.6">${isAccurate ? `±${Math.round(accuracy)}m` : 'Approximate'}</span>`);

      // Accuracy ring
      runnerRingRef.current = L.circle([lat, lng], {
        radius: ringRadius,
        color: dotColor,
        fillColor: dotColor,
        fillOpacity: 0.07,
        weight: 1,
        dashArray: isAccurate ? undefined : '5, 5',
      }).addTo(map);
    }

    // ── Update Tactical Path (History) ────────────────────────
    if (map) {
      const currentPos: L.LatLngTuple = [lat, lng];
      const lastPos = pathHistoryRef.current[pathHistoryRef.current.length - 1];

      // Only add point if moved significantly (> 2m) to keep the path clean
      if (!lastPos || map.distance(currentPos, lastPos) > 2) {
        pathHistoryRef.current.push(currentPos);
        if (pathHistoryRef.current.length > 1000) pathHistoryRef.current.shift();
      }

      if (pathLayerRef.current) {
        pathLayerRef.current.setLatLngs(pathHistoryRef.current);
      } else if (pathHistoryRef.current.length > 1) {
        pathLayerRef.current = L.polyline(pathHistoryRef.current, {
          color: '#ffffff',
          weight: 2,
          opacity: 0.4,
          dashArray: '5, 8',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(map);
      }
    }

    // Only auto-center the very first time we get a GPS lock, so we don't
    // yank the camera constantly while the user is trying to pan/zoom.
    if (!hasCenteredRef.current) {
      if (accuracy < 1000) {
        if (hasTarget && targetLat !== null && targetLng !== null) {
          const bounds = L.latLngBounds([[lat, lng], [targetLat, targetLng]]);
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 19 });
        } else {
          map.setView([lat, lng], accuracy < 200 ? 18 : 15);
        }
      } else {
        // For poor accuracy (PC testing), keep the camera locked on the target/campus
        if (hasTarget && targetLat !== null && targetLng !== null) {
          map.setView([targetLat, targetLng], 18);
        } else {
          map.setView([defaultLat, defaultLng], 17);
        }
      }
      hasCenteredRef.current = true;
    }
  }, [runnerCoords, rotation, hasTarget, targetLat, targetLng, routeCoords]);

  // ── Draw walking route via OSRM (Google Maps Style) ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !runnerCoords || !hasTarget || targetLat === null || targetLng === null) return;

    const [rLat, rLng] = runnerCoords;
    // Request full geometry to follow roads exactly
    const url =
      `https://router.project-osrm.org/route/v1/foot/${rLng},${rLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!mapRef.current) return;
        const rawCoords: L.LatLngTuple[] =
          data.routes?.[0]?.geometry?.coordinates?.map(
            ([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple
          ) ?? [];

        // Smoothly bridge the gap between GPS and the nearest road
        const coords: L.LatLngTuple[] = [[rLat, rLng], ...rawCoords, [targetLat!, targetLng!]];
        setRouteCoords(coords);

        if (routeGlowRef.current) {
          mapRef.current.removeLayer(routeGlowRef.current);
          routeGlowRef.current = null;
        }
        if (routeLayerRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }

        if (coords.length > 1) {
          // Layer 1: Wide Blue Glow
          routeGlowRef.current = L.polyline(coords, {
            color: '#00BFFF',
            weight: 12,
            opacity: 0.15,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(mapRef.current);

          // Layer 2: Main Cyan "Google Style" Line
          routeLayerRef.current = L.polyline(coords, {
            color: '#00BFFF',
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(mapRef.current);
        }
      })
      .catch((err) => {
        console.warn('OSRM Fallback:', err);
        // If road data is missing, show a straight dashed line as fallback
        const fallbackCoords: L.LatLngTuple[] = [[rLat, rLng], [targetLat!, targetLng!]];
        setRouteCoords(fallbackCoords);
      });
  }, [runnerCoords, hasTarget, targetLat, targetLng]);

  const navUrl = hasTarget
    ? runnerCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${runnerCoords[0]},${runnerCoords[1]}&destination=${targetLat},${targetLng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`
    : null;

  return (
    <div className={isFullScreen ? "" : "space-y-3"}>
      {isFullScreen && (
        <style>{`
          body { overflow: hidden !important; }
          .corner-card { 
            clip-path: none !important; 
            transform: none !important; 
            backdrop-filter: none !important; 
            -webkit-backdrop-filter: none !important; 
            filter: none !important; 
          }
          .reveal-up { 
            transform: none !important; 
            animation: none !important; 
            backdrop-filter: none !important; 
            -webkit-backdrop-filter: none !important; 
            filter: none !important; 
          }
          .min-h-screen {
            transform: none !important;
            contain: none !important;
            perspective: none !important;
          }
          #root {
            transform: none !important;
            contain: none !important;
            perspective: none !important;
          }
        `}</style>
      )}
      {/* Map */}
      <div className={
        isFullScreen
          ? "fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md"
          : "relative w-full h-[360px] sm:h-[420px] glass-morphism corner-card overflow-hidden shadow-black-lg"
      }>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className={`absolute right-4 z-[1000] p-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors shadow-black-lg ${isFullScreen ? 'top-20 sm:top-24' : 'top-4'
            }`}
          aria-label="Toggle Fullscreen"
        >
          {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>

        {/* Single bottom HUD bar — all status in one row, never overlaps */}
        <div className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center justify-between gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border-t border-white/10">
          {/* Left: status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {runnerCoords && (() => {
              const acc = runnerCoords[2];
              const isGood = acc <= 100;
              const color = isGood ? '#00BFFF' : '#EE3A17';
              const label = isGood ? `GPS ±${Math.round(acc)}m` : `~±${Math.round(acc)}m`;
              return (
                <span
                  key="gps-status"
                  className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest"
                  style={{ color }}
                >
                  <LocateFixed className="h-3 w-3 animate-pulse shrink-0" />
                  {label}
                </span>
              );
            })()}

            {hasTarget && (
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-white/60">
                <Navigation className="h-3 w-3 shrink-0" />
                Target Locked
              </span>
            )}

            {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {geoStatus === 'denied' ? 'Location denied' : 'GPS unavailable'}
              </span>
            )}
          </div>

          {/* Right: recenter button */}
          {isRunnerStage && (
            <button
              onClick={() => {
                if (geoStatus !== 'watching') {
                  startWatching();
                } else if (mapRef.current && runnerCoords) {
                  const [lat, lng, accuracy] = runnerCoords;
                  if (accuracy < 1000) {
                    if (hasTarget && targetLat !== null && targetLng !== null) {
                      const bounds = L.latLngBounds([[lat, lng], [targetLat, targetLng]]);
                      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 19 });
                    } else {
                      mapRef.current.setView([lat, lng], accuracy < 200 ? 18 : 15);
                    }
                  } else if (targetLat !== null && targetLng !== null) {
                    mapRef.current.setView([targetLat, targetLng], 18);
                  }
                }
              }}
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/80 hover:text-white transition-colors active:scale-95 shrink-0"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {geoStatus === 'watching' ? 'Recenter' : 'Locate Me'}
            </button>
          )}
        </div>
      </div>

      {/* Navigate button */}
      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center justify-center gap-2 sm:gap-3 w-full h-14 border-white/20 text-white hover:border-white hover:bg-white hover:text-black transition-all"
        >
          <Navigation className="h-4 w-4" />
          {runnerCoords ? 'Navigate to Target' : 'Explore Target Site'}
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      )}

      {/* Legend */}
      {!isFullScreen && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-3 border-t border-white/5 bg-white/[0.04] glass-morphism text-[9px] font-mono uppercase tracking-widest">
          {isRunnerStage ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] shadow-accent-xs" />
                <span className="text-[var(--color-accent)]">Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00BFFF]" style={{ boxShadow: '0 0 6px #00BFFF' }} />
                <span className="text-[#00BFFF]">{runnerCoords ? 'You (Live)' : 'GPS Pending...'}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-[var(--color-accent)]/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/50 animate-pulse" />
              </div>
              <span className="text-[var(--color-accent)]/80">Awaiting Target Coordinates</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
