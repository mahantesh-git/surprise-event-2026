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
  const hasCenteredRef = useRef<boolean>(false);

  const isComplete = stage === 'complete';
  const isRunnerStage = ['runner_travel', 'runner_game', 'runner_done'].includes(stage);

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
    const [lat, lng, accuracy] = runnerCoords;

    // Accurate GPS < 100m → bright cyan; IP-based / poor → dimmer
    const isAccurate = accuracy <= 100;
    const dotColor = isAccurate ? '#00BFFF' : '#4D8076';
    const ringRadius = Math.min(accuracy, 500); // cap display radius at 500m

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([lat, lng]);
      const el = runnerMarkerRef.current.getElement();
      if (el) {
        el.innerHTML = `<div class="w-5 h-5 rounded-full border-2 border-white relative" style="background-color: ${dotColor}; box-shadow: 0 0 15px ${dotColor}">
                          <div class="absolute inset-0 rounded-full animate-ping bg-${isAccurate ? 'cyan-400' : 'slate-400'} opacity-40"></div>
                        </div>`;
      }
      runnerRingRef.current?.setLatLng([lat, lng]);
      runnerRingRef.current?.setRadius(ringRadius);
    } else {
      // Create a solid HTML marker for the runner
      const runnerIcon = L.divIcon({
        className: 'runner-location-marker',
        html: `<div class="w-5 h-5 rounded-full border-2 border-white relative" style="background-color: ${dotColor}; box-shadow: 0 0 15px ${dotColor}">
                <div class="absolute inset-0 rounded-full animate-ping" style="background-color: ${dotColor}; opacity: 0.5;"></div>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      runnerMarkerRef.current = L.marker([lat, lng], { icon: runnerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`📍 Your Location<br/><span style="font-size:11px;opacity:0.6">${isAccurate ? `±${Math.round(accuracy)}m` : 'Approximate'}</span>`);

      // Accuracy ring sized to real accuracy
      runnerRingRef.current = L.circle([lat, lng], {
        radius: ringRadius,
        color: dotColor,
        fillColor: dotColor,
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: isAccurate ? undefined : '5, 5',
      }).addTo(map);
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
            color: 'var(--color-accent)',
            weight: 5,
            opacity: 0.9,
            dashArray: '12, 8',
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
          { color: 'var(--color-accent)', weight: 4, opacity: 0.7, dashArray: '8, 10' }
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
      <div className="relative w-full h-[260px] sm:h-[320px] border border-[var(--color-accent)]/40 bg-[var(--color-bg-void)] corner-card overflow-hidden shadow-accent-lg">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1 pointer-events-none">
          {runnerCoords && (() => {
            const acc = runnerCoords[2];
            const isGood = acc <= 100;
            const color = isGood ? '#00BFFF' : '#EE3A17';
            const label = isGood ? `GPS ±${Math.round(acc)}m` : `Approx ±${Math.round(acc)}m`;
            return (
              <div
                className="bg-black/90 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest border backdrop-blur-sm"
                style={{ borderColor: `${color}88`, color }}
              >
                <LocateFixed className="h-3 w-3 animate-pulse" />
                {label}
              </div>
            );
          })()}
          {hasTarget && (
            <div className="bg-black/90 border border-[var(--color-accent)]/60 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[var(--color-accent)] backdrop-blur-sm shadow-accent-xs">
              <Navigation className="h-3 w-3" />
              Target Locked
            </div>
          )}
        </div>

        {/* Locate Me / Recenter button (manual trigger) */}
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
            className="absolute bottom-3 right-3 z-[1000] bg-black/90 border border-[#EE3A17]/60 px-2 sm:px-3 py-2 flex items-center gap-1.5 sm:gap-2 font-mono text-[9px] uppercase tracking-[0.12em] sm:tracking-widest text-[#EE3A17] hover:bg-[#EE3A17]/20 transition-all pointer-events-auto backdrop-blur-sm shadow-accent-sm active:scale-95"
          >
            <LocateFixed className="h-4 w-4" />
            {geoStatus === 'watching' ? 'Recenter' : 'Locate Me'}
          </button>
        )}

        {/* Geo error */}
        {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-black/90 border border-[var(--color-accent)]/20 px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[var(--color-accent)] pointer-events-none backdrop-blur-sm">
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
          rel="noopener noreferrer btn-primary flex items-center justify-center gap-2 sm:gap-3 w-full h-14"
        >
          <Navigation className="h-4 w-4" />
          {runnerCoords ? 'Navigate to Target' : 'Explore Target Site'}
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-3 border-t border-white/5 bg-black/20 text-[9px] font-mono uppercase tracking-widest">
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
    </div>
  );
}
