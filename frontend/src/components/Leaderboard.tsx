import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, Target, MapPin, Zap, ChevronRight, ChevronLeft, Maximize, Minimize, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/formatDuration';
import { getLeaderboard, getQuestions, LeaderboardTeam, RoundQuestion } from '@/lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { QuestLogo } from './QuestLogo';
import { useSocket } from '@/contexts/SocketContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function parseCoord(raw: string) {
  return parseFloat(raw.replace(/[°NSEWnsew\s]/g, ''));
}


function AnimatedScore({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;

    const start = prevValueRef.current;
    const end = value;
    const duration = 1500; // 1.5 seconds animation
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Linear interpolation for simple counting
      const current = Math.floor(start + (end - start) * progress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function MapView({ teams, questions, now }: { teams: LeaderboardTeam[], questions: RoundQuestion[], now: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // Initialize map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      maxZoom: 24,
    }).setView([15.4340, 75.6465], 18); // JT BCA Gadag Campus Center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'map-tiles grayscale invert opacity-50',
      maxZoom: 24,
      maxNativeZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    // Track resize events to fix Leaflet gray space bugs when changing sizes or fullscreen
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Silently update markers without clearing map, maintaining refs
  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup || !questions.length) return;

    teams.forEach((team) => {
      const runnerStages = ['runner_travel', 'runner_game', 'runner_done'];
      const isInField = runnerStages.includes(team.stage);

      let lat: number, lng: number, hasRealGps = false;

      // ✅ Priority 1: real GPS from the runner's device
      if (team.currentLat != null && team.currentLng != null) {
        lat = team.currentLat;
        lng = team.currentLng;
        hasRealGps = true;
      } else {
        // ✅ Priority 2: checkpoint location (last confirmed or current target)
        const locationIdx = Math.max(0, isInField ? team.round : team.round - 1);
        if (locationIdx >= questions.length) return;

        const question = questions[locationIdx];
        if (!question?.coord?.lat || !question?.coord?.lng) return;

        lat = parseCoord(question.coord.lat);
        lng = parseCoord(question.coord.lng);
        if (isNaN(lat) || isNaN(lng)) return;
      }

      const pulse = !team.finishTime && isInField && hasRealGps;
      const durStr = formatDuration(team.startTime, team.finishTime, now);
      const html = `
        <div class="team-marker-container" style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(0,-100%);margin-top:-6px;pointer-events:none;font-family:var(--font-mono);">
          <!-- Tooltip Container -->
          <div style="background:rgba(10,10,10,0.9);border:1px solid rgba(217, 31, 64, 0.4);padding:4px 10px;margin-bottom:8px;box-shadow:0 0 15px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;white-space:nowrap;backdrop-filter:blur(4px);clip-path:var(--clip-oct);">
             <span class="team-name" style="color:#fff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">${team.name}</span>
             <div style="display:flex;gap:12px;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:2px;">
               <span class="team-progress" style="color:var(--color-accent);font-size:9px;font-weight:bold;">${team.solvedCount}/${questions.length}</span>
               <span class="team-time" style="color:rgba(255,255,255,0.4);font-size:9px;">${durStr}</span>
             </div>
          </div>
          
          <!-- Diamond Marker -->
          <div style="position:relative;width:12px;height:12px;display:flex;align-items:center;justify-content:center;">
              <div class="team-direction" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(${team.currentHeading || 0}deg);transition:transform 0.15s linear;opacity:${team.currentHeading !== null ? 1 : 0};z-index:20;">
                <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
                  <!-- Outer glow cone -->
                  <path d="M32 32 L18 4 A30 30 0 0 1 46 4 Z" fill="var(--color-accent)" fill-opacity="0.18" />
                  <!-- Inner solid cone -->
                  <path d="M32 32 L22 10 A14 14 0 0 1 42 10 Z" fill="var(--color-accent)" fill-opacity="0.55" />
                  <!-- Arrowhead tip -->
                  <polygon points="32,3 26,15 38,15" fill="var(--color-accent)" opacity="0.95"/>
                </svg>
              </div>
              <div class="team-pulse" style="position:absolute;width:18px;height:18px;background:rgba(217, 31, 64, 0.3);clip-path:var(--clip-oct);filter:blur(4px);opacity:0.8;${pulse ? 'animation:marker-pulse 2s infinite' : ''}"></div>
               
              <!-- Tactical Help Pulse -->
              <div class="team-help-layer" style="position:absolute;width:32px;height:32px;display:${team.helpRequested ? 'block' : 'none'};pointer-events:none;">
                <div style="position:absolute;inset:0;border:2px solid var(--color-accent);clip-path:var(--clip-oct);animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;opacity:0.8;"></div>
                <div style="position:absolute;inset:10px;background:var(--color-accent);clip-path:var(--clip-oct);filter:blur(6px);animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
              </div>

              <!-- Success Ripple (Recent Validation) -->
              <div class="team-success-layer" style="position:absolute;width:48px;height:48px;display:none;pointer-events:none;align-items:center;justify-content:center;">
                <div style="position:absolute;inset:0;border:3px solid #10b981;clip-path:var(--clip-oct);animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;opacity:0.6;"></div>
                <div style="position:absolute;inset:8px;border:2px solid #34d399;clip-path:var(--clip-oct);animation:ping 2s cubic-bezier(0, 0, 0.2, 1) 0.5s infinite;opacity:0.4;"></div>
              </div>

              <div style="width:8px;height:8px;background:var(--color-accent);transform:rotate(45deg);border:1px solid #000;box-shadow:0 0 8px var(--color-accent);"></div>

              <!-- Handoff Layer (Runner Done) -->
              <div class="team-handoff-layer" style="position:absolute;width:80px;height:80px;display:${team.stage === 'runner_done' ? 'flex' : 'none'};pointer-events:none;align-items:center;justify-content:center;z-index:0;">
                <div style="position:absolute;inset:0;border:3px solid #10b981;clip-path:var(--clip-oct);animation:marker-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;opacity:0.8;box-shadow: 0 0 15px #10b981;"></div>
                <div style="position:absolute;inset:15px;background:#10b981;clip-path:var(--clip-oct);filter:blur(12px);opacity:0.4;animation:marker-pulse 2s infinite;"></div>
              </div>
              <style>
                @keyframes marker-ping {
                  0% { transform: scale(1); opacity: 0.6; }
                  70%, 100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes marker-pulse {
                  0%, 100% { transform: scale(1); opacity: 0.3; }
                  50% { transform: scale(1.15); opacity: 0.5; }
                }
              </style>
           </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'bg-transparent border-none', iconSize: [0, 0] });

      if (markersRef.current[team.id]) {
        const m = markersRef.current[team.id];
        m.setLatLng([lat, lng]);

        const el = m.getElement();
        if (el) {
          const nameEl = el.querySelector('.team-name');
          const progressEl = el.querySelector('.team-progress');
          const timeEl = el.querySelector('.team-time');
          const dirEl = el.querySelector('.team-direction') as HTMLElement;
          const pulseEl = el.querySelector('.team-pulse') as HTMLElement;
          const helpEl = el.querySelector('.team-help-layer') as HTMLElement;
          const successEl = el.querySelector('.team-success-layer') as HTMLElement;
          const handoffEl = el.querySelector('.team-handoff-layer') as HTMLElement;

          if (nameEl) nameEl.textContent = team.name;
          if (progressEl) progressEl.textContent = `${team.solvedCount}/${questions.length}`;
          if (timeEl) timeEl.textContent = durStr;

          if (handoffEl) {
            handoffEl.style.display = team.stage === 'runner_done' ? 'flex' : 'none';
          }

          if (dirEl) {
            if (team.currentHeading !== null) {
              dirEl.style.opacity = '1';
              const prevRot = (dirEl as any)._lastRot || 0;
              let diff = team.currentHeading - (prevRot % 360);
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              const newRot = prevRot + diff;
              (dirEl as any)._lastRot = newRot;
              dirEl.style.transform = `rotate(${newRot}deg)`;
            } else {
              dirEl.style.opacity = '0';
            }
          }

          if (pulseEl) {
            pulseEl.style.animation = pulse ? 'marker-pulse 2s infinite' : 'none';
          }

          if (helpEl) {
            helpEl.style.display = team.helpRequested ? 'block' : 'none';
          }

          if (successEl) {
            const validatedAt = team.lastValidatedAt ? new Date(team.lastValidatedAt).getTime() : 0;
            const diff = now - validatedAt;
            const isRecentSuccess = validatedAt > 0 && diff > 0 && diff < 15000;
            successEl.style.display = isRecentSuccess ? 'flex' : 'none';
          }
        }
      } else {
        const m = L.marker([lat, lng], { icon, interactive: false }).addTo(layerGroup);
        markersRef.current[team.id] = m;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!teams.find(t => t.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [teams, questions, now]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-white/[0.03]" />;
}

export function Leaderboard() {
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isListVisible, setIsListVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBoard = async () => {
    try {
      const [ldbRes, qRes] = await Promise.all([
        getLeaderboard().catch(() => ({ leaderboard: [] })),
        getQuestions().catch(() => ({ questions: [] }))
      ]);

      const boardArr: LeaderboardTeam[] = ldbRes?.leaderboard || [];
      const questionsArray = qRes?.questions || (Array.isArray(qRes) ? qRes : []);

      const currentNow = Date.now();
      const sorted = [...boardArr].sort((a, b) => {
        if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
        const aStart = a.startTime ? new Date(a.startTime).getTime() : currentNow;
        const aEnd = a.finishTime ? new Date(a.finishTime).getTime() : currentNow;
        const bStart = b.startTime ? new Date(b.startTime).getTime() : currentNow;
        const bEnd = b.finishTime ? new Date(b.finishTime).getTime() : currentNow;
        return (aEnd - aStart) - (bEnd - bStart);
      });

      // Merge REST data with existing WS-updated position fields.
      // The REST response comes from MongoDB which is intentionally throttled
      // (writes every 2 s), so we must NOT overwrite currentLat/currentLng/
      // currentHeading — those are kept fresh by live WebSocket events.
      setTeams(prev => {
        const prevMap = new Map(prev.map(t => [t.id, t]));
        return sorted.map(restTeam => {
          const live = prevMap.get(restTeam.id);
          if (!live) return restTeam; // first load — no WS data yet
          return {
            ...restTeam,                               // REST wins for score/stage/round
            currentLat:     live.currentLat,           // WS wins for live position
            currentLng:     live.currentLng,
            currentHeading: live.currentHeading,
          };
        });
      });
      setQuestions(questionsArray);
    } catch {
      setTeams([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };


  // ── Socket: live GPS position updates ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleRunnerLocation = (data: {
      teamId: string; lat: number; lng: number;
      heading: number | null; timestamp: number;
    }) => {
      setTeams(prev => prev.map(t => {
        if (t.id === data.teamId) {
          let newHeading = data.heading;
          if (newHeading !== null && t.currentHeading !== null) {
            let diff = newHeading - (t.currentHeading % 360);
            diff = ((diff + 540) % 360) - 180;
            newHeading = t.currentHeading + diff;
          }
          return { ...t, currentLat: data.lat, currentLng: data.lng, currentHeading: newHeading };
        }
        return t;
      }));
    };

    // ── Socket: full leaderboard sync (score/stage changes) ─────────────────
    const handleLeaderboardUpdate = (data: { leaderboard: LeaderboardTeam[] }) => {
      const currentNow = Date.now();
      const sorted = [...data.leaderboard].sort((a, b) => {
        if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
        const aStart = a.startTime ? new Date(a.startTime).getTime() : currentNow;
        const aEnd = a.finishTime ? new Date(a.finishTime).getTime() : currentNow;
        const bStart = b.startTime ? new Date(b.startTime).getTime() : currentNow;
        const bEnd = b.finishTime ? new Date(b.finishTime).getTime() : currentNow;
        return (aEnd - aStart) - (bEnd - bStart);
      });
      setTeams(sorted);
    };

    socket.on('runner:location', handleRunnerLocation);
    socket.on('leaderboard:update', handleLeaderboardUpdate);

    return () => {
      socket.off('runner:location', handleRunnerLocation);
      socket.off('leaderboard:update', handleLeaderboardUpdate);
    };
  }, [socket]);

  // ── REST polling (5s fallback — keeps data fresh if WS drops) ────────────
  useEffect(() => {
    fetchBoard();
    const intv = setInterval(fetchBoard, 5000);
    return () => clearInterval(intv);
  }, []);

  if (loading) return <div className="text-white/80 text-[10px] tracking-widest uppercase p-12 text-center font-mono">Standby for Satellite Uplink...</div>;

  return (
    <div ref={rootRef} className={`relative w-full overflow-hidden ${isFullscreen ? 'h-screen border-none' : 'h-full corner-card p-0 border border-white/10'}`}>
      {questions.length > 0 ? <MapView teams={teams} questions={questions} now={now} /> : <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-mono tracking-widest z-0">No Rounds Configured</div>}

      <div
        className={`absolute top-4 flex flex-col h-[calc(100%-2rem)] max-h-[700px] z-20 transition-all duration-300 ${isListVisible ? 'w-[360px] max-w-[calc(100%-2rem)] corner-card border border-white/10 shadow-2xl glass-morphism' : 'w-auto'}`}
        style={{ right: '1rem', left: 'auto' }}
      >
        {isListVisible ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[var(--color-accent)]" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">Leaderboard</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 border border-[var(--color-accent)]/20 animate-pulse">LIVE</span>
                <button onClick={toggleFullscreen} className="text-white/40 hover:text-white transition-colors">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}</button>
                <button onClick={() => setIsListVisible(false)} className="text-white/40 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
              {teams.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "corner-card glass-morphism-dark p-3 relative group transition-all duration-500",
                    t.stage === 'runner_done' && "ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  )}
                >
                  {t.stage === 'runner_done' && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-emerald-500 text-[7px] font-black text-black rounded-sm tracking-tighter uppercase">Runner Handoff</div>
                  )}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 text-3xl font-black italic select-none font-space-grotesk group-hover:opacity-20 group-hover:text-[var(--color-accent)] transition-all">#{idx + 1}</div>
                  <div className="pr-12 relative z-10 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--color-accent)] truncate">{t.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-white/70 uppercase tracking-widest font-mono">
                        <span className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-0.5"><Clock className="w-3 h-3 text-[var(--color-accent)]/50" /> {formatDuration(t.startTime, t.finishTime, now)}</span>
                        {t.difficultyTier === 'hard' && (
                          <span className="flex items-center gap-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 border border-[var(--color-accent)]/20 animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> HARD
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-black text-white/90 font-mono tracking-tighter"><AnimatedScore value={(t as any).score || 0} /></div>
                      <div className="text-[7px] text-white/30 font-black uppercase tracking-[0.2em]">Credits</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="absolute right-2 top-2 flex flex-col gap-2">
            <button onClick={toggleFullscreen} className="bg-black/60 border border-white/10 text-white/50 p-3 clip-oct backdrop-blur-xl hover:text-white transition-all">{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button>
            <button onClick={() => setIsListVisible(true)} className="bg-black/60 border border-[var(--color-accent)]/30 text-[var(--color-accent)] p-3 clip-oct backdrop-blur-xl hover:bg-[var(--color-accent)]/10 transition-all"><Trophy className="w-5 h-5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
