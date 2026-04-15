import { useState, useEffect, useRef } from 'react';
import { Trophy, Clock, Target, MapPin, ChevronRight, ChevronLeft, Maximize, Minimize } from 'lucide-react';
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
      const color = hasRealGps ? 'rgba(149,255,0,0.9)' : 'rgba(149,255,0,0.5)';
      const durStr = formatDuration(team.startTime, team.finishTime, now);

      const html = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(0,-16px);pointer-events:none;">
          <div style="background:rgba(0,0,0,0.85);border:1px solid rgba(149,255,0,0.4);border-radius:4px;padding:4px 8px;margin-bottom:6px;box-shadow:0 0 10px rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;white-space:nowrap;backdrop-filter:blur(4px);">
             <span style="color:#fff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-shadow:0 0 4px rgba(255,255,255,0.3);">${team.name}</span>
             <span style="color:#95FF00;font-size:10px;font-family:monospace;margin-top:2px;display:flex;gap:8px;">
               <span>${team.solvedCount}/${questions.length}</span>
               <span>${durStr}</span>
             </span>
          </div>
          <div style="position:relative;width:14px;height:14px;">
            <div style="position:absolute;inset:-8px;background:rgba(149,255,0,0.25);border-radius:50%;${pulse ? 'animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite' : ''}"></div>
            <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:1px solid #000;box-shadow:0 0 8px rgba(149,255,0,0.8);"></div>
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

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#060606]" />;
}


export function Leaderboard() {
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isListVisible, setIsListVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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
    const intv = setInterval(fetchBoard, 5000);
    return () => clearInterval(intv);
  }, []);

  if (loading) return <div className="text-white/50 text-[10px] tracking-widest uppercase p-12 text-center">Loading Data Link...</div>;

  return (
      <div ref={rootRef} className={`relative w-full overflow-hidden bg-[#060606] ${isFullscreen ? 'h-screen rounded-none border-none' : 'h-[calc(100vh-140px)] min-h-[500px] rounded-xl border border-white/10'}`}>
        {/* Full Screen Map View */}
        {questions.length > 0 ? <MapView teams={teams} questions={questions} now={now} /> : <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-mono tracking-widest z-0">No Rounds Configured</div>}

        {/* Floating List View overlay on the right */}
        <div className={`absolute top-4 right-4 flex flex-col h-[calc(100%-2rem)] max-h-[700px] z-10 transition-all duration-300 ${isListVisible ? 'w-full max-w-[360px] corner-card border border-white/10 shadow-2xl backdrop-blur-xl bg-black/60' : 'w-auto'}`}>
          {isListVisible ? (
            <>
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#95FF00]" />
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/80">Leaderboard</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-[#95FF00] bg-[#95FF00]/10 px-2 py-0.5 border border-[#95FF00]/20">LIVE</span>
                  
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

              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                 {teams.map((t, idx) => (
                   <div key={t.id} className="bg-black/50 border border-white/10 p-3 relative group transition-colors hover:border-[#95FF00]/20 backdrop-blur-md">
                      <div className="absolute right-3 top-3 opacity-10 text-[20px] font-black italic select-none">
                        #{idx + 1}
                      </div>
                      <div className="pr-10">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-[#95FF00] truncate">{t.name}</h3>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-white/50 uppercase tracking-widest font-mono">
                           <span className="flex items-center gap-1"><Target className="w-3 h-3 text-[#95FF00]/50"/> {t.solvedCount}/{questions.length}</span>
                           <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#95FF00]/50" /> {formatDuration(t.startTime, t.finishTime, now)}</span>
                        </div>
                        {t.finishTime && <div className="mt-2 text-[#95FF00] font-bold text-[9px] uppercase tracking-[0.2em]">Deployment Complete ✓</div>}
                      </div>
                   </div>
                 ))}
                 {!teams.length && <div className="text-center p-8 text-white/30 text-[10px] tracking-widest uppercase font-mono">Standby for Teams...</div>}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <button 
                onClick={toggleFullscreen}
                className="bg-black/80 border border-white/10 text-white/50 p-3 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center group pointer-events-auto"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              </button>
              <button 
                onClick={() => setIsListVisible(true)}
                className="bg-black/80 border border-[#95FF00]/30 text-[#95FF00] p-3 rounded shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xl hover:bg-[#95FF00]/10 transition-all flex items-center justify-center group pointer-events-auto"
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
