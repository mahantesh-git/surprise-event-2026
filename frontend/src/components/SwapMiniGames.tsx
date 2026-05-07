import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Shield, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── HAPTIC UTILITY ───────────────────────────────────────────
function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate(pattern); } catch { }
}

const AC = '#00ffb4';
const ERR = '#ff4444';

// ─── MIRROR CODE GAME ───────────────────────────────────────────
export const MirrorCodeGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const lcRef = useRef<HTMLCanvasElement>(null);
  const rcRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState('MEMORISE THE PATTERN');
  const [msg, setMsg] = useState('Pattern hides in 1.8s');
  const [accWidth, setAccWidth] = useState(0);
  const [accColor, setAccColor] = useState(AC);
  const [round, setRound] = useState(0);
  const [atts, setAtts] = useState(2);
  const [tbarWidth, setTbarWidth] = useState('0%');
  const [tbarColor, setTbarColor] = useState(AC);
  const [tbarTransition, setTbarTransition] = useState('none');

  const W = 120, H = 150, THRESH = 68, SHOW = difficulty === 'hard' ? 1200 : 1800, DRAW = difficulty === 'hard' ? 5000 : 7000;
  
  const activeRef = useRef(false);
  const drawingRef = useRef(false);
  const ptsRef = useRef<{x: number, y: number}[]>([]);
  const patRef = useRef<{x: number, y: number}[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const patterns = [
    [{x:20,y:25},{x:20,y:75},{x:60,y:75},{x:60,y:125}],
    [{x:20,y:125},{x:60,y:25},{x:100,y:125}],
    [{x:20,y:25},{x:100,y:25},{x:20,y:125},{x:100,y:125}],
    [{x:20,y:75},{x:60,y:25},{x:100,y:75},{x:60,y:125},{x:20,y:75}],
    [{x:60,y:15},{x:15,y:55},{x:35,y:135},{x:85,y:135},{x:105,y:55}],
  ];

  function clr(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#060d18';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,255,180,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,255,180,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  }

  function drawP(ctx: CanvasRenderingContext2D, ps: {x:number,y:number}[], col: string) {
    if (ps.length < 2) return;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ps[0].x, ps[0].y);
    for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i].x, ps[i].y);
    ctx.stroke();
    ps.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, i === 0 ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#fff' : col; ctx.fill();
    });
  }

  function mirP(ps: {x:number,y:number}[]) { return ps.map(p => ({ x: W - p.x, y: p.y })); }

  function calcAcc(drawn: {x:number,y:number}[], target: {x:number,y:number}[]) {
    if (drawn.length < 2) return 0;
    const mt = mirP(target); let tot = 0; const S = 16;
    for (let s = 0; s <= S; s++) {
      const t = s / S;
      const ti = Math.min(Math.floor(t * (mt.length - 1)), mt.length - 2);
      const tf = t * (mt.length - 1) - ti;
      const tx = mt[ti].x + tf * (mt[ti + 1].x - mt[ti].x);
      const ty = mt[ti].y + tf * (mt[ti + 1].y - mt[ti].y);
      const di = Math.min(Math.floor(t * (drawn.length - 1)), drawn.length - 2);
      const df = t * (drawn.length - 1) - di;
      const dx = drawn[di].x + df * (drawn[di + 1].x - drawn[di].x);
      const dy = drawn[di].y + df * (drawn[di + 1].y - drawn[di].y);
      tot += Math.sqrt((tx - dx) ** 2 + (ty - dy) ** 2);
    }
    return Math.max(0, Math.round(100 - tot / (S + 1) * 1.3));
  }

  function startTimer(ms: number, col: string) {
    setTbarTransition('none'); setTbarWidth('100%'); setTbarColor(col || AC);
    setTimeout(() => { setTbarTransition(`width ${ms}ms linear`); setTbarWidth('0%'); }, 30);
  }

  function stopTimer() { setTbarTransition('none'); setTbarWidth('0%'); }

  const startRound = () => {
    ptsRef.current = []; setAtts(2); activeRef.current = false;
    patRef.current = patterns[Math.floor(Math.random() * patterns.length)];
    const lx = lcRef.current?.getContext('2d');
    const rx = rcRef.current?.getContext('2d');
    if (lx && rx) {
      clr(lx); clr(rx); drawP(lx, patRef.current, AC); drawP(rx, mirP(patRef.current), 'rgba(0,255,180,0.35)');
    }
    setPhase('MEMORISE THE PATTERN'); setMsg(`Pattern hides in ${SHOW/1000}s`); setAccWidth(0); startTimer(SHOW, AC);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (rx) { clr(rx); drawP(rx, mirP(patRef.current), 'rgba(0,255,180,0.07)'); }
      setPhase('DRAW THE MIRROR'); setMsg('Trace reflected path on right panel');
      startTimer(DRAW, 'rgba(0,255,180,0.5)');
      activeRef.current = true; drawingRef.current = false;
    }, SHOW);
  };

  useEffect(() => { startRound(); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, [round]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true; ptsRef.current = [];
    const rx = rcRef.current?.getContext('2d');
    if (rx) { clr(rx); drawP(rx, mirP(patRef.current), 'rgba(0,255,180,0.07)'); }
    const r = rcRef.current?.getBoundingClientRect();
    if (!r) return;
    const p = { x: Math.round((e.clientX - r.left) * (W / r.width)), y: Math.round((e.clientY - r.top) * (H / r.height)) };
    ptsRef.current.push(p); rx?.beginPath(); rx?.moveTo(p.x, p.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeRef.current) return;
    const r = rcRef.current?.getBoundingClientRect();
    if (!r) return;
    const p = { x: Math.round((e.clientX - r.left) * (W / r.width)), y: Math.round((e.clientY - r.top) * (H / r.height)) };
    ptsRef.current.push(p);
    const rx = rcRef.current?.getContext('2d');
    if (rx) {
      rx.strokeStyle = AC; rx.lineWidth = 2; rx.lineCap = 'round';
      rx.lineTo(p.x, p.y); rx.stroke(); rx.beginPath(); rx.moveTo(p.x, p.y);
    }
    const a = calcAcc(ptsRef.current, patRef.current);
    setAccWidth(a); setAccColor(a >= THRESH ? AC : ERR);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (ptsRef.current.length < 4) return;
    activeRef.current = false; stopTimer();
    const a = calcAcc(ptsRef.current, patRef.current);
    setAccWidth(a);
    if (a >= THRESH) {
      setAccColor(AC); setPhase('MIRROR LOCKED'); setMsg(`Accuracy ${a}% — cleared`); haptic([100, 50, 200]);
      setTimeout(() => { if (round >= 2) onComplete(); else setRound(r => r + 1); }, 1100);
    } else {
      setAccColor(ERR); haptic([200]); setAtts(a => a - 1);
      if (atts - 1 <= 0) {
        setMsg(`${a}% — retrying round`); setTimeout(() => startRound(), 1200);
      } else {
        setPhase('INSUFFICIENT'); setMsg(`${a}% — need ${THRESH}% — ${atts - 1} left`);
        setTimeout(() => {
          const rx = rcRef.current?.getContext('2d');
          if (rx) { clr(rx); drawP(rx, mirP(patRef.current), 'rgba(0,255,180,0.07)'); }
          setPhase('DRAW THE MIRROR'); setMsg('Try again'); startTimer(DRAW, 'rgba(0,255,180,0.5)'); activeRef.current = true;
        }, 1300);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4 space-y-4">
      <div className="text-center">
        <h2 className="text-[11px] tracking-[0.2em] text-white/70 uppercase mb-1">{phase}</h2>
        <p className="text-[9px] tracking-wider text-[var(--color-accent)]">{msg}</p>
      </div>

      <div className="w-[260px] h-1 bg-[var(--color-accent)]/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: tbarWidth, background: tbarColor, transition: tbarTransition }} />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="text-[7px] tracking-widest text-white/50">ORIGINAL</div>
          <canvas ref={lcRef} width={W} height={H} className="border border-[var(--color-accent)]/20 rounded-md bg-[#060d18]" />
        </div>
        <div className="w-px bg-[var(--color-accent)]/10 my-4" />
        <div className="flex flex-col items-center gap-1">
          <div className="text-[7px] tracking-widest text-white/50">MIRROR</div>
          <canvas
            ref={rcRef} width={W} height={H} className="border border-[var(--color-accent)]/20 rounded-md bg-[#060d18] touch-none"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
          />
        </div>
      </div>

      <div className="w-[260px] h-1 bg-[var(--color-accent)]/10 rounded-full overflow-hidden">
        <div className="h-full transition-all duration-100 rounded-full" style={{ width: `${accWidth}%`, background: accColor }} />
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("w-5 h-1 rounded-full transition-colors", i < round ? "bg-[var(--color-accent)]" : i === round ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-accent)]/10")} />
        ))}
      </div>
    </div>
  );
};

