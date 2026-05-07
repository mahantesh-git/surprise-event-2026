import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, Brain, LayoutGrid, CheckCircle2, RefreshCcw, Trophy,
  Star, Fingerprint, Shield, ChevronRight, AlertCircle, Activity, ClipboardPaste, Copy, Check,
  MapPin, Camera, AlertTriangle, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TacticalStatus } from './TacticalStatus';
import { Button } from '@/components/ui/button';
import { verifyRunnerPasskey, completeRunnerGame, updateGameState } from '@/lib/api';
import { getDistance, parseDMS } from '@/lib/geofence';
import { RunnerGyroScanner } from './RunnerGyroScanner';
import { MirrorCodeGame, ThermalCalibrateGame, TelescopeLockGame, DnaSpliceGame } from './SwapMiniGames';

// ─── HAPTIC UTILITY ───────────────────────────────────────────
function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate(pattern); } catch { }
}

// ─── TAP GAME ─────────────────────────────────────────────────
const TapGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [taps, setTaps] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(1);
  const [velocity, setVelocity] = useState({ dx: 1, dy: 1, speed: difficulty === 'hard' ? 2 : 1.2 });
  const [timeLeft, setTimeLeft] = useState(difficulty === 'hard' ? 12 : 15);
  const [isDone, setIsDone] = useState(false);
  const [restarts, setRestarts] = useState(0);

  const required = difficulty === 'hard' ? 15 : 10;
  const shrinkInterval = 5;
  const shrinkAmount = 0.08;

  // Refs for interval stability
  const tapsRef = useRef(0);
  const velocityRef = useRef(velocity);
  const isDoneRef = useRef(false);

  useEffect(() => { tapsRef.current = taps; }, [taps]);
  useEffect(() => { velocityRef.current = velocity; }, [velocity]);

  // Timer Effect - High Res (0.1s)
  useEffect(() => {
    let lastTick = Date.now();
    const timer = setInterval(() => {
      if (isDoneRef.current) return;

      const now = Date.now();
      if (now - lastTick >= 100) {
        lastTick = now;
        setTimeLeft(v => {
          const next = Math.max(0, v - 0.1);
          if (next <= 0) {
            clearInterval(timer);
            return 0;
          }
          return parseFloat(next.toFixed(1));
        });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [restarts]);

  // Movement Effect - Stable 50ms
  useEffect(() => {
    const moveTimer = setInterval(() => {
      if (isDoneRef.current || timeLeft <= 0) return;

      setTarget(prev => {
        const vel = velocityRef.current;
        let nx = prev.x + vel.dx * vel.speed;
        let ny = prev.y + vel.dy * vel.speed;
        let ndx = vel.dx;
        let ndy = vel.dy;

        if (nx < 10 || nx > 90) { ndx *= -1; nx = nx < 10 ? 10 : 90; }
        if (ny < 10 || ny > 90) { ndy *= -1; ny = ny < 10 ? 10 : 90; }

        if (ndx !== vel.dx || ndy !== vel.dy) {
          setVelocity(v => ({ ...v, dx: ndx, dy: ndy }));
        }
        return { x: nx, y: ny };
      });
    }, 40); // Faster tick for smoother movement
    return () => clearInterval(moveTimer);
  }, [restarts]);

  const handleTap = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (timeLeft <= 0 || isDoneRef.current) return;

    haptic(25);
    const newTaps = taps + 1;
    setTaps(newTaps);

    if (newTaps >= required) {
      isDoneRef.current = true;
      setIsDone(true);
      setTimeout(onComplete, 1000);
      return;
    }

    if (newTaps % shrinkInterval === 0) {
      setScale(s => Math.max(0.7, s - shrinkAmount));
    }

    // Smooth speed ramp
    const speedCap = difficulty === 'hard' ? 4.0 : 3.0;
    const speedInc = difficulty === 'hard' ? 1.08 : 1.05;

    setVelocity(v => ({
      ...v,
      speed: Math.min(speedCap, v.speed * speedInc),
      dx: Math.random() > 0.5 ? 1 : -1,
      dy: Math.random() > 0.5 ? 1 : -1
    }));

    setTarget({ x: Math.random() * 60 + 15, y: Math.random() * 55 + 15 });
  };

  const handleMiss = () => {
    if (difficulty === 'hard' && taps > 0 && !isDoneRef.current) {
      setTaps(t => Math.max(0, t - 1));
      haptic([50, 50]);
    }
  };

  if (isDone) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
        <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Target Neutralized!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  if (timeLeft <= 0) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Operation Failure"
        message="Time Expired"
        icon={RefreshCcw}
      />
      <button
        onClick={() => {
          setTaps(0);
          setTimeLeft(difficulty === 'hard' ? 12 : 15);
          setIsDone(false);
          isDoneRef.current = false;
          setTarget({ x: 50, y: 50 });
          setScale(1);
          setVelocity({ dx: 1, dy: 1, speed: difficulty === 'hard' ? 2 : 1.2 });
          setRestarts(s => s + 1);
          haptic(100);
        }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Try Again</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-mono text-white/40 px-1">
        <span>HITS: <span className="text-[var(--color-accent)]">{taps}</span>/{required}</span>
        <span>TIME: <span className={timeLeft <= 3 ? 'text-[var(--color-accent)]' : 'text-white/80'}>{timeLeft.toFixed(1)}s</span></span>
      </div>
      <div
        className="relative w-full bg-black overflow-hidden border-b border-white/10"
        style={{ height: 'clamp(200px, 42dvh, 360px)' }}
        onPointerDown={handleMiss}
      >
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        <div className="absolute bottom-0 left-0 h-1 bg-[var(--color-accent)]/20 w-full">
          <motion.div className="h-full bg-[var(--color-accent)]" animate={{ width: `${(taps / required) * 100}%` }} transition={{ type: 'spring', stiffness: 300 }} />
        </div>
        <motion.button
          animate={{ left: `${target.x}%`, top: `${target.y}%`, scale }}
          transition={{ left: { type: 'tween', duration: 0.04 }, top: { type: 'tween', duration: 0.04 }, scale: { type: 'spring', damping: 15 } }}
          onPointerDown={handleTap}
          className="absolute w-20 h-20 bg-[var(--color-accent)] clip-oct shadow-accent-lg flex items-center justify-center -translate-x-1/2 -translate-y-1/2 active:brightness-150 transition-transform"
        >
          <Crosshair className="text-black w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
};

// ─── MEMORY GAME ──────────────────────────────────────────────
const MemoryGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const allSymbols = ['🚀', '💻', '⚡', '🧠', '🔒', '🔑', '🎯', '📡', '🛡️'];
  const symbols = difficulty === 'hard' ? allSymbols.slice(0, 8) : allSymbols.slice(0, 6);
  const [cards] = useState(() => [...symbols, ...symbols].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);

  const [timeLeft, setTimeLeft] = useState(difficulty === 'hard' ? 30 : 45);
  const [wrongCount, setWrongCount] = useState(0);
  const maxWrong = difficulty === 'hard' ? 2 : 3;
  const flipTime = difficulty === 'hard' ? 250 : 400;

  useEffect(() => {
    if (timeLeft > 0 && solved.length < cards.length && wrongCount < maxWrong) {
      const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
      return () => clearInterval(t);
    }
  }, [timeLeft, solved.length, cards.length, wrongCount, maxWrong]);

  useEffect(() => {
    if (flipped.length === 2) {
      if (cards[flipped[0]] === cards[flipped[1]]) {
        haptic([50, 30, 50]);
        setSolved((s) => [...s, ...flipped]);
        setFlipped([]);
      } else {
        haptic(100);
        setWrongCount(w => w + 1);
        if (difficulty === 'hard') {
          setSolved(s => {
            if (s.length === 0) return s;
            const newS = [...s];
            newS.pop(); newS.pop(); // remove 1 pair
            if (newS.length > 0) { newS.pop(); newS.pop(); } // remove 2nd pair
            return newS;
          });
        }
        const t = setTimeout(() => setFlipped([]), flipTime);
        return () => clearTimeout(t);
      }
    }
  }, [flipped, cards, difficulty, flipTime]);

  useEffect(() => {
    if (solved.length === cards.length && solved.length > 0) onComplete();
  }, [solved.length, cards.length, onComplete]);

  if (solved.length === cards.length) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
        <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Memory Decoded!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  if (timeLeft <= 0 || wrongCount >= maxWrong) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Operation Failure"
        message={timeLeft <= 0 ? "Time Expired" : "Integrity Compromised"}
        icon={RefreshCcw}
      />
      <button
        onClick={() => { setFlipped([]); setSolved([]); setWrongCount(0); setTimeLeft(difficulty === 'hard' ? 30 : 45); haptic(100); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Try Again</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-mono text-white/40 px-1">
        <span>MATCHED: <span className="text-[var(--color-accent)]">{solved.length / 2}</span>/{symbols.length}</span>
        <span>ERRORS: <span className="text-red-400">{wrongCount}</span>/{maxWrong}</span>
        <span>TIME: <span className={timeLeft <= 5 ? 'text-red-400' : 'text-white/80'}>{timeLeft}s</span></span>
      </div>
      <div className={`grid gap-2 xs:gap-2.5 ${difficulty === 'hard' ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-3'}`}>
        {cards.map((symbol, i) => {
          const isFlipped = flipped.includes(i);
          const isSolved = solved.includes(i);
          return (
            <motion.div
              key={i} whileTap={{ scale: 0.9 }}
              onClick={() => flipped.length < 2 && !isFlipped && !isSolved && (haptic(15), setFlipped((f) => [...f, i]))}
              className={`flex items-center justify-center text-2xl cursor-pointer transition-all duration-200 select-none ${isFlipped || isSolved ? 'bg-[var(--color-accent)]/20 text-white scale-105' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              style={{ height: 'clamp(60px, 18vw, 88px)' }}
            >
              {isFlipped || isSolved ? symbol : <span className="text-zinc-600 text-lg">?</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PATTERN GAME ─────────────────────────────────────────────
const PatternGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const [failed, setFailed] = useState(false);
  const [distractionActive, setDistractionActive] = useState<number | null>(null);

  const patternLength = difficulty === 'hard' ? 7 : 5;
  const flashSpeed = difficulty === 'hard' ? 350 : 600;
  const maxRestarts = difficulty === 'hard' ? 0 : 3;

  const colorClasses = [
    { bg: 'bg-[var(--color-accent)]', dim: 'bg-[var(--color-accent)]/20' },
    { bg: 'bg-[var(--color-accent)] brightness-150', dim: 'bg-[var(--color-accent)]/10' },
    { bg: 'bg-[#99001A]', dim: 'bg-[#99001A]/40' },
    { bg: 'bg-white', dim: 'bg-white/20' },
  ];

  const start = () => {
    const newPattern = Array.from({ length: patternLength }, () => Math.floor(Math.random() * 4));
    setPattern(newPattern); setUserPattern([]); setPlaying(true); setWrongFlash(false);
    playPatternSeq(newPattern);
  };

  const playPatternSeq = async (p: number[]) => {
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < p.length; i++) {
      setActive(p[i]); haptic(30);
      await new Promise((r) => setTimeout(r, flashSpeed));
      setActive(null);
      await new Promise((r) => setTimeout(r, 200));
    }
    setPlaying(false);
  };

  useEffect(() => {
    if (difficulty === 'hard' && !playing && !done && !failed && pattern.length > 0) {
      const interval = setInterval(() => {
        if (Math.random() < 0.3) {
          const idx = Math.floor(Math.random() * 4);
          setDistractionActive(idx);
          setTimeout(() => setDistractionActive(null), 150);
        }
      }, 800);
      return () => {
        clearInterval(interval);
        setDistractionActive(null);
      };
    }
  }, [difficulty, playing, done, failed, pattern.length]);

  const handlePress = (i: number) => {
    if (playing || failed || done || wrongFlash) return;
    haptic(20);
    setActive(i);
    setTimeout(() => setActive(null), 150);

    const next = [...userPattern, i];
    setUserPattern(next);

    if (pattern[userPattern.length] !== i) {
      setWrongFlash(true); haptic([100, 50, 100]);
      if (restarts >= maxRestarts) {
        setFailed(true);
      } else {
        setRestarts(r => r + 1);
        setTimeout(() => start(), 2000);
      }
      return;
    }
    if (next.length === pattern.length) { setDone(true); onComplete(); }
  };

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
        <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Pattern Cracked!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Operation Failure"
        message={difficulty === 'hard' ? "Instant Lockout: Invalid Sequence" : "Too Many Restart Attempts"}
        icon={AlertCircle}
      />
      <button
        onClick={() => { setFailed(false); setRestarts(0); setPattern([]); setWrongFlash(false); setUserPattern([]); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Reboot Sequence</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {wrongFlash && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-4"
        >
          <TacticalStatus
            tone="error"
            label="Security Alert"
            message={`Sequence Mismatch: ${maxRestarts > 0 ? 'Penalty Active' : 'Lockout'}`}
            icon={AlertCircle}
          />
        </motion.div>
      )}
      <div className="flex justify-between text-sm font-mono text-white/40 px-1">
        <span>LENGTH: <span className="text-[var(--color-accent)]">{patternLength}</span></span>
        <span>RESTARTS: <span className="text-red-400">{restarts}</span>/{maxRestarts}</span>
      </div>
      <div className="text-sm font-mono text-white/40 text-center">
        {pattern.length === 0 ? 'Press Start to begin' : playing ? '⟐ Watch the pattern…' : '⟐ Repeat the pattern!'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => {
          const isActive = active === i;
          const isDistraction = distractionActive === i;
          const bgClass = isActive ? `${colorClasses[i].bg} shadow-lg scale-105` :
            isDistraction ? `${colorClasses[i].bg} shadow-lg scale-105 opacity-60` :
              colorClasses[i].dim;
          return (
            <motion.div
              key={i} whileTap={{ scale: 0.92 }} onClick={() => handlePress(i)}
              className={`cursor-pointer transition-all duration-200 border-0 ${bgClass}`}
              style={{ height: 'clamp(80px, 22vw, 120px)' }}
            />
          );
        })}
      </div>
      <button onClick={start} disabled={playing || wrongFlash} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 py-4 font-bold text-lg transition-colors border-0 mt-4 clip-oct">
        {pattern.length === 0 ? '▶ Start Pattern' : '🔄 Replay'}
      </button>
    </div>
  );
};

// ─── SIGNAL TRACE ─────────────────────────────────────────────
const SignalTraceGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const maxTime = difficulty === 'hard' ? 8 : 12;
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState(0);
  const [failed, setFailed] = useState(false);
  const maxErrors = difficulty === 'hard' ? 0 : 2;

  const stateRef = React.useRef({
    path: [] as { x: number, y: number }[], progress: 0, dragging: false, nodePos: { x: 0, y: 0 },
    corridorW: difficulty === 'hard' ? 20 : 32
  });

  const generatePath = (W: number, H: number) => {
    const pts = []; const margin = 40; const steps = 7;
    pts.push({ x: margin + 10, y: H - margin });
    for (let i = 1; i < steps; i++) {
      const x = margin + (W - margin * 2) * (i / (steps - 1));
      const y = (i % 2 === 0) ? H - margin : margin + 30;
      pts.push({ x, y });
    }
    const smooth = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let t = 0; t < 20; t++) smooth.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * (t / 20), y: pts[i].y + (pts[i + 1].y - pts[i].y) * (t / 20) });
    }
    smooth.push(pts[pts.length - 1]);
    return smooth;
  };

  const draw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { path, corridorW, progress, nodePos } = stateRef.current;
    if (path.length === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = corridorW * 2; ctx.strokeStyle = '#1e2d3d'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#1e4060'; ctx.stroke();

    if (progress > 0) {
      const idx = Math.floor(progress * (path.length - 1));
      ctx.lineWidth = 3; ctx.strokeStyle = '#00f5a0'; ctx.shadowColor = '#00f5a0'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i <= idx; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.beginPath(); ctx.arc(path[0].x, path[0].y, 8, 0, Math.PI * 2); ctx.fillStyle = '#00f5a0'; ctx.fill();
    ctx.beginPath(); ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 8, 0, Math.PI * 2); ctx.fillStyle = progress >= 1 ? '#00f5a0' : '#5a7a8a'; ctx.fill();

    ctx.beginPath(); ctx.arc(nodePos.x, nodePos.y, 10, 0, Math.PI * 2); ctx.fillStyle = '#00f5a0'; ctx.shadowColor = '#00f5a0'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(nodePos.x, nodePos.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  };

  const start = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    stateRef.current.path = generatePath(canvas.width, canvas.height);
    stateRef.current.progress = 0;
    stateRef.current.nodePos = { ...stateRef.current.path[0] };
    setPlaying(true); setTimeLeft(maxTime); setStatus(null); setFailed(false); setErrors(0);
    draw();
  };

  useEffect(() => {
    if (playing && !done && !failed) {
      const tid = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 0) {
            clearInterval(tid);
            setPlaying(false);
            setFailed(true);
            setStatus("TIME'S UP - RESTART");
            haptic(300);
            return 0;
          }
          return Math.round((v - 0.1) * 10) / 10;
        });
      }, 100);
      return () => clearInterval(tid);
    }
  }, [playing, done, failed]);

  useEffect(() => {
    if (canvasRef.current && !playing && !done && stateRef.current.path.length === 0) {
      stateRef.current.path = generatePath(canvasRef.current.width, canvasRef.current.height);
      stateRef.current.nodePos = { ...stateRef.current.path[0] };
      draw();
    }
  }, [playing, done]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
  };

  const onStartMove = (e: any) => {
    if (!playing || failed) return;
    const pos = getPos(e);
    const startPos = stateRef.current.path[0];
    if (Math.hypot(pos.x - startPos.x, pos.y - startPos.y) < 30) stateRef.current.dragging = true;
  };

  const onMove = (e: any) => {
    if (!playing || !stateRef.current.dragging || failed) return;
    const pos = getPos(e);
    const { path, corridorW, progress } = stateRef.current;
    let bestIdx = Math.floor(progress * (path.length - 1));
    let bestDist = Infinity;
    for (let i = bestIdx; i < path.length; i++) {
      const d = Math.hypot(pos.x - path[i].x, pos.y - path[i].y);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
      if (i - Math.floor(progress * (path.length - 1)) > 30) break;
    }

    if (bestDist > corridorW) {
      stateRef.current.dragging = false; stateRef.current.progress = 0; stateRef.current.nodePos = { ...path[0] };
      haptic(100);
      setErrors(err => {
        const next = err + 1;
        if (next > maxErrors) {
          setPlaying(false);
          setFailed(true);
          setStatus(difficulty === 'hard' ? 'INSTANT FAIL: OFF TRACK' : 'TOO MANY ERRORS');
        } else {
          setStatus('OFF TRACK - RESTART');
          setTimeout(() => setStatus(null), 800);
        }
        return next;
      });
    } else {
      const newProg = bestIdx / (path.length - 1);
      if (newProg > stateRef.current.progress) {
        stateRef.current.progress = newProg;
        stateRef.current.nodePos = { ...path[bestIdx] };
      }
      if (stateRef.current.progress >= 0.99) {
        stateRef.current.dragging = false; setPlaying(false); setDone(true); onComplete(); haptic([50, 30, 100]);
      }
    }
    draw();
  };
  const onEndMove = () => { stateRef.current.dragging = false; };

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" /></motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Path Cleared!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Circuit secured...</p>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Trace Failure"
        message={status || "Operation Failed"}
        icon={AlertCircle}
      />
      <button
        onClick={() => { setFailed(false); setErrors(0); setTimeLeft(maxTime); setStatus(null); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Re-establish Connection</button>
    </div>
  );

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div className="flex justify-between w-full text-sm font-mono text-white/40 px-1">
        <span>ERRORS: <span className="text-red-400">{errors}</span>/{maxErrors}</span>
        <span>TIME: <span className={timeLeft <= 5 ? 'text-red-400' : 'text-white/80'}>{timeLeft.toFixed(1)}s</span></span>
      </div>
      <div className="w-full h-1 bg-white/10 overflow-hidden"><div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${(timeLeft / maxTime) * 100}%`, background: timeLeft < maxTime * 0.3 ? '#ff4757' : 'var(--color-accent)' }} /></div>
      <canvas
        ref={canvasRef} width={420} height={340}
        className="border border-white/10 w-full touch-none bg-black cursor-crosshair rounded"
        onMouseDown={onStartMove} onMouseMove={onMove} onMouseUp={onEndMove} onMouseLeave={onEndMove}
        onTouchStart={onStartMove} onTouchMove={onMove} onTouchEnd={onEndMove}
      />
      {status && !failed && <div className="text-red-400 font-mono text-sm uppercase">{status}</div>}
      {!playing && !failed && <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-4 clip-oct">{timeLeft < maxTime ? '🔄 Restart Trace' : '▶ Start Trace'}</button>}
    </div>
  );
};

// ─── FREQUENCY JAM ────────────────────────────────────────────
const FrequencyJamGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(30);
  const [timeInZone, setTimeInZone] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const dropRate = difficulty === 'hard' ? 8 : 5; // % per second
  const minTarget = difficulty === 'hard' ? 70 : 60;
  const maxTarget = difficulty === 'hard' ? 85 : 80;
  const targetTime = difficulty === 'hard' ? 4000 : 3000;

  const start = () => {
    setLevel(30);
    setTimeInZone(0);
    setPlaying(true);
    setFailed(false);
  };

  useEffect(() => {
    if (!playing || done || failed) return;
    const interval = setInterval(() => {
      setLevel(prev => {
        const next = prev - (dropRate / 10); // 10 ticks per second
        if (difficulty === 'hard' && next <= 0) {
          setFailed(true);
          setPlaying(false);
          haptic([100, 100]);
          return 0;
        }
        return Math.max(0, next);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, done, failed, difficulty, dropRate]);

  useEffect(() => {
    if (!playing || done || failed) return;
    const interval = setInterval(() => {
      if (level >= minTarget && level <= maxTarget) {
        setTimeInZone(prev => {
          const next = prev + 100;
          if (next >= targetTime) {
            setDone(true);
            setPlaying(false);
            onComplete();
            haptic([50, 30, 100]);
          }
          return next;
        });
      } else {
        setTimeInZone(prev => Math.max(0, prev - 200)); // drain quickly if outside zone
      }
    }, 100);
    return () => clearInterval(interval);
  }, [playing, done, failed, level, minTarget, maxTarget, targetTime, onComplete]);

  const handleTap = (e: React.PointerEvent) => {
    if (!playing || failed || done) return;
    e.stopPropagation();
    e.preventDefault();
    haptic(15);
    setLevel(prev => Math.min(100, prev + 10));
  };

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" /></motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Frequency Locked!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Signal stabilized...</p>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Signal Lost"
        message="Frequency Flatline: Instant Fail"
        icon={RefreshCcw}
      />
      <button
        onClick={() => { setFailed(false); setLevel(30); setTimeInZone(0); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Re-Initialize</button>
    </div>
  );

  const inZone = level >= minTarget && level <= maxTarget;

  return (
    <div className="space-y-4 flex flex-col items-center select-none" onPointerDown={playing ? handleTap : undefined}>
      <div className="flex justify-between w-full text-sm font-mono text-white/40 px-1">
        <span>HOLD TARGET: <span className="text-[var(--color-accent)]">{minTarget}% - {maxTarget}%</span></span>
        <span>SYNC: <span className={inZone ? 'text-[var(--color-accent)]' : 'text-white/80'}>{(timeInZone / 1000).toFixed(1)}s / {(targetTime / 1000).toFixed(1)}s</span></span>
      </div>

      <div className="relative w-full h-48 bg-black border border-white/10 rounded flex items-end justify-center overflow-hidden">
        {/* Sweet spot background indicator */}
        <div
          className="absolute w-full bg-[var(--color-accent)]/10 border-y border-[var(--color-accent)]/30 transition-all"
          style={{ bottom: `${minTarget}%`, height: `${maxTarget - minTarget}%` }}
        />

        {/* Level Bar */}
        <div
          className={`w-24 transition-all duration-100 ${inZone ? 'bg-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]' : 'bg-white/40'}`}
          style={{ height: `${level}%` }}
        />

        {/* Percent Label */}
        <div className="absolute top-4 left-4 font-mono text-xl text-white/50">{Math.round(level)}%</div>
      </div>

      {!playing && !failed && (
        <button onClick={(e) => { e.stopPropagation(); start(); }} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-4 clip-oct">
          {level === 30 && timeInZone === 0 ? '▶ Start Jam' : '🔄 Restart Jam'}
        </button>
      )}

      {playing && (
        <div className="text-white/40 font-mono text-sm mt-4 animate-pulse">
          TAP RAPIDLY TO MAINTAIN FREQUENCY
        </div>
      )}
    </div>
  );
};

// ─── CORE DUMP ────────────────────────────────────────────────
const CoreDumpGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const len = difficulty === 'hard' ? 12 : 8;
  const timeLimit = difficulty === 'hard' ? 12 : 15;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = () => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  const [code, setCode] = useState(genCode);
  const [input, setInput] = useState('');
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = () => { setCode(genCode()); setInput(''); setPlaying(true); setTimeLeft(timeLimit); setStatus(null); setFailed(false); };

  useEffect(() => {
    if (playing && !done && !failed) {
      const tid = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 0.1) {
            clearInterval(tid);
            setPlaying(false);
            setFailed(true);
            setStatus("TIME'S UP");
            haptic(300);
            return 0;
          }
          return Math.round((v - 0.1) * 10) / 10;
        });
      }, 100);
      return () => clearInterval(tid);
    }
  }, [playing, done, failed]);

  useEffect(() => {
    if (difficulty === 'normal' && playing && !done && !failed) {
      const rid = setInterval(() => {
        setInput(prev => {
          if (prev.length < len && prev === code.substring(0, prev.length)) {
            haptic(15);
            return prev + code[prev.length];
          }
          return prev;
        });
      }, 2500);
      return () => clearInterval(rid);
    }
  }, [difficulty, playing, done, failed, code, len]);

  useEffect(() => {
    if (input.length === len && input === code && playing) {
      setPlaying(false); setDone(true); onComplete(); haptic([30, 30, 80]);
    }
  }, [input, code, len, playing, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playing || failed || done) return;
    const val = e.target.value.toUpperCase();

    if (val.length < input.length) {
      setInput(val);
      return;
    }

    if (!code.startsWith(val)) {
      haptic(100);
      if (difficulty === 'hard') {
        setTimeLeft(v => Math.max(0, v - 1));
        setStatus('PENALTY: -1s');
        setTimeout(() => setStatus(null), 800);
      } else {
        setStatus('INVALID CHAR');
        setTimeout(() => setStatus(null), 800);
      }
      return;
    }

    setInput(val);
    haptic(10);
  };

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" /></motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Code Accepted!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">System dumped...</p>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Dump Failed"
        message={status || "Time Expired"}
        icon={RefreshCcw}
      />
      <button
        onClick={() => { setFailed(false); setTimeLeft(timeLimit); setInput(''); setCode(genCode()); setStatus(null); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Re-Initialize</button>
    </div>
  );

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <div className="flex justify-between w-full text-sm font-mono text-white/40 px-1">
        <span>CHARS: <span className="text-[var(--color-accent)]">{input.length}</span>/{len}</span>
        <span>TIME: <span className={timeLeft <= 3 ? 'text-red-400' : 'text-white/80'}>{timeLeft.toFixed(1)}s</span></span>
      </div>
      <div className="w-full h-1 bg-white/10 overflow-hidden"><div className="h-full transition-all bg-[var(--color-accent)]" style={{ width: `${(timeLeft / timeLimit) * 100}%`, background: timeLeft < 3 ? '#ff4757' : 'var(--color-accent)' }} /></div>

      <div className="w-full bg-zinc-900 border border-white/10 p-6 rounded text-center font-mono text-3xl tracking-[0.2em] break-all h-24 flex items-center justify-center">
        {!playing ? <span className="text-white/20 text-sm">Press start to begin</span> :
          code.split('').map((c, i) => {
            const isInput = i < input.length;
            const isCorrect = isInput && input[i] === c;
            return <span key={i} className={cn('transition-opacity', isInput ? (isCorrect ? 'text-[var(--color-accent)]' : 'text-red-500') : 'text-white/30')}>{c}</span>;
          })
        }
      </div>

      <input type="text" value={input} onChange={handleChange} disabled={!playing} placeholder="TYPE CODE..." className="w-full bg-black border border-white/20 text-center text-xl font-mono p-4 text-white uppercase focus:border-[var(--color-accent)] outline-none" autoFocus={playing} />

      <div className="font-mono text-sm font-bold text-red-500 h-4">{status || ''}</div>
      {!playing && !failed && <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-2 clip-oct">▶ Start Dump</button>}
    </div>
  );
};

// ─── OVERLOAD ─────────────────────────────────────────────────
const OverloadGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const goal = difficulty === 'hard' ? 20 : 15;
  const timeLimit = difficulty === 'hard' ? 20 : 18;
  const windowMs = difficulty === 'hard' ? 500 : 750;
  const initialLives = difficulty === 'hard' ? 1 : 2;

  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hits, setHits] = useState(0);
  const [lives, setLives] = useState(initialLives);
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nodes, setNodes] = useState<Record<number, { type: 'threat' | 'decoy', id: number }>>({});

  const stateRef = React.useRef({ hits: 0, lives: initialLives, idCounter: 0, startTime: 0 });
  const nodesRef = React.useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const start = () => {
    setHits(0);
    setLives(initialLives);
    setTimeLeft(timeLimit);
    setPlaying(true);
    setNodes({});
    setLocked(false);
    setStatus(null);
    setFailed(false);
    stateRef.current = { hits: 0, lives: initialLives, idCounter: 0, startTime: Date.now() };
  };

  useEffect(() => {
    if (!playing || done || failed) return;
    const tid = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 0.1) { setPlaying(false); setFailed(true); setStatus('TIME EXPIRED'); haptic(300); return 0; }
        return v - 0.1;
      });
    }, 100);
    return () => clearInterval(tid as any);
  }, [playing, done, failed]);

  useEffect(() => {
    if (!playing || locked || done || failed) return;
    const maxActive = difficulty === 'hard' ? 6 : 4;
    let active = true;
    let timeoutId: any;

    const scheduleNext = () => {
      if (!active) return;
      const elapsed = (Date.now() - stateRef.current.startTime) / 1000;
      const speedUpInterval = difficulty === 'hard' ? 2 : 4;
      const speedLevel = Math.floor(elapsed / speedUpInterval);
      const spawnBase = 400 - (speedLevel * 40); // gets faster
      const spawnVar = 250 - (speedLevel * 25);
      const delay = Math.max(100, spawnBase + Math.random() * spawnVar);

      timeoutId = setTimeout(() => {
        if (!active) return;

        const currentNodes = nodesRef.current;
        if (Object.keys(currentNodes).length < maxActive) {
          const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !currentNodes[i]);
          if (free.length > 0) {

            const idx = free[Math.floor(Math.random() * free.length)];
            const isDecoy = Math.random() < (difficulty === 'hard' ? 0.4 : 0.3);
            const id = ++stateRef.current.idCounter;

            setNodes(prev => ({ ...prev, [idx]: { type: isDecoy ? 'decoy' : 'threat', id } }));

            // Setup expiration
            setTimeout(() => {
              if (!active) return;
              setNodes(curr => {
                const node = curr[idx];
                if (node && node.id === id) {
                  if (node.type === 'threat') {
                    const newLives = stateRef.current.lives - 1;
                    stateRef.current.lives = newLives; setLives(newLives);
                    if (newLives <= 0) { setPlaying(false); setFailed(true); setStatus('SYSTEM OVERRUN'); haptic([200, 200]); }
                  }
                  const next = { ...curr }; delete next[idx]; return next;
                }
                return curr;
              });
            }, windowMs);
          }
        }

        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => { active = false; clearTimeout(timeoutId); };
  }, [playing, locked, difficulty, windowMs, done, failed]);

  const handleTap = (idx: number) => {
    if (!playing || locked || failed || done) return;
    const node = nodes[idx]; if (!node) return;

    setNodes(prev => { const next = { ...prev }; delete next[idx]; return next; });

    if (node.type === 'threat') {
      const newHits = stateRef.current.hits + 1;
      stateRef.current.hits = newHits; setHits(newHits); haptic(30);
      if (newHits >= goal) { setPlaying(false); setDone(true); onComplete(); haptic([50, 30, 100]); }
    } else {
      haptic(200);
      setLocked(true);

      let lockTime = 1500;
      if (difficulty === 'hard') {
        lockTime = 2000;
        const newHits = Math.max(0, stateRef.current.hits - 1);
        stateRef.current.hits = newHits; setHits(newHits);
        setStatus('LOCKOUT: -1 HIT');
      } else {
        setStatus('LOCKOUT - DECOY HIT');
      }

      setTimeout(() => { setLocked(false); setStatus(null); }, lockTime);
    }
  };

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" /></motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Threats Neutralized!</h2>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Defense Failed"
        message={status || "System Overrun"}
        icon={RefreshCcw}
      />
      <button
        onClick={start}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Re-Initialize</button>
    </div>
  );

  return (
    <div className="space-y-4 flex flex-col items-center select-none">
      <div className="flex justify-between w-full text-sm font-mono text-white/40 px-1">
        <span>HITS: <span className="text-[var(--color-accent)]">{hits}</span>/{goal}</span>
        <span>TOLERANCE: <span className="text-red-400">{lives}</span></span>
        <span>TIME: <span className={timeLeft <= 5 ? 'text-red-400' : 'text-white/80'}>{timeLeft.toFixed(1)}s</span></span>
      </div>
      <div className="w-full h-1 bg-white/10 overflow-hidden"><div className="h-full transition-all bg-[var(--color-accent)]" style={{ width: `${(timeLeft / timeLimit) * 100}%`, background: timeLeft < 5 ? '#ff4757' : 'var(--color-accent)' }} /></div>

      <div className="relative w-full aspect-square max-w-[320px] mx-auto mt-4">
        <div className="grid grid-cols-3 grid-rows-3 gap-3 absolute inset-0">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
            const node = nodes[i];
            return (
              <motion.div key={i} whileTap={{ scale: 0.9 }} onPointerDown={(e) => { e.preventDefault(); handleTap(i); }}
                className={cn("flex items-center justify-center rounded-lg border text-3xl cursor-pointer transition-colors", !node ? "border-white/10 bg-zinc-900/50" : node.type === 'threat' ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]" : "border-zinc-500 bg-white/10 text-zinc-400")}
              >
                {node ? (node.type === 'threat' ? '✕' : '●') : ''}
              </motion.div>
            )
          })}
        </div>
        {locked && <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center font-mono text-red-500 font-bold tracking-widest z-10 rounded-lg">LOCKOUT</div>}
      </div>

      <div className="font-mono text-sm font-bold text-red-500 h-4">{status || ''}</div>
      {!playing && !failed && <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-2 clip-oct text-[var(--color-accent)]">▶ Start Defense</button>}
    </div>
  );
};

