import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, Brain, LayoutGrid, CheckCircle2, RefreshCcw, Trophy,
  Star, Fingerprint, QrCode, Shield, ChevronRight, AlertCircle, Activity, ClipboardPaste, Copy, Check,
  Zap, MessageSquare, MapPin, Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TacticalStatus } from './TacticalStatus';
import { Button } from '@/components/ui/button';
import { verifyRunnerLocationQr, verifyRunnerPasskey, completeRunnerGame, updateGameState } from '@/lib/api';
import { QRScanner } from '@/components/QRScanner';

// ─── HAPTIC UTILITY ───────────────────────────────────────────
function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate(pattern); } catch { }
}

// ─── TAP GAME ─────────────────────────────────────────────────
const TapGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const [taps, setTaps] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const required = difficulty === 'hard' ? 25 : 15;
  const [timeLeft, setTimeLeft] = useState(difficulty === 'hard' ? 20 : 25);

  useEffect(() => {
    if (timeLeft > 0 && taps < required) {
      const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
      return () => clearInterval(t);
    }
    if (taps >= required) onComplete();
  }, [timeLeft, taps, onComplete]);

  const handleTap = () => {
    haptic(25);
    setTaps((t) => t + 1);
    // Constrain to 15–75% to avoid tap target clipping near edges on small phones
    setTarget({ x: Math.random() * 60 + 15, y: Math.random() * 55 + 15 });
  };

  if (taps >= required) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
        <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[var(--color-accent)]">Target Neutralized!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  if (timeLeft === 0) return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <TacticalStatus
        tone="error"
        label="Operation Failure"
        message="Time Expired"
        icon={RefreshCcw}
      />
      <button
        onClick={() => { setTaps(0); setTimeLeft(difficulty === 'hard' ? 20 : 25); haptic(100); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-colors text-white/80 clip-oct"
      >🔄 Try Again</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-mono text-white/40 px-1">
        <span>HITS: <span className="text-[var(--color-accent)]">{taps}</span>/{required}</span>
        <span>TIME: <span className={timeLeft <= 5 ? 'text-[var(--color-accent)]' : 'text-white/80'}>{timeLeft}s</span></span>
      </div>
      {/* Arena: fluid height — scales from 200px on small phones to 360px on large screens */}
      <div className="relative w-full bg-black overflow-hidden border-b border-white/10" style={{ height: 'clamp(200px, 42dvh, 360px)' }}>
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        <div className="absolute bottom-0 left-0 h-1 bg-[var(--color-accent)]/20 w-full">
          <motion.div className="h-full bg-[var(--color-accent)]" animate={{ width: `${(taps / required) * 100}%` }} transition={{ type: 'spring', stiffness: 300 }} />
        </div>
        <motion.button
          animate={{ left: `${target.x}%`, top: `${target.y}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={handleTap}
          className="absolute w-16 h-16 bg-[var(--color-accent)] clip-oct shadow-accent-lg flex items-center justify-center -translate-x-1/2 -translate-y-1/2 active:scale-75 transition-transform"
        >
          <Crosshair className="text-black w-7 h-7" />
        </motion.button>
      </div>
    </div>
  );
};

// ─── MEMORY GAME ──────────────────────────────────────────────
const MemoryGame = ({ onComplete, difficulty = 'normal' }: { onComplete: () => void, difficulty?: 'normal' | 'hard' }) => {
  const allSymbols = ['🚀', '💻', '⚡', '🧠', '🔒', '🔑', '🎯', '📡', '🛡️'];
  const symbols = difficulty === 'hard' ? allSymbols : allSymbols.slice(0, 6);
  const [cards] = useState(() => [...symbols, ...symbols].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);

  useEffect(() => {
    if (flipped.length === 2) {
      if (cards[flipped[0]] === cards[flipped[1]]) {
        haptic([50, 30, 50]);
        setSolved((s) => [...s, ...flipped]);
        setFlipped([]);
      } else {
        haptic(100);
        const t = setTimeout(() => setFlipped([]), 800);
        return () => clearTimeout(t);
      }
    }
  }, [flipped, cards]);

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

  return (
    <div className="space-y-4">
      <div className="text-sm font-mono text-white/40 text-center">
        MATCHED: <span className="text-[var(--color-accent)]">{solved.length / 2}</span>/{symbols.length}
      </div>
      <div className={`grid gap-2 xs:gap-2.5 ${difficulty === 'hard' ? 'grid-cols-4' : 'grid-cols-3'}`}>
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

  const colorClasses = [
    { bg: 'bg-[var(--color-accent)]', dim: 'bg-[var(--color-accent)]/20' },
    { bg: 'bg-[var(--color-accent)] brightness-150', dim: 'bg-[var(--color-accent)]/10' },
    { bg: 'bg-[#99001A]', dim: 'bg-[#99001A]/40' },
    { bg: 'bg-white', dim: 'bg-white/20' },
  ];

  const start = () => {
    const patternLength = difficulty === 'hard' ? 7 : 4;
    const newPattern = Array.from({ length: patternLength }, () => Math.floor(Math.random() * 4));
    setPattern(newPattern); setUserPattern([]); setPlaying(true); setWrongFlash(false);
    playPatternSeq(newPattern);
  };

  const playPatternSeq = async (p: number[]) => {
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < p.length; i++) {
      setActive(p[i]); haptic(30);
      await new Promise((r) => setTimeout(r, 600));
      setActive(null);
      await new Promise((r) => setTimeout(r, 250));
    }
    setPlaying(false);
  };

  const handlePress = (i: number) => {
    if (playing) return;
    haptic(20);
    const next = [...userPattern, i];
    setUserPattern(next);
    if (pattern[userPattern.length] !== i) {
      setWrongFlash(true); haptic([100, 50, 100]);
      setTimeout(() => start(), 1000);
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
            message="Sequence Mismatch: Restarting"
            icon={AlertCircle}
          />
        </motion.div>
      )}
      <div className="text-sm font-mono text-white/40 text-center">
        {pattern.length === 0 ? 'Press Start to begin' : playing ? '⟐ Watch the pattern…' : '⟐ Repeat the pattern!'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i} whileTap={{ scale: 0.92 }} onClick={() => handlePress(i)}
            className={`cursor-pointer transition-all duration-200 border-0 ${active === i ? `${colorClasses[i].bg} shadow-lg scale-105` : colorClasses[i].dim}`}
            style={{ height: 'clamp(80px, 22vw, 120px)' }}
          />
        ))}
      </div>
      <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 font-bold text-lg transition-colors border-0 mt-4 clip-oct">
        {pattern.length === 0 ? '▶ Start Pattern' : '🔄 Replay'}
      </button>
    </div>
  );
};

// ─── TYPES ────────────────────────────────────────────────────
type GameType = 'tap' | 'memory' | 'pattern';
type RunnerScreen = 'location' | 'qr_scanner' | 'passkey' | 'game' | 'victory';

interface RunnerGameProps {
  token: string;
  currentRoundIndex: number;
  totalRounds: number;
  onRoundComplete: () => void;
  stage?: string;
  currentRound?: any;
  onSwitchToMap?: () => void;
  difficulty?: 'normal' | 'hard';
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
  difficulty = 'normal'
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
  const [passkey, setPasskey] = useState('');
  const [gameType, setGameType] = useState<GameType>('tap');
  const [error, setError] = useState<string | null>(null);
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
  const [verifyingLocationQr, setVerifyingLocationQr] = useState(false);
  const [completing, setCompleting] = useState(false);

  const gameInfo: Record<GameType, { title: string; icon: React.ReactNode; color: string }> = {
    tap: { title: 'TARGET LOCK', icon: <Crosshair className="w-6 h-6 text-[var(--color-accent)]" />, color: 'text-[var(--color-accent)]' },
    memory: { title: 'NEURAL DECODE', icon: <Brain className="w-6 h-6 text-blue-400" />, color: 'text-blue-400' },
    pattern: { title: 'CIPHER CRACK', icon: <LayoutGrid className="w-6 h-6 text-purple-400" />, color: 'text-purple-400' },
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
      setCompleting(false);
    }
  };

  const info = gameInfo[gameType];
  const isLastRound = currentRoundIndex >= totalRounds - 1;

  return (
    <AnimatePresence mode="wait">
      {/* ── LOCATION VERIFICATION ── */}
      {screen === 'location' && (
        <motion.div key="location" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="corner-card glass-morphism relative p-8 max-w-md mx-auto">

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
                    <span className="text-[10px] uppercase text-white/40 block mb-1">Passkey</span>
                    <span className="text-xl font-bold tracking-[0.3em] break-all">{currentRound.qrPasskey}</span>
                    <button 
                      onClick={handleCopyPasskey}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-[var(--color-accent)] transition-colors"
                      title="Copy Passkey"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
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
                  className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary !bg-[var(--color-accent)] !text-white hover:brightness-125 transition-all" size="md"
                  onClick={() => { setError(null); setScreen('qr_scanner'); }}
                >
                  <QrCode className="mr-2 h-5 w-5" /> SCAN LOCATION QR
                </Button>


                

              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── QR SCANNER ── */}
      {screen === 'qr_scanner' && (
        <motion.div key="qr_scanner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-md mx-auto">
          <QRScanner
            onScan={async (text) => {
              if (verifyingLocationQr) return;

              setVerifyingLocationQr(true);
              try {
                await verifyRunnerLocationQr(token, text.trim());
                setError(null);
                setScreen('passkey');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Invalid Location QR. Area Restricted.');
                setScreen('location');
              } finally {
                setVerifyingLocationQr(false);
              }
            }}
            onClose={() => setScreen('location')}
          />
        </motion.div>
      )}

      {/* ── PASSKEY ENTRY ── */}
      {screen === 'passkey' && (
        <motion.div key="passkey" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="corner-card glass-morphism relative p-8 max-w-md mx-auto">

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
                    <span className="text-[10px] uppercase text-white/40 block mb-1">Passkey</span>
                    <span className="text-xl font-bold tracking-[0.3em] break-all">{currentRound.qrPasskey}</span>
                    <button 
                      onClick={handleCopyPasskey}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-[var(--color-accent)] transition-colors"
                      title="Copy Passkey"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
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
                  className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary" size="md"
                  onClick={handleVerifyPasskey}
                  disabled={isVerifyingPasskey || !passkey.trim()}
                >
                  {isVerifyingPasskey ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (<><QrCode className="mr-2 h-5 w-5" />UNLOCK_GAME</>)}
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
            <div className="flex items-center justify-between p-6 border-b border-white/5">
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
            <div className="p-6">
              {gameType === 'tap' && <TapGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'memory' && <MemoryGame onComplete={handleGameComplete} difficulty={difficulty} />}
              {gameType === 'pattern' && <PatternGame onComplete={handleGameComplete} difficulty={difficulty} />}
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
          <div className="corner-card glass-morphism p-8 relative text-center overflow-hidden">

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