// ─── THERMAL CALIBRATE GAME ─────────────────────────────────────────
export const ThermalCalibrateGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [phase, setPhase] = useState('Press start');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState(0);
  const [current, setCurrent] = useState(50);
  const [atts, setAtts] = useState(3);
  const [round, setRound] = useState(0);
  const [showing, setShowing] = useState(true);
  const [active, setActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const startRound = () => {
    setAtts(3); setActive(false); setShowing(true);
    const newTarget = 20 + Math.floor(Math.random() * 60);
    setTarget(newTarget); setCurrent(50);
    setPhase('MEMORISE TARGET LEVEL'); setMsg('Target hides in 2s');
    setTimeout(() => {
      setShowing(false);
      setPhase('DRAG TO SET TEMPERATURE'); setMsg('Set reactor to memorised level, then confirm');
      setActive(true);
    }, difficulty === 'hard' ? 1200 : 2000);
  };

  useEffect(() => { startRound(); }, [round]);

  const updateVal = (e: React.PointerEvent | PointerEvent) => {
    if (!active || !trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const ratio = 1 - (e.clientY - r.top) / r.height;
    setCurrent(Math.max(0, Math.min(100, ratio * 100)));
  };

  const handlePointerDown = (e: React.PointerEvent) => { if (active) { (e.target as HTMLElement).setPointerCapture(e.pointerId); updateVal(e); } };
  const handlePointerMove = (e: React.PointerEvent) => { if (active) updateVal(e); };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setActive(false);
    const diff = Math.abs(current - target);
    setShowing(true);
    if (diff <= (difficulty === 'hard' ? 5 : 8)) {
      setPhase('CALIBRATION LOCKED'); setMsg(`Error: ${Math.round(diff)}% — cleared`); haptic([100, 50, 200]);
      setTimeout(() => { if (round >= 2) onComplete(); else setRound(r => r + 1); }, 1200);
    } else {
      setAtts(a => a - 1); haptic([200]);
      if (atts - 1 <= 0) {
        setMsg('Too far off — retrying'); setTimeout(startRound, 1300);
      } else {
        setMsg(`Off by ${Math.round(diff)}% — ${atts - 1} attempts left`); setShowing(false);
        setTimeout(() => setActive(true), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-[11px] tracking-[0.2em] text-white/70 uppercase mb-1">{phase}</h2>
        <p className={cn("text-[9px] tracking-wider", showing && !active ? "text-[var(--color-accent)]" : "text-white/50")}>{msg}</p>
      </div>

      <div className="flex gap-6 w-full max-w-[260px] justify-between">
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">TARGET</div><div className="font-mono text-xl font-bold text-[var(--color-accent)]">{showing ? Math.round(target) : '???'}</div></div>
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">CURRENT</div><div className="font-mono text-xl font-bold text-[var(--color-accent)]">{showing ? '???' : Math.round(current)}</div></div>
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">ATTEMPTS</div><div className="font-mono text-xl font-bold text-white">{atts}</div></div>
      </div>

      <div className="flex gap-8 items-end w-full max-w-[260px] justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[7px] text-white/40 tracking-widest">REACTOR TEMP</div>
          <div
            ref={trackRef} className="w-10 h-48 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 rounded-full relative overflow-hidden touch-none"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
          >
            <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-accent)] rounded-b-full transition-all duration-75" style={{ height: `${current}%` }} />
            {showing && <div className="absolute left-0 right-0 h-0.5 bg-[#ff6b00]" style={{ bottom: `${target}%` }} />}
          </div>
          <div className="text-[9px] text-[var(--color-accent)] font-mono">{Math.round(current)}%</div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[7px] text-white/40 tracking-widest mb-1">TEMP SCALE</div>
          <div className="text-[8px] text-[#ff6b00]">100 — CRITICAL</div>
          <div className="text-[8px] text-[#ffb432]">75 — HIGH</div>
          <div className="text-[8px] text-[var(--color-accent)]">50 — NOMINAL</div>
          <div className="text-[8px] text-[#64b4ff]">25 — LOW</div>
          <div className="text-[8px] text-[#6496ff]">0 — CRITICAL</div>
          <div className={cn("mt-4 p-2 border rounded text-[8px] tracking-widest text-center", active ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-white/20 text-white/40")}>
            {active ? 'DRAG TO CALIBRATE' : showing ? (Math.abs(current - target) <= 8 ? 'LOCKED' : 'ERROR') : 'OBSERVING...'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("w-5 h-1 rounded-full transition-colors", i < round ? "bg-[var(--color-accent)]" : i === round ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-accent)]/10")} />
        ))}
      </div>
    </div>
  );
};