// ─── ZERO DAY ─────────────────────────────────────────────────
const ZeroDayGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'hard' ? 15 : 20);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const stateRef = React.useRef({
    x: 170, y: 360, targetX: 170,
    barriers: [] as { y: number, gapX: number, gapW: number, nearMissToggled?: boolean }[],
    speed: 2, lastTime: 0,
    surviveMs: difficulty === 'hard' ? 15000 : 20000,
    startMs: 0, animFrame: 0,
    nearMissCount: 0,
    isPlaying: false
  });

  const start = () => {
    stateRef.current.x = 170;
    stateRef.current.targetX = 170;
    stateRef.current.barriers = [];
    stateRef.current.surviveMs = difficulty === 'hard' ? 15000 : 20000;
    stateRef.current.startMs = performance.now();
    stateRef.current.lastTime = performance.now();
    stateRef.current.nearMissCount = 0;
    stateRef.current.isPlaying = true;

    setPlaying(true);
    setTimeLeft(stateRef.current.surviveMs / 1000);
    setStatus(null);
    setFailed(false);

    const hard = difficulty === 'hard';
    const W = 340; const H = 420;
    const gapW = hard ? W * 0.22 : W * 0.30;
    const spY = hard ? 110 : 130;

    for (let y = -spY; y > -H; y -= spY) stateRef.current.barriers.push({ y, gapX: Math.random() * (W - gapW), gapW });
    loop();
  };

  const loop = () => {
    const s = stateRef.current;
    if (!s.isPlaying && s.animFrame) { cancelAnimationFrame(s.animFrame); return; }
    const now = performance.now();
    const elapsed = now - s.startMs;
    if (elapsed >= s.surviveMs) {
      s.isPlaying = false; setPlaying(false); setDone(true); onComplete(); haptic([50, 30, 100]); return;
    }

    setTimeLeft((s.surviveMs - elapsed) / 1000);

    // Speed ramps every 3s for normal, 2s for hard
    const rampInterval = difficulty === 'hard' ? 2000 : 3000;
    s.speed = 2 + Math.floor(elapsed / rampInterval) * 0.4;

    s.x += (s.targetX - s.x) * 0.18;
    s.x = Math.max(12, Math.min(340 - 12, s.x));

    s.barriers.forEach(b => b.y += s.speed);
    s.barriers = s.barriers.filter(b => b.y < 420 + 30);

    const tops = s.barriers.map(b => b.y); const topmost = tops.length ? Math.min(...tops) : 0;
    const spY = difficulty === 'hard' ? 110 : 130;
    const gapW = difficulty === 'hard' ? 340 * 0.22 : 340 * 0.30;
    if (topmost > -spY + 60) s.barriers.push({ y: topmost - spY, gapX: Math.random() * (340 - gapW), gapW });

    let crashed = false;
    let nearMiss = false;
    for (let b of s.barriers) {
      if (s.y >= b.y - 9 && s.y <= b.y + 9) {
        if (s.x < b.gapX || s.x > b.gapX + b.gapW) { crashed = true; break; }
        const margin = Math.min(s.x - b.gapX, b.gapX + b.gapW - s.x);
        if (margin < gapW * 0.12) {
          if (!b.nearMissToggled) {
            b.nearMissToggled = true;
            nearMiss = true;
          }
        }
      }
    }

    if (nearMiss) {
      setStatus('⚠ NEAR MISS'); setTimeout(() => setStatus(curr => curr === '⚠ NEAR MISS' ? null : curr), 400);
      if (difficulty === 'hard') {
        s.nearMissCount++;
        if (s.nearMissCount >= 2) {
          s.isPlaying = false; setPlaying(false); setFailed(true); setStatus('HULL INTEGRITY CRITICAL'); haptic(300); return;
        }
      } else {
        s.startMs += 2000; // Add 2s to the survive timer
      }
    }

    if (crashed) { s.isPlaying = false; setPlaying(false); setFailed(true); setStatus('BREACH FAILED'); haptic(300); return; }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 340, 420);
      s.barriers.forEach(b => {
        ctx.fillStyle = '#1e2d3d'; ctx.fillRect(0, b.y - 9, b.gapX, 18); ctx.fillRect(b.gapX + b.gapW, b.y - 9, 340 - b.gapX - b.gapW, 18);
        ctx.fillStyle = '#9c88ff'; ctx.fillRect(0, b.y - 9, b.gapX, 1); ctx.fillRect(b.gapX + b.gapW, b.y - 9, 340 - b.gapX - b.gapW, 1);
      });
      ctx.save(); ctx.translate(s.x, s.y); ctx.fillStyle = '#9c88ff'; ctx.shadowColor = '#9c88ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    s.animFrame = requestAnimationFrame(loop);
  };

  const onMove = (e: any) => {
    if (!playing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const r = canvas.getBoundingClientRect(); const src = e.touches ? e.touches[0] : e;
    stateRef.current.targetX = (src.clientX - r.left) * (340 / r.width);
  };

  useEffect(() => {
    if (!playing && !done && !failed) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) { ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 340, 420); ctx.fillStyle = '#9c88ff'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.fillText('Ready to breach...', 170, 210); }
    }
  }, [playing, done, failed]);

  useEffect(() => {
    return () => { if (stateRef.current.animFrame) cancelAnimationFrame(stateRef.current.animFrame); };
  }, []);

  if (done) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" /></motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Firewall Bypassed!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Network Access Granted</p>
    </div>
  );

  if (failed) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Breach Failed"
        message={status || "Collision Detected"}
        icon={RefreshCcw}
      />
      <button
        onClick={start}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Re-Initialize</button>
    </div>
  );

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div className="flex justify-between w-full text-sm font-mono text-white/40 px-1">
        <span>SURVIVE: <span className={timeLeft <= 5 ? 'text-red-400' : 'text-purple-400'}>{Math.max(0, timeLeft).toFixed(1)}s</span></span>
        {difficulty === 'hard' && <span>NEAR MISS: <span className={stateRef.current.nearMissCount > 0 ? 'text-red-400' : 'text-white/80'}>{stateRef.current.nearMissCount}/2</span></span>}
      </div>
      <div className="w-full h-1 bg-white/10 overflow-hidden"><div className="h-full transition-all" style={{ width: `${(1 - timeLeft / 10) * 100}%`, background: '#9c88ff' }} /></div>

      <canvas ref={canvasRef} width={340} height={420} className="w-full max-w-[340px] border border-white/10 bg-black touch-none rounded" onMouseMove={onMove} onTouchMove={onMove} />

      <div className="font-mono text-sm font-bold text-orange-400 h-4">{status || ''}</div>
      {!playing && !failed && <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-2 clip-oct text-[var(--color-accent)]">▶ Breach Network</button>}
    </div>
  );
};

