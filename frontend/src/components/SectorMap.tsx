import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RoundQuestion } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { Navigation, LocateFixed, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function parseCoord(raw: string | number): number {
  if (typeof raw !== 'string') return Number(raw) || 0;
  const clean = raw.trim();

  // Capture degrees, minutes, seconds, and direction
  const parts = clean.match(/([\d.]+)[°\s]*([\d.]*)['\s]*([\d.]*)["\s]*([NSEW]?)/i);
  if (!parts) return 0;

  const d = parseFloat(parts[1] || '0');
  const m = parseFloat(parts[2] || '0');
  const s = parseFloat(parts[3] || '0');
  const dir = (parts[4] || '').toUpperCase();

  const decimal = d + (m / 60) + (s / 3600);
  const result = dir === 'S' || dir === 'W' ? -decimal : decimal;

  return isNaN(result) ? 0 : result;
}

interface SectorMapProps {
  rounds: RoundQuestion[];
  currentRound: number;
  roundsDone: boolean[];
  stage: string;
  visible: boolean;
  role?: 'runner' | 'solver';
  runnerName?: string;
  activeQuestion?: RoundQuestion | null;
}

type GeoStatus = 'idle' | 'watching' | 'denied' | 'unavailable';

export function SectorMap({ rounds, currentRound, activeQuestion, roundsDone, stage, visible, role = 'runner', runnerName = 'Operative' }: SectorMapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const runnerRingRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const prevRoundRef = useRef<number>(currentRound);
  const hasCenteredRef = useRef<boolean>(false);
  // shellRef: the React-managed wrapper div (in-page OR portalled)
  const shellRef = useRef<HTMLDivElement>(null);
  // leafletDivRef: the actual Leaflet container — created once, never unmounted by React
  const leafletDivRef = useRef<HTMLDivElement | null>(null);
  if (!leafletDivRef.current) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    leafletDivRef.current = d;
  }

  const toggleFullScreen = () => setIsFullScreen(prev => !prev);

  // Re-attach the imperative Leaflet div into whichever shell is current.
  // This runs after every render (portal toggle), keeping Leaflet alive.
  useEffect(() => {
    if (shellRef.current && leafletDivRef.current) {
      if (!shellRef.current.contains(leafletDivRef.current)) {
        shellRef.current.appendChild(leafletDivRef.current);
      }
    }
  });

  // Tell Leaflet to resize after fullscreen changes OR phone orientation change
  useEffect(() => {
    if (!mapInstance) return;
    const t1 = setTimeout(() => mapInstance.invalidateSize(), 150);
    const t2 = setTimeout(() => mapInstance.invalidateSize(), 400);

    const onOrientationChange = () => {
      // Delay to let the browser finish resizing its chrome
      setTimeout(() => mapInstance.invalidateSize(), 300);
    };
    window.addEventListener('orientationchange', onOrientationChange);
    window.addEventListener('resize', onOrientationChange);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('resize', onOrientationChange);
    };
  }, [isFullScreen, mapInstance]);


  const isRunnerStage = ['runner_travel', 'runner_game', 'runner_done', 'final_qr'].includes(stage);
  // Solver should see the current round even during p1_solve
  const visibleRoundIndex = (isRunnerStage || role === 'solver') ? currentRound : currentRound - 1;
  const current = activeQuestion || (visibleRoundIndex >= 0 ? rounds?.[Math.min(visibleRoundIndex, rounds.length - 1)] : null);

  const defaultLat = 15.4229;
  const defaultLng = 75.6162;

  const storageKeyPrefix = `quest_map_v1_${visibleRoundIndex}`;

  const [routeCoords, setRouteCoords] = useState<L.LatLngTuple[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKeyPrefix}_route`);
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return [];
  });

  const [runnerCoords, setRunnerCoords] = useState<[number, number, number, number | null] | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // Load state from localStorage on mount and when round changes
  useEffect(() => {
    try {
      const storedCoords = localStorage.getItem(`${storageKeyPrefix}_coords`);
      if (storedCoords) setRunnerCoords(JSON.parse(storedCoords));

      const storedRoute = localStorage.getItem(`${storageKeyPrefix}_route`);
      if (storedRoute) setRouteCoords(JSON.parse(storedRoute));
    } catch (e) {
      console.warn('Failed to load map state from localStorage', e);
    }
  }, [storageKeyPrefix]);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const { socket } = useSocket();

  const targetLat = current?.coord?.lat ? parseCoord(current.coord.lat) : null;
  const targetLng = current?.coord?.lng ? parseCoord(current.coord.lng) : null;
  const hasTarget = targetLat !== null && targetLng !== null;

  const startWatching = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    setGeoStatus('watching');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setRunnerCoords([latitude, longitude, accuracy, null]);
        if (socket && role === 'runner') {
          socket.emit('location:stream', { lat: latitude, lng: longitude, accuracy });
        }
      },
      (err) => {
        console.error('Geo Error:', err);
        if (err.code === 1) setGeoStatus('denied');
        else setGeoStatus('unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGeoStatus('idle');
  };

  useEffect(() => {
    if (role === 'solver') {
      const handleRunnerLocation = (data: any) => {
        setRunnerCoords([data.lat, data.lng, data.accuracy, data.heading]);
        setLastUpdateTime(Date.now());
      };
      socket?.on('runner:location', handleRunnerLocation);
      return () => { socket?.off('runner:location', handleRunnerLocation); };
    }
  }, [socket, role]);

  useEffect(() => {
    if (runnerCoords) {
      localStorage.setItem(`${storageKeyPrefix}_coords`, JSON.stringify(runnerCoords));
      if (role === 'runner') setLastUpdateTime(Date.now());
    }
  }, [runnerCoords, storageKeyPrefix, role]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (role === 'runner' && isRunnerStage) {
      cleanup = startWatching();
    } else {
      stopWatching();
    }
    return () => {
      stopWatching();
      if (cleanup) cleanup();
    };
  }, [role, isRunnerStage]);

  useEffect(() => {
    if (prevRoundRef.current === currentRound) return;

    // Cleanup storage for previous round
    localStorage.removeItem(`quest_map_v1_${prevRoundRef.current}_coords`);
    localStorage.removeItem(`quest_map_v1_${prevRoundRef.current}_route`);

    setRouteCoords([]);

    if (routeGlowRef.current && mapInstance) {
      mapInstance.removeLayer(routeGlowRef.current);
      routeGlowRef.current = null;
    }
    if (routeLayerRef.current && mapInstance) {
      mapInstance.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    hasCenteredRef.current = false;
    prevRoundRef.current = currentRound;
  }, [currentRound, current?.id, mapInstance]);

  useEffect(() => {
    if (mapInstance || !leafletDivRef.current) return;
    // Temporarily add to body so Leaflet can measure size;
    // the re-attach useEffect moves it into shellRef right after.
    if (!leafletDivRef.current.parentElement) {
      document.body.appendChild(leafletDivRef.current);
    }
    const map = L.map(leafletDivRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [defaultLat, defaultLng],
      zoom: 19,
      maxZoom: 22,
    });
    // Google Hybrid: satellite imagery + crisp labels, native up to zoom 21
    L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { subdomains: '0123', maxZoom: 22, maxNativeZoom: 21 }
    ).addTo(map);
    setMapInstance(map);
    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, []);

  useEffect(() => {
    if (mapInstance) {
      const t = setTimeout(() => {
        mapInstance.invalidateSize();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, isFullScreen, mapInstance]);

  const shouldShowTarget = isRunnerStage || role === 'solver';
  useEffect(() => {
    if (!mapInstance) return;
    if (targetMarkerRef.current) {
      mapInstance.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }
    if (hasTarget && shouldShowTarget && targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
      const icon = L.divIcon({
        className: 'target-marker',
        html: `
          <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
            <!-- Expanding Diamond Pulse -->
            <div style="
              position:absolute;width:20px;height:20px;
              border:1px solid var(--color-accent);
              transform:rotate(45deg);
              opacity:0;
              animation:diamond-ping 2s cubic-bezier(0, 0.4, 0.6, 1) infinite;"></div>
            
            <!-- Inner Glowing Diamond -->
            <div style="
              width:12px;height:12px;
              background:var(--color-accent);
              transform:rotate(45deg);
              box-shadow:0 0 15px var(--color-accent), 0 0 30px rgba(217, 31, 64, 0.3);
              z-index:2;
              animation:diamond-pulse 2s ease-in-out infinite;"></div>
            
            <style>
              @keyframes diamond-ping {
                0% { transform: rotate(45deg) scale(0.8); opacity: 0.8; }
                100% { transform: rotate(45deg) scale(2.2); opacity: 0; }
              }
              @keyframes diamond-pulse {
                0%, 100% { transform: rotate(45deg) scale(1); box-shadow: 0 0 15px var(--color-accent); }
                50% { transform: rotate(45deg) scale(1.2); box-shadow: 0 0 30px var(--color-accent); }
              }
            </style>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      targetMarkerRef.current = L.marker([targetLat, targetLng], { icon, zIndexOffset: 500 })
        .addTo(mapInstance)
        .bindPopup(`<b>${current?.coord?.place || 'Target'}</b>`);
      if (!runnerCoords && !hasCenteredRef.current) {
        mapInstance.setView([targetLat, targetLng], 19);
      }
    } else if (!runnerCoords && !hasCenteredRef.current && defaultLat !== null && defaultLng !== null) {
      mapInstance.setView([defaultLat, defaultLng], 17);
    }
  }, [mapInstance, hasTarget, isRunnerStage, role, targetLat, targetLng, runnerCoords]);

  useEffect(() => {
    if (!mapInstance || !runnerCoords) return;
    const [lat, lng, rawAccuracy] = runnerCoords;
    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) return;

    const accuracy = typeof rawAccuracy === 'number' && !isNaN(rawAccuracy) ? rawAccuracy : 0;
    const isAccurate = accuracy <= 100;
    const dotColor = isAccurate ? '#00BFFF' : '#4D8076';
    const ringRadius = Math.min(accuracy, 500);

    // ── MARKER CREATE / UPDATE ────────────────────────────────────────────
    if (!runnerMarkerRef.current) {
      const markerHtml = `
        <div style="width:56px;height:56px;position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:44px;height:44px;border-radius:50%;border:1.5px solid ${dotColor};opacity:0.2;"></div>
          <div style="position:relative;width:16px;height:16px;border-radius:50%;background:${dotColor};border:2.5px solid #fff;box-shadow:0 0 12px ${dotColor};z-index:2;"></div>
          <div style="position:absolute;width:16px;height:16px;border-radius:50%;background:${dotColor};opacity:0.35;animation:rmpulse 2s ease-out infinite;z-index:1;"></div>
        </div>
        <style>@keyframes rmpulse{0%{transform:scale(1);opacity:.35}70%{transform:scale(3);opacity:0}100%{transform:scale(3);opacity:0}}</style>
      `;
      const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [56, 56], iconAnchor: [28, 28] });
      runnerMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000, interactive: false }).addTo(mapInstance);
      runnerRingRef.current = L.circle([lat, lng], {
        radius: ringRadius, color: dotColor, fillColor: dotColor,
        fillOpacity: 0.06, weight: 1, dashArray: isAccurate ? undefined : '4 4', interactive: false,
      }).addTo(mapInstance);
    } else {
      // Just move — no DOM reconstruction
      runnerMarkerRef.current.setLatLng([lat, lng]);
      runnerRingRef.current?.setLatLng([lat, lng]);
      runnerRingRef.current?.setRadius(ringRadius);
    }

    // ── AUTO-CENTER (once per round) ──────────────────────────────────────────
    if (!hasCenteredRef.current) {
      if (accuracy < 1000) {
        if (hasTarget && targetLat !== null && targetLng !== null) {
          mapInstance.fitBounds(L.latLngBounds([[lat, lng], [targetLat, targetLng]]), { padding: [60, 60], maxZoom: 19 });
        } else {
          mapInstance.setView([lat, lng], accuracy < 200 ? 18 : 15);
        }
      } else if (hasTarget && targetLat !== null && targetLng !== null) {
        mapInstance.setView([targetLat, targetLng], 18);
      }
      hasCenteredRef.current = true;
    }
  }, [mapInstance, runnerCoords, hasTarget, targetLat, targetLng, routeCoords]);

  // Render the OSRM route
  useEffect(() => {
    if (!mapInstance) return;
    if (routeGlowRef.current) mapInstance.removeLayer(routeGlowRef.current);
    if (routeLayerRef.current) mapInstance.removeLayer(routeLayerRef.current);

    if (routeCoords && routeCoords.length > 1) {
      const validCoords = routeCoords.filter(c => c && !isNaN(c[0]) && !isNaN(c[1]));
      if (validCoords.length > 1) {
        routeGlowRef.current = L.polyline(validCoords, { color: '#00BFFF', weight: 12, opacity: 0.15, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(mapInstance);
        routeLayerRef.current = L.polyline(validCoords, { color: '#00BFFF', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(mapInstance);
      }
    }
  }, [mapInstance, routeCoords]);

  // Fetch new route from OSRM
  const lastRouteFetchRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!mapInstance || !runnerCoords || !hasTarget || targetLat === null || targetLng === null) return;
    const [rLat, rLng] = runnerCoords;

    // Only fetch if moved significantly (> 5m) or first time
    if (lastRouteFetchRef.current) {
      const dist = mapInstance.distance([rLat, rLng], lastRouteFetchRef.current);
      if (dist < 5 && routeCoords.length > 0) return;
    }

    const url = `https://router.project-osrm.org/route/v1/foot/${rLng},${rLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const rawCoords: L.LatLngTuple[] = data.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple) ?? [];
        if (rawCoords.length > 0) {
          const coords: L.LatLngTuple[] = [[rLat, rLng], ...rawCoords, [targetLat!, targetLng!]];
          setRouteCoords(coords);
          localStorage.setItem(`${storageKeyPrefix}_route`, JSON.stringify(coords));
          lastRouteFetchRef.current = [rLat, rLng];
        }
      })
      .catch(err => {
        console.warn('OSRM Route Fetch Error:', err);
      });
  }, [mapInstance, runnerCoords, hasTarget, targetLat, targetLng, storageKeyPrefix]);

  const navUrl = hasTarget
    ? runnerCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${runnerCoords[0]},${runnerCoords[1]}&destination=${targetLat},${targetLng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`
    : null;

  // The shell div — React renders it. The imperative Leaflet div lives inside it.
  // Normal: rendered in the page flow (scrolls naturally, no fixed positioning tricks)
  // Fullscreen: portalled to document.body so position:fixed escapes framer-motion transforms
  const getNavBottom = () => {
    const nav = document.querySelector('nav');
    return nav ? nav.getBoundingClientRect().bottom + 8 : 80;
  };

  const shell = (
    <div
      ref={shellRef}
      className={cn(
        'relative overflow-hidden',
        isFullScreen
          ? 'bg-black shadow-2xl border-t border-white/10'
          : 'w-full glass-morphism shadow-black-lg'
      )}
      style={isFullScreen
        ? { position: 'fixed', top: getNavBottom(), left: 0, right: 0, bottom: 0, zIndex: 9000 }
        : { height: '100%', minHeight: 'clamp(300px, 50dvh, 500px)' }}
    >
      {/* leafletDivRef is appended here imperatively by useEffect */}

      {/* Expand / Collapse (Only for solvers, runner map is already fullscreen overlay) */}
      {role !== 'runner' && (
        <button
          onClick={toggleFullScreen}
          className="absolute top-3 right-3 z-[1000] p-2 bg-black/70  border border-white/20 text-white hover:bg-white/10 transition-all clip-oct"
          aria-label={isFullScreen ? 'Collapse map' : 'Expand map'}
        >
          {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      )}

      {/* GPS */}
      {runnerCoords && (
        <div className="absolute bottom-3 left-3 z-[1000] px-2 py-1 bg-black/70  border border-white/10 clip-oct font-mono text-[9px] uppercase tracking-widest text-white/60">
          GPS ±{Math.round(runnerCoords[2])}m
        </div>
      )}

      {/* Recenter */}
      {isRunnerStage && runnerCoords && (
        <button
          onClick={() => { if (mapInstance) mapInstance.setView([runnerCoords[0], runnerCoords[1]], 18); }}
          className="absolute bottom-3 right-3 z-[1000] p-2 bg-black/70  border border-white/20 text-white hover:bg-white/10 transition-all clip-oct"
          title="Recenter"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      )}

      {/* GPS denied overlay */}
      {isRunnerStage && (geoStatus === 'denied' || geoStatus === 'unavailable') && (
        <div className="absolute inset-0 z-[1001] flex flex-col items-center justify-center bg-black/90  p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--color-accent)] mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-3">GPS Link Severed</h3>
          <button
            onClick={() => { setGeoStatus('idle'); startWatching(); }}
            className="px-4 py-2 bg-[var(--color-accent)] text-black font-bold text-[9px] uppercase tracking-widest hover:opacity-90 transition-all"
          >
            Restore Uplink
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Shell: fills all remaining height in flex column */}
      <div className="flex-1 min-h-0 relative">
        {isFullScreen ? createPortal(shell, document.body) : shell}
      </div>

      {role === 'runner' && navUrl && !isFullScreen && (
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center justify-center gap-2 sm:gap-3 w-full h-12 shrink-0 border-white/20 text-white hover:border-white hover:bg-white hover:text-black transition-all shadow-black-lg text-xs font-bold uppercase tracking-widest"
        >
          <Navigation className="h-4 w-4" />
          Navigate to Target
        </a>
      )}
    </div>
  );
}