// ─── TELESCOPE LOCK GAME ─────────────────────────────────────────
export const TelescopeLockGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [phase, setPhase] = useState('FIND THE FOCUS ZONE');
  const [msg, setMsg] = useState('Adjust zoom slider to focus the signal');
  const [zoom, setZoom] = useState(10);
  const [targetZoom, setTargetZoom] = useState(25);
  const [holdTime, setHoldTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [round, setRound] = useState(0);
  const [active, setActive] = useState(true);

  const HOLD_REQ = difficulty === 'hard' ? 3000 : 2000;

  useEffect(() => {
    setActive(true); setIsHolding(false); setHoldTime(0); setZoom(10);
    setTargetZoom(15 + Math.floor(Math.random() * 25));
    setPhase('FIND THE FOCUS ZONE'); setMsg('Adjust zoom slider to focus the signal');
  }, [round]);

  useEffect(() => {
    if (!active) return;
    const diff = Math.abs(zoom - targetZoom);
    const focused = diff <= (difficulty === 'hard' ? 3 : 5);
    
    if (focused && !isHolding) {
      setIsHolding(true);
    } else if (!focused && isHolding) {
      setIsHolding(false); setHoldTime(0);
    }
  }, [zoom, targetZoom, active, isHolding, difficulty]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHolding && active) {
      interval = setInterval(() => {
        setHoldTime(t => {
          if (t + 100 >= HOLD_REQ) {
            setActive(false); setIsHolding(false);
            setPhase('SIGNAL LOCKED'); setMsg('Focus held — cleared'); haptic([100, 50, 200]);
            setTimeout(() => { if (round >= 2) onComplete(); else setRound(r => r + 1); }, 1200);
            return HOLD_REQ;
          }
          return t + 100;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isHolding, active, round, onComplete, HOLD_REQ]);

  const diff = Math.abs(zoom - targetZoom);
  const opacity = Math.min(0.85, diff / 30);
  const pct = Math.max(0, Math.round(100 - diff * 3));

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-[11px] tracking-[0.2em] text-white/70 uppercase mb-1">{phase}</h2>
        <p className="text-[9px] tracking-wider text-[var(--color-accent)]">{msg}</p>
      </div>

      <div className="flex gap-6 w-full max-w-[260px] justify-between">
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">ZOOM</div><div className="font-mono text-xl font-bold text-[var(--color-accent)]">{(zoom / 10).toFixed(1)}x</div></div>
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">FOCUS</div><div className="font-mono text-xl font-bold" style={{ color: pct > 80 ? AC : pct > 50 ? '#ffb432' : ERR }}>{pct}%</div></div>
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">HOLD</div><div className="font-mono text-xl font-bold text-white">{isHolding ? (holdTime / 1000).toFixed(1) + 's' : '—'}</div></div>
      </div>

      <div className="relative w-64 h-64 rounded-full border border-[var(--color-accent)]/30 overflow-hidden bg-[#060d18] touch-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border border-[var(--color-accent)]/50 rounded-full" />
          <div className="w-px h-10 bg-[var(--color-accent)]/50 absolute" />
          <div className="w-10 h-px bg-[var(--color-accent)]/50 absolute" />
        </div>
        <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity }} />
      </div>

      <div className="flex items-center gap-4 w-full max-w-[260px]">
        <span className="text-[8px] text-white/50">ZOOM</span>
        <input
          type="range" min="10" max="50" step="1" value={zoom}
          onChange={e => active && setZoom(parseInt(e.target.value))}
          disabled={!active}
          className="flex-1 accent-[var(--color-accent)]"
        />
        <span className="text-[8px] text-white/50">MAX</span>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("w-5 h-1 rounded-full transition-colors", i < round ? "bg-[var(--color-accent)]" : i === round ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-accent)]/10")} />
        ))}
      </div>
    </div>
  );
};