// ─── SIGNAL BURST GAME ──────────────────────────────────────────
const SignalBurstGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'ARMED' | 'HIT' | 'MISS' | 'DONE'>('IDLE');
  const [msg, setMsg] = useState('Press START to begin');
  const [windowMs] = useState(difficulty === 'hard' ? 250 : 400);
  const [touched, setTouched] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const totalRounds = 3;
  const touchTimesRef = useRef<Record<number, number>>({});
  const ringRef = useRef<SVGCircleElement>(null);
  const animRef = useRef<number | null>(null);

  const startRound = () => {
    setTouched(new Set());
    touchTimesRef.current = {};
    setStatus('ARMED');
    setMsg('Hold all 4 points simultaneously');
    animateRing(8000);
  };

  const animateRing = (durationMs: number) => {
    if (!ringRef.current) return;
    const ring = ringRef.current;
    ring.style.opacity = '1';
    ring.setAttribute('stroke-dashoffset', '188.5');
    
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const offset = 188.5 * (1 - progress);
      ring.setAttribute('stroke-dashoffset', offset.toString());
      
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        ring.style.opacity = '0';
        handleFail(durationMs); // Timeout
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const handleSuccess = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (ringRef.current) ringRef.current.style.opacity = '0';
    
    setStatus('HIT');
    setMsg('SYNCHRONIZED');
    haptic([50, 30, 50]);
    
    const nextRound = round + 1;
    setRound(nextRound);
    
    if (nextRound >= totalRounds) {
      setDone(true);
      setStatus('DONE');
      setPlaying(false);
      setTimeout(onComplete, 1200);
    } else {
      setTimeout(startRound, 1000);
    }
  };

  const handleFail = (spread: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (ringRef.current) ringRef.current.style.opacity = '0';

    setStatus('MISS');
    setMsg(spread >= 8000 ? 'TIMEOUT - SIGNAL LOST' : `DESYNC - ${spread}ms spread`);
    haptic(150);
    setTouched(new Set());
    touchTimesRef.current = {};

    setTimeout(() => {
      startRound();
    }, 1500);
  };

  const handleTouch = (id: number, type: 'start' | 'end') => (e: React.PointerEvent) => {
    if (!playing || status !== 'ARMED') return;
    e.preventDefault();
    
    if (type === 'start') {
      const now = Date.now();
      touchTimesRef.current[id] = now;
      
      setTouched(prev => {
        const next = new Set(prev);
        next.add(id);
        
        if (next.size === 4) {
          const times = Object.values(touchTimesRef.current);
          const spread = Math.max(...times) - Math.min(...times);
          if (spread <= windowMs) handleSuccess();
          else handleFail(spread);
        }
        return next;
      });
    } else {
      setTouched(prev => {
        const next = new Set(prev);
        next.delete(id);
        delete touchTimesRef.current[id];
        return next;
      });
    }
  };

  const startGame = () => {
    setPlaying(true);
    setRound(0);
    setDone(false);
    setTimeout(startRound, 500);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex justify-between w-full font-mono text-[10px] text-white/40 uppercase tracking-widest px-2">
        <div className="text-center">
          <div className="opacity-50 mb-1">Burst</div>
          <div className="text-white text-sm font-bold">{round}/{totalRounds}</div>
        </div>
        <div className="text-center">
          <div className="opacity-50 mb-1">Tolerance</div>
          <div className="text-emerald-400 text-sm font-bold">{windowMs}ms</div>
        </div>
        <div className="text-center">
          <div className="opacity-50 mb-1">Status</div>
          <div className={cn("text-sm font-bold", status === 'HIT' ? 'text-green-400' : status === 'MISS' ? 'text-red-400' : 'text-white/60')}>{status}</div>
        </div>
      </div>

      <div className="relative w-72 h-72 bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden shadow-inner flex items-center justify-center touch-none">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500" />
        </div>

        {[
          { id: 0, style: { top: '15%', left: '15%' } },
          { id: 1, style: { top: '15%', right: '15%' } },
          { id: 2, style: { bottom: '15%', left: '15%' } },
          { id: 3, style: { bottom: '15%', right: '15%' } },
        ].map((c) => (
          <button
            key={c.id}
            onPointerDown={handleTouch(c.id, 'start')}
            onPointerUp={handleTouch(c.id, 'end')}
            onPointerLeave={handleTouch(c.id, 'end')}
            className={cn(
              "absolute w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-100",
              touched.has(c.id) 
                ? "bg-emerald-500/30 border-emerald-400 scale-90 shadow-[0_0_15px_rgba(52,211,153,0.3)]" 
                : "bg-white/5 border-white/20"
            )}
            style={c.style}
          >
            <Radio className={cn("w-6 h-6", touched.has(c.id) ? "text-white" : "text-white/20")} />
          </button>
        ))}

        <svg className="absolute w-20 h-20 pointer-events-none" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
          <circle 
            ref={ringRef}
            cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray="188.5" strokeDashoffset="188.5" strokeLinecap="round"
            className="text-emerald-400 transition-opacity duration-300"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', opacity: 0 }}
          />
        </svg>

        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-green-400 font-bold uppercase tracking-widest text-xs">Signal Stabilized</div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-3 w-full">
        <div className={cn("text-[10px] font-mono uppercase tracking-[0.2em] h-4 transition-colors", status === 'MISS' ? 'text-red-400' : 'text-white/40')}>
          {msg}
        </div>
        
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className={cn(
              "w-10 h-1 rounded-full transition-all duration-500",
              i < round ? "bg-emerald-400" : i === round && playing ? "bg-white/30 animate-pulse" : "bg-white/10"
            )} />
          ))}
        </div>
      </div>

      {!playing && !done && (
        <button 
          onClick={startGame}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-[0.2em] h-12 text-xs transition-all clip-oct"
        >
          Initiate Burst
        </button>
      )}
    </div>
  );
};

