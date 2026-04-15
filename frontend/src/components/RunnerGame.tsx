import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, Brain, LayoutGrid, CheckCircle2, RefreshCcw, Trophy,
  Star, Fingerprint, QrCode, Shield, ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyRunnerPasskey, completeRunnerGame } from '@/lib/api';
import { QRScanner } from '@/components/QRScanner';
import { MapPin } from 'lucide-react';

// ─── HAPTIC UTILITY ───────────────────────────────────────────
function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate(pattern); } catch {}
}

// ─── TAP GAME ─────────────────────────────────────────────────
const TapGame = ({ onComplete }: { onComplete: () => void }) => {
  const [taps, setTaps] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(15);
  const required = 10;

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
    setTarget({ x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 });
  };

  if (taps >= required) return (
    <div className="text-center p-6 space-y-4">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
        <CheckCircle2 className="w-16 h-16 text-[#95FF00] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[#95FF00]">Target Neutralized!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  if (timeLeft === 0) return (
    <div className="text-center p-8 space-y-6">
      <RefreshCcw className="w-16 h-16 text-rose-500 mx-auto" />
      <h2 className="text-2xl font-bold text-rose-400">Time's Up!</h2>
      <button
        onClick={() => { setTaps(0); setTimeLeft(15); haptic(100); }}
        className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors border border-zinc-700"
      >🔄 Try Again</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-mono text-white/40 px-1">
        <span>HITS: <span className="text-[#95FF00]">{taps}</span>/{required}</span>
        <span>TIME: <span className={timeLeft <= 5 ? 'text-rose-400' : 'text-white/80'}>{timeLeft}s</span></span>
      </div>
      <div className="relative h-72 w-full bg-black rounded-xl overflow-hidden border border-white/10">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        <div className="absolute bottom-0 left-0 h-1 bg-[#95FF00]/20 w-full">
          <motion.div className="h-full bg-[#95FF00]" animate={{ width: `${(taps / required) * 100}%` }} transition={{ type: 'spring', stiffness: 300 }} />
        </div>
        <motion.button
          animate={{ left: `${target.x}%`, top: `${target.y}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={handleTap}
          className="absolute w-16 h-16 bg-[#95FF00] rounded-full shadow-lg shadow-[#95FF00]/40 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 active:scale-75 transition-transform"
        >
          <Crosshair className="text-black w-7 h-7" />
        </motion.button>
      </div>
    </div>
  );
};

// ─── MEMORY GAME ──────────────────────────────────────────────
const MemoryGame = ({ onComplete }: { onComplete: () => void }) => {
  const symbols = ['🚀', '💻', '⚡', '🧠', '🔒', '🔑'];
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
        <CheckCircle2 className="w-16 h-16 text-[#95FF00] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[#95FF00]">Memory Decoded!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-sm font-mono text-white/40 text-center">
        MATCHED: <span className="text-[#95FF00]">{solved.length / 2}</span>/{symbols.length}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((symbol, i) => {
          const isFlipped = flipped.includes(i);
          const isSolved = solved.includes(i);
          return (
            <motion.div
              key={i} whileTap={{ scale: 0.9 }}
              onClick={() => flipped.length < 2 && !isFlipped && !isSolved && (haptic(15), setFlipped((f) => [...f, i]))}
              className={`h-20 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all duration-200 select-none border ${
                isFlipped || isSolved ? 'bg-[#95FF00]/20 border-[#95FF00]/40 text-white scale-105' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
              }`}
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
const PatternGame = ({ onComplete }: { onComplete: () => void }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const colorClasses = [
    { bg: 'bg-rose-500', dim: 'bg-rose-500/20 border-rose-500/30' },
    { bg: 'bg-blue-500', dim: 'bg-blue-500/20 border-blue-500/30' },
    { bg: 'bg-yellow-500', dim: 'bg-yellow-500/20 border-yellow-500/30' },
    { bg: 'bg-[#95FF00]', dim: 'bg-[#95FF00]/20 border-[#95FF00]/30' },
  ];

  const start = () => {
    const newPattern = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
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
        <CheckCircle2 className="w-16 h-16 text-[#95FF00] mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[#95FF00]">Pattern Cracked!</h2>
      <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Decrypting access...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {wrongFlash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-rose-400 text-sm font-mono">✘ Wrong sequence! Restarting...</motion.div>}
      <div className="text-sm font-mono text-white/40 text-center">
        {pattern.length === 0 ? 'Press Start to begin' : playing ? '⟐ Watch the pattern…' : '⟐ Repeat the pattern!'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i} whileTap={{ scale: 0.92 }} onClick={() => handlePress(i)}
            className={`h-28 rounded-2xl cursor-pointer transition-all duration-200 border ${active === i ? `${colorClasses[i].bg} shadow-lg scale-105` : colorClasses[i].dim}`}
          />
        ))}
      </div>
      <button onClick={start} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 rounded-xl font-bold text-lg transition-colors border border-zinc-800">
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
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export function RunnerGame({ token, currentRoundIndex, totalRounds, onRoundComplete }: RunnerGameProps) {
  const [screen, setScreen] = useState<RunnerScreen>('location');
  const [passkey, setPasskey] = useState('');
  const [gameType, setGameType] = useState<GameType>('tap');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const gameInfo: Record<GameType, { title: string; icon: React.ReactNode; color: string }> = {
    tap:     { title: 'TARGET LOCK',    icon: <Crosshair className="w-6 h-6 text-[#95FF00]" />,  color: 'text-[#95FF00]' },
    memory:  { title: 'NEURAL DECODE',  icon: <Brain className="w-6 h-6 text-blue-400" />,        color: 'text-blue-400' },
    pattern: { title: 'CIPHER CRACK',   icon: <LayoutGrid className="w-6 h-6 text-purple-400" />, color: 'text-purple-400' },
  };

  const handleVerifyPasskey = async () => {
    if (!passkey.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const data = await verifyRunnerPasskey(token, passkey.trim());
      setGameType(data.gameType as GameType);
      setScreen('game');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGameComplete = async () => {
    setScreen('victory');
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
          <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative max-w-md mx-auto">
            <div className="corner-br" /><div className="corner-bl" />
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#95FF00]/10 border border-[#95FF00]/30 flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8 text-[#95FF00]" />
                </div>
                <span className="label-technical block">Location Verification</span>
                <h2 className="text-xl font-bold tracking-widest uppercase">Arrived at Node?</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                  Verify your physical presence by scanning the Authorized QR code at this location.
                </p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </motion.div>
              )}

              <Button
                className="w-full font-bold uppercase tracking-[0.2em] h-14"
                variant="sage" size="md"
                onClick={() => { setError(null); setScreen('qr_scanner'); }}
              >
                <QrCode className="mr-2 h-5 w-5" /> SCAN LOCATION QR
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── QR SCANNER ── */}
      {screen === 'qr_scanner' && (
        <motion.div key="qr_scanner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-md mx-auto">
          <QRScanner
            onScan={(text) => {
              if (text.trim() === "QUEST-AUTHORIZED-LOCATION") {
                setError(null);
                setScreen('passkey');
              } else {
                setError('Invalid Location QR. Area Restricted.');
                setScreen('location');
              }
            }}
            onClose={() => setScreen('location')}
          />
        </motion.div>
      )}

      {/* ── PASSKEY ENTRY ── */}
      {screen === 'passkey' && (
        <motion.div key="passkey" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative max-w-md mx-auto">
            <div className="corner-br" /><div className="corner-bl" />
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#95FF00]/10 border border-[#95FF00]/30 flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-[#95FF00]" />
                </div>
                <span className="label-technical block">Biometric Authentication</span>
                <h2 className="text-xl font-bold tracking-widest uppercase">Enter Location Passkey</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                  Ask your Solver for the passkey. They received it after solving the puzzle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    placeholder="PASSKEY..."
                    className="w-full high-clearance-input text-center h-16 text-xl tracking-[0.3em] uppercase"
                    value={passkey}
                    onChange={(e) => { setPasskey(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasskey()}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {error && <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-rose-500" />}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </motion.div>
                )}

                <Button
                  className="w-full font-bold uppercase tracking-[0.2em] h-14"
                  variant="sage" size="md"
                  onClick={handleVerifyPasskey}
                  disabled={verifying || !passkey.trim()}
                >
                  {verifying ? (
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
          <div className="corner-card bg-black/40 backdrop-blur-xl border border-white/5 relative">
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
              {gameType === 'tap' && <TapGame onComplete={handleGameComplete} />}
              {gameType === 'memory' && <MemoryGame onComplete={handleGameComplete} />}
              {gameType === 'pattern' && <PatternGame onComplete={handleGameComplete} />}
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
          <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-[#95FF00]/30 relative text-center overflow-hidden">
            <div className="corner-br" /><div className="corner-bl" />
            <div className="absolute inset-0 bg-[#95FF00]/5 pointer-events-none" />
            <div className="relative z-10 space-y-8">

              <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <div className="w-24 h-24 bg-[#95FF00]/10 border border-[#95FF00]/30 flex items-center justify-center mx-auto">
                  <Trophy className="w-12 h-12 text-[#95FF00]" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-[0.3em] uppercase text-[#95FF00]">CHALLENGE COMPLETE!</h2>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                  Round {currentRoundIndex + 1} successfully cleared.
                </p>
              </div>

              <div className="bg-[#95FF00]/5 border border-[#95FF00]/20 p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-[#95FF00] font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
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
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </motion.div>
                ))}
              </div>

              <Button
                className="w-full font-bold uppercase tracking-[0.2em] h-14"
                variant="sage" size="md"
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