// ─── DNA SPLICE GAME ─────────────────────────────────────────
export const DnaSpliceGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [phase, setPhase] = useState('MATCH THE DNA STRANDS');
  const [msg, setMsg] = useState('Tap left strand, then tap its pair on the right');
  const [matched, setMatched] = useState(0);
  const [errors, setErrors] = useState(0);
  const [round, setRound] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [leftOrder, setLeftOrder] = useState<{ id: string, label: string, color: string }[]>([]);
  const [rightOrder, setRightOrder] = useState<{ id: string, pair: string, color: string }[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  const STRANDS = [
    { id: 'A', label: 'ATG-CGA', color: '#00ffb4', pair: 'TAC-GCT' },
    { id: 'B', label: 'GGC-TAA', color: '#00ccff', pair: 'CCG-ATT' },
    { id: 'C', label: 'TTA-GCC', color: '#ff6b9d', pair: 'AAT-CGG' },
    { id: 'D', label: 'CAT-TGG', color: '#ffaa00', pair: 'GTA-ACC' },
    ...(difficulty === 'hard' ? [
      { id: 'E', label: 'CGC-ATA', color: '#b400ff', pair: 'GCG-TAT' },
      { id: 'F', label: 'ATA-CGC', color: '#ff00b4', pair: 'TAT-GCG' },
    ] : [])
  ];

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  useEffect(() => {
    setActive(true); setMatched(0); setErrors(0); setSelectedLeft(null); setMatchedIds([]);
    setLeftOrder(shuffle(STRANDS)); setRightOrder(shuffle(STRANDS));
    setPhase('MATCH THE DNA STRANDS'); setMsg('Tap left strand, then tap its pair on the right');
  }, [round]);

  const selectLeft = (id: string) => {
    if (!active || matchedIds.includes(id)) return;
    setSelectedLeft(id); setMsg('Now tap the matching pair on the right'); haptic(20);
  };

  const selectRight = (id: string) => {
    if (!active || !selectedLeft || matchedIds.includes(id)) return;
    if (id === selectedLeft) {
      const newMatched = [...matchedIds, id];
      setMatchedIds(newMatched); setMatched(newMatched.length);
      setSelectedLeft(null); haptic([80, 30, 80]); setMsg(`Pair matched — ${newMatched.length}/${STRANDS.length}`);
      if (newMatched.length >= STRANDS.length) {
        setActive(false); setPhase('SPLICE COMPLETE'); haptic([100, 50, 200]);
        setTimeout(() => { if (round >= 2) onComplete(); else setRound(r => r + 1); }, 1200);
      }
    } else {
      setErrors(e => e + 1); haptic([200]); setErrorId(id);
      setTimeout(() => setErrorId(null), 600);
      setSelectedLeft(null); setMsg('Wrong pair — try again');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-[11px] tracking-[0.2em] text-white/70 uppercase mb-1">{phase}</h2>
        <p className="text-[9px] tracking-wider" style={{ color: errorId ? ERR : AC }}>{msg}</p>
      </div>

      <div className="flex gap-6 w-full max-w-[260px] justify-between">
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">MATCHED</div><div className="font-mono text-xl font-bold text-[var(--color-accent)]">{matched}/{STRANDS.length}</div></div>
        <div className="flex flex-col"><div className="text-[7px] text-white/40 tracking-widest">ERRORS</div><div className="font-mono text-xl font-bold text-[#ff4444]">{errors}</div></div>
      </div>

      <div className="flex gap-4 w-full max-w-[280px]">
        <div className="flex flex-col flex-1 gap-2">
          {leftOrder.map(s => {
            const isMatched = matchedIds.includes(s.id);
            const isSelected = selectedLeft === s.id;
            return (
              <div
                key={s.id} onClick={() => selectLeft(s.id)}
                className={cn("p-2 border rounded font-mono text-xs text-center transition-all cursor-pointer", isMatched ? "opacity-30 border-[var(--color-accent)]/20" : isSelected ? `border-[${s.color}] bg-[${s.color}]/10` : "border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/5")}
                style={{ color: s.color, outline: isSelected ? `1px solid ${s.color}` : 'none' }}
              >
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="w-px bg-[var(--color-accent)]/10" />
        <div className="flex flex-col flex-1 gap-2">
          {rightOrder.map(s => {
            const isMatched = matchedIds.includes(s.id);
            const isError = errorId === s.id;
            return (
              <div
                key={s.id} onClick={() => selectRight(s.id)}
                className={cn("p-2 border rounded font-mono text-xs text-center transition-all cursor-pointer", isMatched ? "opacity-30 border-[var(--color-accent)]/20" : isError ? "bg-red-500/20 border-red-500" : "border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/5")}
                style={{ color: s.color }}
              >
                {s.pair}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("w-5 h-1 rounded-full transition-colors", i < round ? "bg-[var(--color-accent)]" : i === round ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-accent)]/10")} />
        ))}
      </div>
    </div>
  );
};
