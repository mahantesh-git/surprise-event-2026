import { useState, useEffect, useRef } from 'react';
import { RoundQuestion } from '@/lib/api';
import { Navigation, ExternalLink, LocateFixed, AlertCircle } from 'lucide-react';
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
  return parseFloat(raw.replace(/[°NSEW\s]/g, ''));
}

interface SectorMapProps {
  rounds: RoundQuestion[];
  currentRound: number;
  roundsDone: boolean[];
  stage: string;
}

type GeoStatus = 'idle' | 'watching' | 'denied' | 'unavailable';

export function SectorMap({ rounds, currentRound, stage }: SectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const runnerRingRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const isComplete = stage === 'complete';
  const isRunnerStage = ['p2_travel', 'p2_scan', 'p2_solve', 'p2_solved'].includes(stage);

  const visibleRoundIndex = isRunnerStage ? currentRound : currentRound - 1;
  const current = visibleRoundIndex >= 0 ? rounds?.[Math.min(visibleRoundIndex, rounds.length - 1)] : null;

  const [runnerCoords, setRunnerCoords] = useState<[number, number, number] | null>(null);
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
        setRunnerCoords([pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy]);
      },
      (err) => {
        console.warn('Geo error:', err.message);
        setGeoStatus(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Auto-start watching when runner's turn
  useEffect(() => {
    if (isRunnerStage) {
      startWatching();
    } else {
      stopWatching();
    }
    return stopWatching;
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
      { maxZoom: 21, subdomains: 'abcd' }
    ).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

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
        className: '',
        html: `<div style="
          width:28px;height:28px;
          background:#95FF00;
          border:3px solid #000;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 0 14px #95FF00,0 0 28px #95FF0055;
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      targetMarkerRef.current = L.marker([targetLat, targetLng], { icon })
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
    const [lat, lng, accuracy] = runnerCoords;

    // Accurate GPS < 100m → bright cyan; IP-based / poor → dimmer
    const isAccurate = accuracy <= 100;
    const dotColor   = isAccurate ? '#00BFFF' : '#6699CC';
    const ringRadius = Math.min(accuracy, 500); // cap display radius at 500m

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([lat, lng]);
      const el = runnerMarkerRef.current.getElement();
      if (el) {
        el.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-black" style="background-color: ${dotColor}; box-shadow: 0 0 15px ${dotColor}"></div>`;
      }
      runnerRingRef.current?.setLatLng([lat, lng]);
      runnerRingRef.current?.setRadius(ringRadius);
    } else {
      // Create a solid HTML marker for the runner
      const runnerIcon = L.divIcon({
        className: 'runner-location-marker',
        html: `<div class="w-4 h-4 rounded-full border-2 border-black relative" style="background-color: ${dotColor}; box-shadow: 0 0 15px ${dotColor}">
                <div class="absolute inset-0 rounded-full animate-ping" style="background-color: ${dotColor}; opacity: 0.5;"></div>
               </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      runnerMarkerRef.current = L.marker([lat, lng], { icon: runnerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`📍 Your Location<br/><span style="font-size:11px;opacity:0.6">${isAccurate ? `±${Math.round(accuracy)}m` : 'Approximate'}</span>`);

      // Accuracy ring sized to real accuracy
      runnerRingRef.current = L.circle([lat, lng], {
        radius: ringRadius,
        color: dotColor,
        fillColor: dotColor,
        fillOpacity: 0.08,
        weight: 1,
        dashArray: isAccurate ? undefined : '4,4',
      }).addTo(map);
    }

    // If the browser falls back to IP geolocation (e.g., PC testing), accuracy will be > 5000m.
    // We don't want to zoom out 400km to show both Bangalore (IP) and the Hubli Campus.
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
  }, [runnerCoords, hasTarget, targetLat, targetLng]);

  // ── Draw walking route via OSRM ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !runnerCoords || !hasTarget || targetLat === null || targetLng === null) return;

    const [rLat, rLng] = runnerCoords;
    const url =
      `https://router.project-osrm.org/route/v1/foot/${rLng},${rLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!mapRef.current) return;
        const coords: L.LatLngTuple[] =
          data.routes?.[0]?.geometry?.coordinates?.map(
            ([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple
          ) ?? [];

        // Remove old route
        if (routeLayerRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }

        if (coords.length > 0) {
          routeLayerRef.current = L.polyline(coords, {
            color: '#95FF00',
            weight: 4,
            opacity: 0.85,
            dashArray: '10, 6',
          }).addTo(mapRef.current);
        }
      })
      .catch(() => {
        // Fallback: straight dashed line
        const map = mapRef.current;
        if (!map) return;
        if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); }
        routeLayerRef.current = L.polyline(
          [[rLat, rLng], [targetLat!, targetLng!]],
          { color: '#95FF00', weight: 3, opacity: 0.6, dashArray: '6, 8' }
        ).addTo(map);
      });
  }, [runnerCoords, hasTarget, targetLat, targetLng]);

  const navUrl = hasTarget
    ? runnerCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${runnerCoords[0]},${runnerCoords[1]}&destination=${targetLat},${targetLng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`
    : null;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative w-full border border-[#95FF00]/20 bg-[#15171A] corner-card overflow-hidden" style={{ height: 300 }}>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1 pointer-events-none">
          {runnerCoords && (() => {
            const acc = runnerCoords[2];
            const isGood = acc <= 100;
            const color = isGood ? '#00BFFF' : '#FFAA00';
            const label = isGood ? `GPS ±${Math.round(acc)}m` : `Approx ±${Math.round(acc)}m`;
            return (
              <div
                className="bg-black/80 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest border"
                style={{ borderColor: `${color}66`, color }}
              >
                <LocateFixed className="h-3 w-3 animate-pulse" />
                {label}
              </div>
            );
          })()}
          {hasTarget && (
            <div className="bg-black/80 border border-[#95FF00]/40 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#95FF00]">
              <Navigation className="h-3 w-3" />
              Target Locked
            </div>
          )}
        </div>

        {/* Locate Me button (manual trigger) */}
        {isRunnerStage && geoStatus !== 'watching' && (
          <button
            onClick={startWatching}
            className="absolute bottom-3 right-3 z-[1000] bg-black/80 border border-[#00BFFF]/40 px-3 py-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[#00BFFF] hover:bg-[#00BFFF]/10 transition-colors pointer-events-auto"
          >
            <LocateFixed className="h-3 w-3" />
            Locate Me
          </button>
        )}

        {/* Geo error */}
        {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-black/80 border border-red-500/40 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-red-400 pointer-events-none">
            <AlertCircle className="h-3 w-3" />
            {geoStatus === 'denied' ? 'Location denied — enable in browser' : 'GPS unavailable'}
          </div>
        )}
      </div>

      {/* Navigate button */}
      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 border border-[#95FF00]/40 bg-[#95FF00]/10 text-[#95FF00] font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-[#95FF00]/20 transition-colors"
        >
          <Navigation className="h-4 w-4" />
          {runnerCoords ? 'Navigate to Target' : 'Open in Maps'}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-3 border-t border-white/5 bg-black/20 text-[9px] font-mono uppercase tracking-widest">
        {isRunnerStage ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#95FF00] shadow-[0_0_6px_#95FF00]" />
              <span className="text-[#95FF00]">Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00BFFF] shadow-[0_0_6px_#00BFFF]" />
              <span className="text-[#00BFFF]">{runnerCoords ? 'You (Live)' : 'GPS Pending...'}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-yellow-500/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 animate-pulse" />
            </div>
            <span className="text-yellow-500/80">Awaiting Target Coordinates</span>
          </div>
        )}
      </div>
    </div>
  );
}