// ─── TYPES ────────────────────────────────────────────────────
type GameType = 'tap' | 'memory' | 'pattern' | 'signal_trace' | 'frequency_jam' | 'core_dump' | 'overload' | 'signal_burst' | 'zero_day' | 'mirror_code' | 'thermal_calibrate' | 'telescope_lock' | 'dna_splice';
type RunnerScreen = 'location' | 'ar_scanner' | 'manual_fallback' | 'passkey' | 'game' | 'victory';

interface RunnerGameProps {
  token: string;
  currentRoundIndex: number;
  totalRounds: number;
  onRoundComplete: () => void;
  stage?: string;
  currentRound?: any;
  onSwitchToMap?: () => void;
  difficulty?: 'normal' | 'hard';
  arTestingBypassEnabled?: boolean;
  gameType?: string;
  paused?: boolean;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export function RunnerGame({
  token,
  currentRoundIndex,
  totalRounds,
  onRoundComplete,
  stage,
  currentRound,
  onSwitchToMap,
  difficulty = 'normal',
  arTestingBypassEnabled,
  gameType: initialGameType,
  paused = false
}: RunnerGameProps) {
  const [screen, setScreen] = useState<RunnerScreen>(() => {
    if (stage === 'runner_entry') return 'passkey';
    if (stage === 'runner_game') return 'game';
    if (stage === 'runner_done') return 'victory';
    return 'location';
  });

  useEffect(() => {
    if (stage === 'runner_entry') setScreen('passkey');
    else if (stage === 'runner_game') setScreen('game');
    else if (stage === 'runner_done') setScreen('victory');
    else if (stage === 'runner_travel') setScreen('location');
  }, [stage]);

  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (screen !== 'location' || !currentRound?.coord) return;

    const targetLat = parseDMS(currentRound.coord.lat);
    const targetLng = parseDMS(currentRound.coord.lng);

    if (isNaN(targetLat) || isNaN(targetLng)) return;

    import('@/lib/geofence').then(({ getDistance }) => {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const d = getDistance(latitude, longitude, targetLat, targetLng);
          setDistance(d);
          setLocationError(null);
        },
        (err) => {
          setLocationError('Enable location services to scan');
          setDistance(null);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    });
  }, [screen, currentRound]);
  const [passkey, setPasskey] = useState('');
  const [gameType, setGameType] = useState<GameType>((initialGameType as GameType) || 'tap');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGameType) {
      setGameType(initialGameType as GameType);
    }
  }, [initialGameType]);

  const [isVerifyingPasskey, setVerifyingPasskey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPasskey = () => {
    if (currentRound?.qrPasskey) {
      navigator.clipboard.writeText(currentRound.qrPasskey);
      setCopied(true);
      haptic(30);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [completing, setCompleting] = useState(false);

  const gameInfo: Record<GameType, { title: string; icon: React.ReactNode; color: string }> = {
    tap: { title: 'TARGET LOCK', icon: <Crosshair className="w-6 h-6 text-[var(--color-accent)]" />, color: 'text-[var(--color-accent)]' },
    memory: { title: 'NEURAL DECODE', icon: <Brain className="w-6 h-6 text-blue-400" />, color: 'text-blue-400' },
    pattern: { title: 'CIPHER CRACK', icon: <LayoutGrid className="w-6 h-6 text-purple-400" />, color: 'text-purple-400' },
    signal_trace: { title: 'SIGNAL TRACE', icon: <Activity className="w-6 h-6 text-cyan-400" />, color: 'text-cyan-400' },
    frequency_jam: { title: 'FREQUENCY JAM', icon: <Activity className="w-6 h-6 text-[var(--color-accent)]" />, color: 'text-[var(--color-accent)]' },
    core_dump: { title: 'CORE DUMP', icon: <Activity className="w-6 h-6 text-orange-400" />, color: 'text-orange-400' },
    overload: { title: 'OVERLOAD', icon: <AlertCircle className="w-6 h-6 text-red-400" />, color: 'text-red-400' },
    zero_day: { title: 'ZERO DAY', icon: <Shield className="w-6 h-6 text-purple-400" />, color: 'text-purple-400' },
    signal_burst: { title: 'SIGNAL BURST', icon: <Radio className="w-6 h-6 text-emerald-400" />, color: 'text-emerald-400' },
    mirror_code: { title: 'MIRROR CODE', icon: <LayoutGrid className="w-6 h-6 text-emerald-400" />, color: 'text-emerald-400' },
    thermal_calibrate: { title: 'THERMAL CALIBRATE', icon: <Activity className="w-6 h-6 text-[#ff6b00]" />, color: 'text-[#ff6b00]' },
    telescope_lock: { title: 'TELESCOPE LOCK', icon: <Crosshair className="w-6 h-6 text-blue-400" />, color: 'text-blue-400' },
    dna_splice: { title: 'DNA SPLICE', icon: <Activity className="w-6 h-6 text-[#b400ff]" />, color: 'text-[#b400ff]' },
  };

  const handleVerifyPasskey = async () => {
    if (!passkey.trim()) return;
    setVerifyingPasskey(true);
    setError(null);
    try {
      const data = await verifyRunnerPasskey(token, passkey.trim());
      setGameType(data.gameType as GameType);
      setScreen('game');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    } finally {
      setVerifyingPasskey(false);
    }
  };

  const handleGameComplete = async () => {
    setScreen('victory');
    try {
      await updateGameState(token, { stage: 'runner_done' });
    } catch (err) {
      console.error('[RunnerGame] Failed to update stage to runner_done:', err);
    }
  };

  const handleFinishRound = async () => {
    setCompleting(true);
    try {
      await completeRunnerGame(token);
      onRoundComplete();
    } catch {
      // error — fall through to finally
    } finally {
      setCompleting(false);
    }
  };

  const info = gameInfo[gameType];
  const isLastRound = currentRoundIndex >= totalRounds - 1;

  if (paused) {
    return (
      <div className="corner-card glass-morphism p-8 max-w-md mx-auto text-center border-[var(--color-accent)]/30">
        <Shield className="w-10 h-10 mx-auto mb-4 text-[var(--color-accent)]" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--color-accent)] mb-3">Game Paused</h2>
        <p className="text-[10px] text-white/60 font-mono uppercase tracking-widest leading-relaxed">
          Admin has paused the game. Runner actions and mini-game timers are frozen until resume.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* ── LOCATION VERIFICATION ── */}
      {screen === 'location' && (
        <motion.div key="location" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="corner-card glass-morphism relative p-5 md:p-8 max-w-md mx-auto">

            <div className="space-y-6">
              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold tracking-widest uppercase">Target Assigned</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                  Navigate to the coordinates. Once you arrive, verify your physical presence by scanning the node's QR code.
                </p>
              </div>

              {currentRound && (
                <div className="corner-card glass-morphism p-6 space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Target</span><span className="font-mono text-xs text-right max-w-[150px]">{currentRound.coord.place}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Volunteer</span><span className="font-mono text-xs">{currentRound.volunteer.name}</span></div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded text-center relative group">
                    <span className="text-[10px] uppercase text-white/40 block mb-1">Passkey Status</span>
                    <span className="text-sm font-bold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                      [ ACCESS ENCRYPTED ]
                    </span>
                    <div className="text-[9px] font-mono text-white/20 mt-1 uppercase">Scan holographic node to decrypt</div>
                  </div>
                  {distance !== null && (
                    <div className="text-center text-xs font-mono">
                      <span className="text-white/40">DISTANCE TO TARGET: </span>
                      <span className={distance <= 10 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {Math.round(distance)}m {distance <= 10 ? "(SIGNAL ACQUIRED)" : "(OUT OF RANGE)"}
                      </span>
                    </div>
                  )}
                  {locationError && (
                    <div className="text-center text-xs font-mono text-[var(--color-accent)]">
                      {locationError}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                  <TacticalStatus
                    tone="error"
                    label="Verification Error"
                    message={error}
                    icon={AlertCircle}
                  />
                </motion.div>
              )}

              <div className="space-y-3">
                <Button
                  className={cn(
                    "w-full font-bold uppercase tracking-[0.2em] h-14 transition-all",
                    (arTestingBypassEnabled || (distance !== null && distance <= 10))
                      ? "btn-primary !bg-[var(--color-accent)] !text-white hover:brightness-125"
                      : "bg-zinc-800 text-white/20 border-white/5 cursor-not-allowed"
                  )}
                  size="md"
                  disabled={!arTestingBypassEnabled && (distance === null || distance > 10)}
                  onClick={() => { setError(null); setScreen('ar_scanner'); }}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {!arTestingBypassEnabled && distance !== null && distance > 10
                    ? `OUT OF RANGE (${Math.round(distance)}m)`
                    : (arTestingBypassEnabled ? "BYPASS: OPEN AR LINK" : "OPEN GYRO-AR LINK")}
                </Button>
                {/* Manual fallback — always available if AR camera issues */}
                <button
                  className="w-full text-white/60 text-xs font-mono uppercase tracking-widest py-2 hover:text-white/90 transition-colors"
                  onClick={() => setScreen('manual_fallback')}
                >
                  <AlertTriangle className="inline w-3 h-3 mr-1" />
                  AR not working? Use manual entry
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── AR SCANNER ── */}
      {screen === 'ar_scanner' && (
        <motion.div key="ar_scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <RunnerGyroScanner
            round={currentRoundIndex + 1}
            targetData={currentRound?.qrPasskey || `round_${currentRoundIndex + 1}`}
            distance={distance}
            testingBypassEnabled={arTestingBypassEnabled}
            onCapture={async (scannedData) => {
              setError(null);
              setPasskey(scannedData);
              // Auto-verify if we got data
              if (scannedData) {
                setVerifyingPasskey(true);
                try {
                  const data = await verifyRunnerPasskey(token, scannedData);
                  setGameType(data.gameType as GameType);
                  setScreen('game');
                } catch (err) {
                  console.error('Auto-verify fail:', err);
                  setScreen('passkey'); // Fallback to manual if auto-verify fails
                  setError(err instanceof Error ? err.message : 'Verification failed');
                } finally {
                  setVerifyingPasskey(false);
                }
              } else {
                setScreen('passkey');
              }
            }}
            onFail={(err) => {
              console.error('AR Fail:', err);
              setScreen('manual_fallback');
            }}
          />
        </motion.div>
      )}

      {/* ── MANUAL FALLBACK ── */}
      {screen === 'manual_fallback' && (
        <motion.div key="manual_fallback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div className="corner-card glass-morphism p-6 max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
              <h2 className="text-lg font-bold tracking-widest uppercase">AR Unavailable</h2>
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                AR camera failed or was denied. Admin has been notified.
                Ask the volunteer at this location to confirm your arrival.
              </p>
            </div>

            <div className="corner-card glass-morphism p-4 space-y-3">
              <p className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Location Verification</p>
              {currentRound && (
                <>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/40">Target</span>
                    <span>{currentRound.coord.place}</span>
                  </div>
                  {distance !== null && (
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/40">Distance</span>
                      <span className={distance <= 10 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {Math.round(distance)}m {distance <= 10 ? "(OK)" : "(TOO FAR)"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button
                className={cn(
                  "w-full font-bold uppercase tracking-[0.2em] h-14 transition-all",
                  distance !== null && distance <= 10
                    ? "!bg-yellow-500/20 border border-yellow-500/40 hover:!bg-yellow-500/30 text-yellow-300"
                    : "bg-zinc-800 text-white/20 border-white/5 cursor-not-allowed"
                )}
                size="md"
                disabled={distance === null || distance > 10}
                onClick={() => {
                  // Volunteer-confirmed manual capture — go directly to passkey
                  setError(null);
                  setScreen('passkey');
                }}
              >
                <MapPin className="mr-2 h-5 w-5" />
                {distance !== null && distance > 10 ? "OUT OF RANGE" : "CONFIRM MANUAL ARRIVAL"}
              </Button>
              <Button
                className={cn(
                  "w-full font-bold uppercase tracking-[0.2em] h-12 transition-all",
                  distance !== null && distance <= 10
                    ? "bg-zinc-900 hover:bg-zinc-800 text-white/60"
                    : "bg-zinc-950 text-white/10 border-white/5 cursor-not-allowed"
                )}
                size="md"
                disabled={distance === null || distance > 10}
                onClick={() => setScreen('ar_scanner')}
              >
                <Camera className="mr-2 h-4 w-4" /> RETRY AR CAMERA
              </Button>
              <button
                className="w-full text-white/60 text-xs font-mono uppercase tracking-widest py-2 hover:text-white/90 transition-colors mt-2"
                onClick={() => setScreen('location')}
              >
                ← Back to map
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── PASSKEY ENTRY ── */}
      {screen === 'passkey' && (
        <motion.div key="passkey" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="corner-card glass-morphism relative p-4 sm:p-6 md:p-8 max-w-md mx-auto">

            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-[var(--color-accent)]" />
                </div>
                <span className="label-technical block">Biometric Authentication</span>
                <h2 className="text-xl font-bold tracking-widest uppercase">Enter Location Passkey</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                  Enter the passkey to decrypt the node terminal.
                </p>
              </div>

              {currentRound && (
                <div className="corner-card glass-morphism p-6 space-y-4 mb-6">
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Target</span><span className="font-mono text-xs text-right max-w-[150px]">{currentRound.coord.place}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Volunteer</span><span className="font-mono text-xs">{currentRound.volunteer.name}</span></div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded text-center relative group">
                    <span className="text-[10px] uppercase text-white/40 block mb-1">Encrypted Access</span>
                    <span className="text-sm font-bold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                      [ NODE LOCKED ]
                    </span>
                    <div className="text-[9px] font-mono text-white/20 mt-1 uppercase">Enter bypass code from volunteer</div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <input
                    placeholder="PASSKEY"
                    className="w-full bg-white/5 border-b-2 border-white/10 text-center h-20 text-2xl tracking-[0.4em] font-black uppercase text-white placeholder:text-white/10 focus:border-[var(--color-accent)] focus:bg-white/10 transition-all duration-500 outline-none rounded-none pr-12"
                    value={passkey}
                    onChange={(e) => { setPasskey(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasskey()}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setPasskey(text.trim());
                          setError(null);
                        }
                      } catch (err) {
                        console.error('Failed to read clipboard', err);
                      }
                    }}
                    title="Paste Passkey"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[var(--color-accent)] transition-colors p-2"
                  >
                    <ClipboardPaste className="w-6 h-6" />
                  </button>
                  {error && <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-[var(--color-accent)]" />}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                    <TacticalStatus
                      tone="error"
                      label="Key Error"
                      message={error}
                      icon={AlertCircle}
                    />
                  </motion.div>
                )}

                <Button
                  className={cn(
                    "w-full font-bold uppercase tracking-[0.2em] h-14 transition-all",
                    distance !== null && distance <= 10
                      ? "btn-primary"
                      : "bg-zinc-800 text-white/20 border-white/5 cursor-not-allowed"
                  )}
                  size="md"
                  onClick={handleVerifyPasskey}
                  disabled={isVerifyingPasskey || !passkey.trim() || (distance !== null && distance > 10)}
                >
                  {distance !== null && distance > 10
                    ? `OUT OF RANGE (${Math.round(distance)}m)`
                    : isVerifyingPasskey ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (<><Shield className="mr-2 h-5 w-5" />UNLOCK_GAME</>)}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── MINIGAME ── */}
      {screen === 'game' && (
        <motion.div key="game" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <div className="corner-card glass-morphism relative">
            <div className="corner-tr" />
            {/* Game Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 md:p-6 border-b border-white/5 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center">
                  {info.icon}
                </div>
                <div>
                  <h2 className={`text-lg font-bold font-mono ${info.color}`}>{info.title}</h2>
                  <p className="text-[10px] font-mono text-white/30 uppercase">Round {currentRoundIndex + 1} Challenge</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-white/30 text-xs font-mono">
                <Fingerprint className="w-3.5 h-3.5" /><span>RUNNER</span>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="p-4 md:p-6">
              {gameType === 'tap' && <TapGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'memory' && <MemoryGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'pattern' && <PatternGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'signal_trace' && <SignalTraceGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'frequency_jam' && <FrequencyJamGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'core_dump' && <CoreDumpGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'overload' && <OverloadGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'zero_day' && <ZeroDayGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'signal_burst' && <SignalBurstGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'mirror_code' && <MirrorCodeGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'thermal_calibrate' && <ThermalCalibrateGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'telescope_lock' && <TelescopeLockGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'dna_splice' && <DnaSpliceGame onComplete={handleGameComplete} difficulty={difficulty} />}
            </div>
            <div className="text-center text-white/20 text-[10px] font-mono py-4 uppercase tracking-widest">
              Complete the challenge to finish this round
            </div>
          </div>
        </motion.div>
      )}

      {/* ── VICTORY ── */}
      {screen === 'victory' && (
        <motion.div key="victory" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="corner-card glass-morphism p-4 sm:p-6 md:p-8 relative text-center overflow-hidden">

            <div className="absolute inset-0 bg-[var(--color-accent)]/5 pointer-events-none" />
            <div className="relative z-10 space-y-8">

              <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <div className="w-24 h-24 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center mx-auto">
                  <Trophy className="w-12 h-12 text-[var(--color-accent)]" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-[0.3em] uppercase text-[var(--color-accent)]">CHALLENGE COMPLETE!</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                  Round {currentRoundIndex + 1} successfully cleared.
                </p>
              </div>

              <div className="bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-[var(--color-accent)] font-bold text-sm">
                  <Activity className="w-4 h-4" />
                  {isLastRound ? 'FINAL ROUND COMPLETE!' : 'READY FOR NEXT ROUND'}
                </div>
                <p className="text-white/40 text-xs font-mono">
                  {isLastRound
                    ? 'You have completed all rounds. Press below to finish the quest!'
                    : 'Press the button below. The Solver\'s next puzzle will unlock automatically.'}
                </p>
              </div>

              <div className="flex gap-1 justify-center">
                {[...Array(3)].map((_, i) => (
                  <motion.div key={i} animate={{ scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}>
                    <Star className="w-5 h-5 text-[var(--color-accent)] fill-[var(--color-accent)]" />
                  </motion.div>
                ))}
              </div>

              <Button
                className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary" size="md"
                onClick={handleFinishRound}
                disabled={completing}
              >
                {completing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </span>
                ) : (
                  <>
                    {isLastRound ? 'FINISH QUEST' : `FINISH ROUND ${currentRoundIndex + 1}`}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
