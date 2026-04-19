import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, Target, MapPin, Zap, ChevronRight, ChevronLeft, Maximize, Minimize } from 'lucide-react';
import { getLeaderboard, getQuestions, LeaderboardTeam, RoundQuestion } from '@/lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function parseCoord(raw: string) {
  return parseFloat(raw.replace(/[°NSEWnsew\s]/g, ''));
}

export function formatDuration(start: string | null, finish: string | null, now: number) {
  if (!start) return '--:--:--';
  const s = new Date(start).getTime();
  const e = finish ? new Date(finish).getTime() : now;
  const elapsed = Math.max(0, Math.floor((e - s) / 1000));
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const sec = (elapsed % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
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
    }).setView([15.4340, 75.6465], 17); // JT BCA Gadag Campus Center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'map-tiles grayscale invert opacity-50',
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
        const locationIdx = isInField ? team.round : team.round - 1;
        if (locationIdx < 0 || locationIdx >= questions.length) return;

        const question = questions[locationIdx];
        if (!question?.coord?.lat || !question?.coord?.lng) return;

        lat = parseCoord(question.coord.lat);
        lng = parseCoord(question.coord.lng);
        if (isNaN(lat) || isNaN(lng)) return;
      }

      const pulse = !team.finishTime && isInField && hasRealGps;
      const color = hasRealGps ? 'rgba(238, 58, 23, 0.9)' : 'rgba(238, 58, 23, 0.5)';
      const durStr = formatDuration(team.startTime, team.finishTime, now);

      const html = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(0,-100%);margin-top:-6px;pointer-events:none;font-family:var(--font-mono);">
          <!-- Tooltip Container -->
          <div style="background:rgba(10,10,10,0.9);border:1px solid rgba(238, 58, 23, 0.4);padding:4px 10px;margin-bottom:8px;box-shadow:0 0 15px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;white-space:nowrap;backdrop-filter:blur(4px);border-radius:2px;">
             <span style="color:#fff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">${team.name}</span>
             <div style="display:flex;gap:12px;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:2px;">
               <span style="color:var(--color-accent);font-size:9px;font-weight:bold;">${team.solvedCount}/${questions.length}</span>
               <span style="color:rgba(255,255,255,0.4);font-size:9px;">${durStr}</span>
             </div>
          </div>
          
          <!-- Diamond Marker -->
          <div style="position:relative;width:12px;height:12px;display:flex;align-items:center;justify-content:center;">
             ${team.currentHeading !== null ? `
               <div style="position:absolute;width:32px;height:32px;display:flex;align-items:center;justify-content:center;transform:rotate(${team.currentHeading}deg);transition:transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 0L16 10H8L12 0Z" fill="var(--color-accent)" fill-opacity="0.7" />
                 </svg>
               </div>
             ` : ''}
             <div style="position:absolute;width:18px;height:18px;background:rgba(238, 58, 23, 0.3);border-radius:50%;filter:blur(4px);opacity:0.8;${pulse ? 'animation:marker-pulse 2s infinite' : ''}"></div>
             <div style="width:8px;height:8px;background:var(--color-accent);transform:rotate(45deg);border:1px solid #000;box-shadow:0 0 8px var(--color-accent);"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'bg-transparent border-none', iconSize: [0, 0] });

      if (markersRef.current[team.id]) {
        // Update existing marker
        const m = markersRef.current[team.id];
        m.setLatLng([lat, lng]);
        m.setIcon(icon);
      } else {
        // Add new marker
        const m = L.marker([lat, lng], { icon, interactive: false }).addTo(layerGroup);
        markersRef.current[team.id] = m;
      }
    });

    // Cleanup stale markers if teams are deleted
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

      const boardArr = ldbRes?.leaderboard || [];
      const questionsArray = qRes?.questions || (Array.isArray(qRes) ? qRes : []);

      // Sort logic explicitly mapping: solved count DESC, then time taken ASC
      const currentNow = Date.now();
      const sorted = [...boardArr].sort((a, b) => {
        if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;

        // Handle runtime
        const aStart = a.startTime ? new Date(a.startTime).getTime() : currentNow;
        const aEnd = a.finishTime ? new Date(a.finishTime).getTime() : currentNow;
        const aElapsed = aEnd - aStart;

        const bStart = b.startTime ? new Date(b.startTime).getTime() : currentNow;
        const bEnd = b.finishTime ? new Date(b.finishTime).getTime() : currentNow;
        const bElapsed = bEnd - bStart;

        return aElapsed - bElapsed;
      });

      setTeams(sorted);
      setQuestions(questionsArray);
    } catch {
      setTeams([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    const intv = setInterval(fetchBoard, 2000);
    return () => clearInterval(intv);
  }, []);

  if (loading) return <div className="text-white/50 text-[10px] tracking-widest uppercase p-12 text-center">Loading Data Link...</div>;

  return (
    <div ref={rootRef} className={`relative w-full overflow-hidden ${isFullscreen ? 'h-screen rounded-none border-none' : 'h-[calc(100vh-120px)] min-h-[420px] sm:h-[calc(100vh-140px)] sm:min-h-[500px] rounded-xl border border-white/10'}`}>
      {/* Full Screen Map View */}
      {questions.length > 0 ? <MapView teams={teams} questions={questions} now={now} /> : <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-mono tracking-widest z-0">No Rounds Configured</div>}

      <div 
        className={`absolute top-4 flex flex-col h-[calc(100%-2rem)] max-h-[700px] z-20 transition-all duration-300 ${isListVisible ? 'w-[360px] max-w-[calc(100%-2rem)] corner-card border border-white/10 shadow-2xl glass-morphism' : 'w-auto'}`}
        style={{ right: '1rem', left: 'auto' }}
      >
        {isListVisible ? (
          <>
            <div className="px-3 sm:px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[var(--color-accent-fill)]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--color-accent)]" />
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/80">Leaderboard</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 border border-[var(--color-accent)]/20">LIVE</span>

                <button
                  onClick={toggleFullscreen}
                  className="text-white/40 hover:text-white transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsListVisible(false)}
                  className="text-white/40 hover:text-white transition-colors"
                  title="Hide Leaderboard"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 scrollbar-hide">
              {teams.length === 0 ? (
                <div className="text-center p-8 text-white/30 text-[10px] tracking-widest uppercase font-mono">Standby for Teams...</div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.08 }
                    }
                  }}
                  className="flex flex-col gap-2"
                >
                  {teams.map((t, idx) => (
                    <motion.div
                      key={t.id}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: { opacity: 1, x: 0, transition: { ease: [0.87, 0, 0.13, 1], duration: 0.6 } }
                      }}
                      className="corner-card glass-morphism-dark p-3 relative group transition-colors hover:border-[var(--color-accent)]/20 overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 text-3xl font-black italic select-none font-space-grotesk group-hover:opacity-20 group-hover:text-[var(--color-accent)] transition-all">
                        #{idx + 1}
                      </div>
                      <div className="pr-12 relative z-10">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--color-accent)] truncate">{t.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[10px] text-white/50 uppercase tracking-widest font-mono">
                          <span className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-0.5"><Target className="w-3 h-3 text-[var(--color-accent)]/50" /> {t.solvedCount}/{questions.length}</span>
                          <span className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-0.5"><Clock className="w-3 h-3 text-[var(--color-accent)]/50" /> {formatDuration(t.startTime, t.finishTime, now)}</span>
                        </div>
                        {t.finishTime && <div className="mt-3 text-[var(--color-accent)] font-bold text-[9px] uppercase tracking-[0.2em] flex items-center gap-1"><Zap className="w-3 h-3" /> Deployment Complete</div>}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div className="absolute right-2 top-2 sm:right-0 sm:top-0 flex flex-col gap-2">
            <button
              onClick={toggleFullscreen}
              className="bg-white/[0.03] border border-white/10 text-white/50 p-3 rounded shadow-black-sm backdrop-blur-xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center group pointer-events-auto"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            </button>
            <button
              onClick={() => setIsListVisible(true)}
              className="bg-white/[0.03] border border-[var(--color-accent)]/30 text-[var(--color-accent)] p-3 rounded shadow-black-md backdrop-blur-xl hover:bg-[var(--color-accent)]/10 transition-all flex items-center justify-center group pointer-events-auto"
              title="Show Leaderboard"
            >
              <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
