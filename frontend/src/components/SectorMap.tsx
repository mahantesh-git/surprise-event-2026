import { useState, useEffect, useRef } from 'react';
import { RoundQuestion } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
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
}

type GeoStatus = 'idle' | 'watching' | 'denied' | 'unavailable';

export function SectorMap({ rounds, currentRound, roundsDone, stage, visible, role = 'runner', runnerName = 'Operative' }: SectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const runnerRingRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const pathHistoryRef = useRef<L.LatLngTuple[]>([]);
  const pathLayerRef = useRef<L.Polyline | null>(null);
  const prevRoundRef = useRef<number>(currentRound);
  const hasCenteredRef = useRef<boolean>(false);

  const isRunnerStage = ['runner_travel', 'runner_game', 'runner_done', 'final_qr'].includes(stage);
  const visibleRoundIndex = isRunnerStage ? currentRound : currentRound - 1;
  const current = visibleRoundIndex >= 0 ? rounds?.[Math.min(visibleRoundIndex, rounds.length - 1)] : null;

  const defaultLat = 15.4229;
  const defaultLng = 75.6162;

  const storageKeyPrefix = `quest_map_v1_${currentRound}`;

  const [routeCoords, setRouteCoords] = useState<L.LatLngTuple[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKeyPrefix}_route`);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
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

      const storedHistory = localStorage.getItem(`${storageKeyPrefix}_history`);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        pathHistoryRef.current = Array.isArray(parsed) 
          ? parsed.filter(c => c && typeof c[0] === 'number' && !isNaN(c[0]) && typeof c[1] === 'number' && !isNaN(c[1]))
          : [];
      } else {
        pathHistoryRef.current = [];
      }
    } catch (e) {
      console.warn('Failed to load map state from localStorage', e);
      pathHistoryRef.current = [];
    }
  }, [storageKeyPrefix]);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [rotation, setRotation] = useState<number | null>(null);
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
        const { latitude, longitude, accuracy, heading } = pos.coords;
        setRunnerCoords([latitude, longitude, accuracy, heading]);
        if (socket && role === 'runner') {
          socket.emit('runner:location', { lat: latitude, lng: longitude, accuracy, heading });
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

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const webkitHeading = (e as any).webkitCompassHeading;
      if (webkitHeading !== undefined && webkitHeading !== null) {
        setRotation(webkitHeading);
      } else if (e.alpha !== null) {
        setRotation(360 - e.alpha);
      }
    };
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
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
    pathHistoryRef.current = [];
    localStorage.removeItem(`quest_map_v1_${prevRoundRef.current}_coords`);
    localStorage.removeItem(`quest_map_v1_${prevRoundRef.current}_history`);
    localStorage.removeItem(`quest_map_v1_${prevRoundRef.current}_route`);
    if (pathLayerRef.current && mapInstance) {
      mapInstance.removeLayer(pathLayerRef.current);
      pathLayerRef.current = null;
    }
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
  }, [currentRound, mapInstance]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstance) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [defaultLat, defaultLng],
      zoom: 17,
      maxZoom: 22,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 21,
      maxNativeZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);
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

  useEffect(() => {
    if (!mapInstance) return;
    if (targetMarkerRef.current) {
      mapInstance.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }
    if (hasTarget && isRunnerStage && targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
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
              animation:diamond-ping 2s cubic-bezier(0, 0.4, 0.6, 1) infinite;
            "></div>
            
            <!-- Inner Glowing Diamond -->
            <div style="
              width:12px;height:12px;
              background:var(--color-accent);
              transform:rotate(45deg);
              box-shadow:0 0 15px var(--color-accent), 0 0 30px rgba(217, 31, 64, 0.3);
              z-index:2;
              animation:diamond-pulse 2s ease-in-out infinite;
            "></div>
            
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
  }, [mapInstance, hasTarget, isRunnerStage, targetLat, targetLng, runnerCoords]);

  useEffect(() => {
    if (!mapInstance || !runnerCoords) return;
    const [lat, lng, rawAccuracy, heading] = runnerCoords;
    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
      console.warn('Invalid runner coordinates detected:', lat, lng);
      return;
    }
    const accuracy = typeof rawAccuracy === 'number' && !isNaN(rawAccuracy) ? rawAccuracy : 0;
    const finalRot = rotation !== null ? rotation : (heading !== null ? heading : null);
    const hasRealHeading = finalRot !== null;
    let targetBearing: number | null = null;
    if (!hasRealHeading && hasTarget && targetLat !== null && targetLng !== null) {
      let nextLat = targetLat;
      let nextLng = targetLng;
      if (routeCoords && routeCoords.length > 1) {
        for (let i = 1; i < routeCoords.length; i++) {
          nextLat = routeCoords[i][0];
          nextLng = routeCoords[i][1];
          const dY = (nextLat - lat) * 111000;
          const dX = (nextLng - lng) * 111000 * Math.cos(lat * Math.PI / 180);
          const dist = Math.sqrt(dX * dX + dY * dY);
          if (dist > 5) break;
        }
      }
      const dLng = (nextLng - lng) * (Math.PI / 180);
      const φ1 = lat * (Math.PI / 180);
      const φ2 = nextLat * (Math.PI / 180);
      const y = Math.sin(dLng) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
      targetBearing = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
    }
    const displayRot = finalRot ?? targetBearing;
    const hasAnyCone = displayRot !== null;
    const isAccurate = accuracy <= 100;
    const dotColor = isAccurate ? '#00BFFF' : '#4D8076';
    const ringRadius = Math.min(accuracy, 500);
    const coneColor = hasRealHeading ? dotColor : '#F59E0B';
    const coneLabel = hasRealHeading ? '' : `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:8px;font-family:monospace;color:#F59E0B;opacity:0.8;white-space:nowrap;letter-spacing:0.05em;">ALONG PATH</div>`;

    const markerHtml = `
      <div style="width:64px;height:64px;position:relative;display:flex;align-items:center;justify-content:center;">
        ${hasAnyCone ? `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(${displayRot}deg);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
              <path d="M32 32 L18 4 A30 30 0 0 1 46 4 Z" fill="${coneColor}" fill-opacity="0.18" />
              <path d="M32 32 L22 10 A14 14 0 0 1 42 10 Z" fill="${coneColor}" fill-opacity="${hasRealHeading ? '0.55' : '0.35'}" />
              <polygon points="32,3 26,15 38,15" fill="${coneColor}" opacity="0.95"/>
            </svg>
          </div>
          ${coneLabel}
        ` : `
          <div style="position:absolute;width:48px;height:48px;border-radius:50%;border:1.5px solid ${dotColor};opacity:0.25;"></div>
        `}
        <div style="position:relative;width:16px;height:16px;border-radius:50%;background:${dotColor};border:2.5px solid #ffffff;box-shadow:0 0 0 3px ${dotColor}40, 0 0 18px ${dotColor};z-index:2;"></div>
        <div style="position:absolute;width:16px;height:16px;border-radius:50%;background:${dotColor};opacity:0.4;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;z-index:1;"></div>
      </div>
      <style>@keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 70% { transform: scale(2.5); opacity: 0; } 100% { transform: scale(2.5); opacity: 0; } }</style>
    `;

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([lat, lng]);
      const el = runnerMarkerRef.current.getElement();
      if (el) el.innerHTML = markerHtml;
      runnerRingRef.current?.setLatLng([lat, lng]);
      runnerRingRef.current?.setRadius(ringRadius);
    } else {
      const runnerIcon = L.divIcon({ className: 'runner-location-marker', html: markerHtml, iconSize: [64, 64], iconAnchor: [32, 32] });
      runnerMarkerRef.current = L.marker([lat, lng], { icon: runnerIcon, zIndexOffset: 1000 })
        .addTo(mapInstance)
        .bindPopup(`📍 ${role === 'solver' ? (runnerName || 'Runner') : 'Your Location'}<br/><span style="font-size:11px;opacity:0.6">${isAccurate ? `±${Math.round(accuracy)}m` : 'Approximate'}</span>`);
      runnerRingRef.current = L.circle([lat, lng], { radius: ringRadius, color: dotColor, fillColor: dotColor, fillOpacity: 0.07, weight: 1, dashArray: isAccurate ? undefined : '5, 5' }).addTo(mapInstance);
    }

    const currentPos: L.LatLngTuple = [lat, lng];
    const lastPos = pathHistoryRef.current[pathHistoryRef.current.length - 1];
    
    // Safety check for distance calculation
    const isValidForPath = !isNaN(lat) && !isNaN(lng) && (!lastPos || (typeof lastPos[0] === 'number' && !isNaN(lastPos[0])));

    if (isValidForPath && (!lastPos || mapInstance.distance(currentPos, lastPos) > 2)) {
      pathHistoryRef.current.push(currentPos);
      if (pathHistoryRef.current.length > 1000) pathHistoryRef.current.shift();
      localStorage.setItem(`${storageKeyPrefix}_history`, JSON.stringify(pathHistoryRef.current));
    }
    if (pathLayerRef.current) {
      pathLayerRef.current.setLatLngs(pathHistoryRef.current);
    } else if (pathHistoryRef.current.length > 1) {
      pathLayerRef.current = L.polyline(pathHistoryRef.current, { color: '#ffffff', weight: 2, opacity: 0.4, dashArray: '5, 8', lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(mapInstance);
    }

    if (!hasCenteredRef.current) {
      if (accuracy < 1000) {
        if (hasTarget && targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
          mapInstance.fitBounds(L.latLngBounds([[lat, lng], [targetLat, targetLng]]), { padding: [60, 60], maxZoom: 19 });
        } else {
          mapInstance.setView([lat, lng], accuracy < 200 ? 18 : 15);
        }
      } else if (hasTarget && targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
        mapInstance.setView([targetLat, targetLng], 18);
      }
      hasCenteredRef.current = true;
    }
  }, [mapInstance, runnerCoords, rotation, hasTarget, targetLat, targetLng, routeCoords]);

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
  useEffect(() => {
    if (!mapInstance || !runnerCoords || !hasTarget || targetLat === null || targetLng === null) return;
    const [rLat, rLng] = runnerCoords;
    const url = `https://router.project-osrm.org/route/v1/foot/${rLng},${rLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
    
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const rawCoords: L.LatLngTuple[] = data.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple) ?? [];
        if (rawCoords.length > 0) {
          const coords: L.LatLngTuple[] = [[rLat, rLng], ...rawCoords, [targetLat!, targetLng!]];
          setRouteCoords(coords);
          localStorage.setItem(`${storageKeyPrefix}_route`, JSON.stringify(coords));
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

  return (
    <div className={isFullScreen ? "" : "space-y-3"}>
      {isFullScreen && (
        <style>{`
          body { overflow: hidden !important; }
          .corner-card { clip-path: none !important; transform: none !important; backdrop-filter: none !important; filter: none !important; }
          .reveal-up { transform: none !important; animation: none !important; backdrop-filter: none !important; filter: none !important; }
          .min-h-screen, #root { transform: none !important; contain: none !important; perspective: none !important; }
        `}</style>
      )}
      <div className={isFullScreen ? "fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md" : "relative w-full h-[360px] sm:h-[420px] glass-morphism corner-card overflow-hidden shadow-black-lg"}>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {isRunnerStage && (geoStatus === 'denied' || geoStatus === 'unavailable') && (
          <div className="absolute inset-0 z-[1001] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border border-[var(--color-accent)] animate-ping opacity-20" />
                  <div className="w-full h-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/50 flex items-center justify-center"><AlertCircle className="h-7 w-7 text-[var(--color-accent)]" /></div>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-accent)]">{geoStatus === 'denied' ? 'Location Access Denied' : 'GPS Unavailable'}</p>
                <h3 className="text-base font-bold uppercase tracking-widest text-white">Enable Location to Continue</h3>
              </div>
              <div className="space-y-2 text-[10px] font-mono text-white/60 border border-white/10 bg-white/5 p-4">
                <p className="text-white/40 uppercase tracking-widest text-[9px] mb-2">Fix Steps</p>
                <div className="flex gap-2.5"><span className="text-[var(--color-accent)] shrink-0">01.</span><span>Tap the <span className="text-white">🔒 lock icon</span> in browser</span></div>
                <div className="flex gap-2.5"><span className="text-[var(--color-accent)] shrink-0">02.</span><span>Allow Location Permissions</span></div>
              </div>
              <button onClick={() => { setGeoStatus('idle'); startWatching(); }} className="w-full h-11 bg-[var(--color-accent)] text-black font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-95"><LocateFixed className="h-4 w-4" />Retry Location Access</button>
            </div>
          </div>
        )}

        <button onClick={() => setIsFullScreen(!isFullScreen)} className={`absolute right-4 z-[1000] p-2 bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-colors shadow-black-lg clip-oct ${isFullScreen ? 'top-20 sm:top-24' : 'top-4'}`} aria-label="Toggle Fullscreen">
          {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>

        {hasTarget && (
          <div className="absolute top-4 left-4 z-[1000] p-3 bg-black/60 backdrop-blur-sm border border-white/10 shadow-black-lg pointer-events-none">
            <div className="grid grid-cols-1 gap-2">
              <div><span className="text-[8px] font-bold text-[var(--color-accent)] uppercase block leading-none mb-1 tracking-widest">TARGET_LAT</span><div className="font-mono text-[11px] text-white/90 tracking-tighter">{current?.coord?.lat ?? '---'}</div></div>
              <div className="pt-2 border-t border-white/5"><span className="text-[8px] font-bold text-[var(--color-accent)] uppercase block leading-none mb-1 tracking-widest">TARGET_LNG</span><div className="font-mono text-[11px] text-white/90 tracking-tighter">{current?.coord?.lng ?? '---'}</div></div>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center justify-between gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border-t border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            {runnerCoords && (() => {
              const [lat, lng, acc] = runnerCoords;
              const isGood = acc <= 100;
              const color = isGood ? '#00BFFF' : 'var(--color-accent)';
              const label = isGood ? `GPS ±${Math.round(acc)}m` : `~±${Math.round(acc)}m`;
              return (
                <>
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <div className="flex flex-col">
                      <span className="text-[7px] text-white/40 uppercase tracking-tighter leading-none mb-0.5">CURRENT_COORD</span>
                      <span className="font-mono text-[9px] text-white/90 tracking-tighter leading-none">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                    </div>
                  </div>
                  <span key="gps-status" className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest" style={{ color }}><LocateFixed className="h-3 w-3 animate-pulse shrink-0" />{label}</span>
                  {lastUpdateTime && (
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
                      Seen: {Math.floor((Date.now() - lastUpdateTime) / 1000)}s ago
                    </span>
                  )}
                </>
              );
            })()}
            {hasTarget && !runnerCoords && <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-white/60"><Navigation className="h-3 w-3 shrink-0" />Target Locked</span>}
          </div>

          {isRunnerStage && (
            <button onClick={() => { if (geoStatus !== 'watching') startWatching(); else if (mapInstance && runnerCoords) { const [lat, lng, accuracy] = runnerCoords; if (accuracy < 1000) { if (hasTarget && targetLat !== null && targetLng !== null) mapInstance.fitBounds(L.latLngBounds([[lat, lng], [targetLat, targetLng]]), { padding: [60, 60], maxZoom: 19 }); else mapInstance.setView([lat, lng], accuracy < 200 ? 18 : 15); } else if (targetLat !== null && targetLng !== null) mapInstance.setView([targetLat, targetLng], 18); } }} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/80 hover:text-white transition-colors active:scale-95 shrink-0">
              <LocateFixed className="h-3.5 w-3.5" />
              {geoStatus === 'watching' ? 'Recenter' : (role === 'solver' ? 'Locate Runner' : 'Locate Me')}
            </button>
          )}
        </div>
      </div>

      {role === 'runner' && navUrl && (
        <a href={navUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center justify-center gap-2 sm:gap-3 w-full h-14 border-white/20 text-white hover:border-white hover:bg-white hover:text-black transition-all"><Navigation className="h-4 w-4" />{runnerCoords ? 'Navigate to Target' : 'Explore Target Site'}<ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>
      )}

      {!isFullScreen && (
        <div className="p-4 glass-morphism border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Tactical Legend</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[var(--color-accent)]" style={{ boxShadow: '0 0 6px var(--color-accent)' }} />
                <span className="text-[9px] font-mono text-white/60 uppercase tracking-widest">Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00BFFF]" style={{ boxShadow: '0 0 6px #00BFFF' }} />
                <span className="text-[#00BFFF] font-mono text-[9px] uppercase tracking-widest">{runnerCoords ? (role === 'solver' ? (runnerName || 'Runner') : 'You (Live)') : 'GPS Pending...'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
