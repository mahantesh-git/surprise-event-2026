import React, { useState, useEffect } from "react";
import {
  Crosshair, MapPin, Shield, ChevronRight, AlertCircle, CheckCircle2,
  MousePointer2, Brain, LayoutGrid, RefreshCcw, Compass, Smartphone,
  QrCode, ArrowRight, Radio, Sparkles, Fingerprint, Trophy, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import confetti from "canvas-confetti";

// ============================================================
// SETUP & UTILITIES
// ============================================================
const EXPLORER_STORAGE_KEY = "explorer_team_name";

const socket: Socket = io({
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ["websocket", "polling"],
});

function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate(pattern); } catch {}
}

function celebrate() {
  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 300);
}

function bigCelebrate() {
  const duration = 2500;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

// ============================================================
// MINI GAMES — MOBILE ENHANCED
// ============================================================

// ─── TAP GAME ───
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
  }, [timeLeft, taps]);

  const handleTap = () => {
    haptic(25);
    setTaps((t) => t + 1);
    setTarget({ x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 });
  };

  if (taps >= required) {
    return (
      <div className="text-center p-6 space-y-4">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Target Neutralized!</h2>
        <p className="text-zinc-400 text-sm">Decrypting passkey...</p>
      </div>
    );
  }

  if (timeLeft === 0) {
    return (
      <div className="text-center p-8 space-y-6">
        <RefreshCcw className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-red-400">Time's Up!</h2>
        <button
          onClick={() => { setTaps(0); setTimeLeft(15); haptic(100); }}
          className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-mono text-zinc-400 px-1">
        <span>HITS: <span className="text-emerald-400">{taps}</span>/{required}</span>
        <span>TIME: <span className={timeLeft <= 5 ? "text-red-400" : "text-zinc-200"}>{timeLeft}s</span></span>
      </div>
      <div className="relative h-80 w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500/20 w-full">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${(taps / required) * 100}%` }}
            transition={{ type: "spring", stiffness: 300 }}
          />
        </div>
        {/* Target */}
        <motion.button
          animate={{ left: `${target.x}%`, top: `${target.y}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          onClick={handleTap}
          className="absolute w-16 h-16 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 active:scale-75 transition-transform"
        >
          <Crosshair className="text-zinc-950 w-7 h-7" />
        </motion.button>
      </div>
    </div>
  );
};

// ─── MEMORY GAME ───
const MemoryGame = ({ onComplete }: { onComplete: () => void }) => {
  const symbols = ["🚀", "💻", "⚡", "🧠", "🔒", "🔑"];
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
  }, [solved.length]);

  if (solved.length === cards.length) {
    return (
      <div className="text-center p-6 space-y-4">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
          <CheckCircle2 className="w-16 h-16 text-blue-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Memory Decoded!</h2>
        <p className="text-zinc-400 text-sm">Decrypting passkey...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-mono text-zinc-400 text-center">
        MATCHED: <span className="text-blue-400">{solved.length / 2}</span>/{symbols.length}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((symbol, i) => {
          const isFlipped = flipped.includes(i);
          const isSolved = solved.includes(i);
          return (
            <motion.div
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                flipped.length < 2 && !isFlipped && !isSolved && (
                  haptic(15),
                  setFlipped((f) => [...f, i])
                )
              }
              className={`h-20 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all duration-200 select-none border ${
                isFlipped || isSolved
                  ? "bg-blue-500/20 border-blue-500/40 text-white scale-105"
                  : "bg-zinc-800 border-zinc-700/50 hover:bg-zinc-700"
              }`}
            >
              {isFlipped || isSolved ? symbol : (
                <span className="text-zinc-600 text-lg">?</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PATTERN GAME ───
const PatternGame = ({ onComplete }: { onComplete: () => void }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  const colorClasses = [
    { bg: "bg-red-500", dim: "bg-red-500/20 border-red-500/30", glow: "shadow-red-500/40" },
    { bg: "bg-blue-500", dim: "bg-blue-500/20 border-blue-500/30", glow: "shadow-blue-500/40" },
    { bg: "bg-yellow-500", dim: "bg-yellow-500/20 border-yellow-500/30", glow: "shadow-yellow-500/40" },
    { bg: "bg-green-500", dim: "bg-green-500/20 border-green-500/30", glow: "shadow-green-500/40" },
  ];

  const start = () => {
    const newPattern = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    setPattern(newPattern);
    setUserPattern([]);
    setPlaying(true);
    setWrongFlash(false);
    playPattern(newPattern);
  };

  const playPattern = async (p: number[]) => {
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < p.length; i++) {
      setActive(p[i]);
      haptic(30);
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
      setWrongFlash(true);
      haptic([100, 50, 100]);
      setTimeout(() => start(), 1000);
      return;
    }
    if (next.length === pattern.length) {
      setStep(1);
      onComplete();
    }
  };

  if (step === 1) {
    return (
      <div className="text-center p-6 space-y-4">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
          <CheckCircle2 className="w-16 h-16 text-purple-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Pattern Cracked!</h2>
        <p className="text-zinc-400 text-sm">Decrypting passkey...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {wrongFlash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-red-400 text-sm font-mono shake"
        >
          ✘ Wrong sequence! Restarting...
        </motion.div>
      )}
      <div className="text-sm font-mono text-zinc-400 text-center">
        {pattern.length === 0 ? "Press Start to begin" : playing ? "⟐ Watch the pattern..." : "⟐ Repeat the pattern!"}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            whileTap={{ scale: 0.92 }}
            onClick={() => handlePress(i)}
            className={`h-28 rounded-2xl cursor-pointer transition-all duration-200 border ${
              active === i
                ? `${colorClasses[i].bg} shadow-lg ${colorClasses[i].glow} scale-105`
                : `${colorClasses[i].dim}`
            }`}
          />
        ))}
      </div>
      <button
        onClick={start}
        className="w-full bg-zinc-800 hover:bg-zinc-700 py-4 rounded-xl font-bold text-lg transition-colors border border-zinc-700/50"
      >
        {pattern.length === 0 ? "▶ Start Pattern" : "🔄 Replay"}
      </button>
    </div>
  );
};

// ============================================================
// LANDING SCREEN
// ============================================================
const LandingScreen = ({ onJoinTeam }: { onJoinTeam: (name: string) => void }) => {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    setError("");
    try {
      // Verify team exists on the server
      const res = await fetch(`/api/team/${encodeURIComponent(teamName.trim())}`);
      if (res.ok) {
        onJoinTeam(teamName.trim());
      } else {
        setError("Team not found. Ask your Solver to create the team first.");
      }
    } catch {
      // Offline mode: join anyway
      onJoinTeam(teamName.trim());
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: "01", text: "Get the location clue from your Solver", icon: Radio, color: "text-cyan-500" },
    { num: "02", text: "Go to the location & find the QR code", icon: QrCode, color: "text-emerald-500" },
    { num: "03", text: "Scan QR → Play the challenge game", icon: Smartphone, color: "text-blue-500" },
    { num: "04", text: "Win & tell the passkey to your Solver", icon: Shield, color: "text-purple-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-5 space-y-8"
    >
      {/* Radar/Compass */}
      <div className="relative w-28 h-28 slide-up">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 sonar-pulse" />
        <div className="absolute inset-3 rounded-full border border-emerald-500/15 sonar-pulse" style={{ animationDelay: "0.7s" }} />
        <div className="absolute inset-6 rounded-full border border-emerald-500/10 sonar-pulse" style={{ animationDelay: "1.4s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <Compass className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2 slide-up slide-up-delay-1">
        <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 text-transparent bg-clip-text">
          EXPLORER MODE
        </h1>
        <p className="text-zinc-500 text-sm font-mono">Field Agent Terminal v2.0</p>
      </div>

      {/* Mission Steps */}
      <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 slide-up slide-up-delay-2">
        <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em]">
          Your Mission Protocol
        </p>
        <div className="space-y-3">
          {steps.map(({ num, text, icon: Icon, color }) => (
            <div key={num} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <span className="text-emerald-500/60 font-mono text-[10px]">[{num}]</span>
                <p className="text-zinc-300 text-sm leading-snug">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Join */}
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-3 slide-up slide-up-delay-3">
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter your team name..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-200 text-center text-lg focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={!teamName.trim() || loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            <>
              JOIN MISSION
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </form>

      {/* QR hint */}
      <div className="text-center text-zinc-600 text-xs space-y-1 slide-up slide-up-delay-4">
        <p>— or scan a QR code to jump straight into a game —</p>
      </div>
    </motion.div>
  );
};

// ============================================================
// WAITING / JOINED SCREEN
// ============================================================
const JoinedScreen = ({ teamName }: { teamName: string }) => {
  const [clue, setClue] = useState<string | null>(null);
  const [gameType, setGameType] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(0);

  useEffect(() => {
    // Join team room for real-time updates
    socket.emit("explorerJoin", teamName);

    const handleClue = (data: { clue: string; gameType: string; level: number }) => {
      setClue(data.clue);
      setGameType(data.gameType);
      setLevel(data.level);
      haptic([100, 50, 100]);
    };

    socket.on("clueUnlocked", handleClue);

    // Re-join on reconnect
    const handleConnect = () => {
      socket.emit("explorerJoin", teamName);
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("clueUnlocked", handleClue);
      socket.off("connect", handleConnect);
    };
  }, [teamName]);

  // Mission Active — Solver sent a clue!
  if (clue) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8"
      >
        <div className="float">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <MapPin className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">MISSION ACTIVE</h1>
          <p className="text-zinc-400 text-sm">Your Solver decoded a location!</p>
        </div>

        <div className="w-full max-w-sm bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 glow-emerald">
          <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-3">📍 Go To Location</p>
          <p className="text-xl font-bold text-emerald-400 text-center leading-relaxed">{clue}</p>
        </div>

        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          <p className="text-sm text-zinc-300 font-medium">📱 When you arrive:</p>
          <p className="text-xs text-zinc-500">
            Find the QR code at this location and scan it with your phone camera. It will open the challenge game.
          </p>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 text-xs font-mono">
          <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-live" />
          Level {level + 1} • Game: {gameType}
        </div>
      </motion.div>
    );
  }

  // Waiting for Solver
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8"
    >
      {/* Sonar animation */}
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 sonar-pulse" />
        <div className="absolute inset-3 rounded-full border border-cyan-500/15 sonar-pulse" style={{ animationDelay: "0.8s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center">
            <Radio className="w-8 h-8 text-cyan-500" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">STANDING BY</h1>
        <p className="text-zinc-400 text-sm">
          Waiting for <span className="text-cyan-400 font-bold">{teamName}</span>'s Solver...
        </p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-cyan-500/70">
          <span className="w-2 h-2 bg-cyan-500 rounded-full pulse-live" />
          <span className="text-xs font-mono uppercase tracking-widest">Live Connection</span>
        </div>
        <p className="text-zinc-500 text-sm">
          Your Solver is working on the puzzle. Once they decode the location clue, you'll be notified here instantly.
        </p>
      </div>

      <div className="text-center text-zinc-600 text-xs space-y-1 max-w-xs">
        <p>💡 You can also scan a QR code at any location to jump straight into a game challenge.</p>
      </div>
    </motion.div>
  );
};

// ============================================================
// GAME SCREEN WRAPPER
// ============================================================
const GameScreen = ({
  gameType,
  level,
  onComplete,
}: {
  gameType: "tap" | "memory" | "pattern";
  level: number;
  onComplete: () => void;
}) => {
  const gameInfo: Record<string, { title: string; icon: React.ReactNode; color: string; borderColor: string }> = {
    tap: {
      title: "TARGET LOCK",
      icon: <Crosshair className="w-6 h-6 text-emerald-500" />,
      color: "text-emerald-500",
      borderColor: "border-emerald-500/20",
    },
    memory: {
      title: "NEURAL DECODE",
      icon: <Brain className="w-6 h-6 text-blue-500" />,
      color: "text-blue-500",
      borderColor: "border-blue-500/20",
    },
    pattern: {
      title: "CIPHER CRACK",
      icon: <LayoutGrid className="w-6 h-6 text-purple-500" />,
      color: "text-purple-500",
      borderColor: "border-purple-500/20",
    },
  };

  const info = gameInfo[gameType] || gameInfo.tap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col p-4 pt-8"
    >
      {/* Game Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border ${info.borderColor}`}>
            {info.icon}
          </div>
          <div>
            <h1 className={`text-lg font-bold font-mono ${info.color}`}>{info.title}</h1>
            <p className="text-[10px] font-mono text-zinc-600 uppercase">Level {level + 1} Challenge</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-mono">
          <Fingerprint className="w-3.5 h-3.5" />
          <span>EXPLORER</span>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`w-full max-w-md bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-2xl`}>
          {gameType === "tap" && <TapGame onComplete={onComplete} />}
          {gameType === "memory" && <MemoryGame onComplete={onComplete} />}
          {gameType === "pattern" && <PatternGame onComplete={onComplete} />}
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center text-zinc-700 text-[10px] font-mono py-4 uppercase tracking-widest">
        Complete the challenge to earn your passkey
      </div>
    </motion.div>
  );
};

// ============================================================
// PASSKEY REVEAL SCREEN
// ============================================================
const PasskeyReveal = ({ passkey }: { passkey: string }) => {
  useEffect(() => {
    bigCelebrate();
    haptic([100, 50, 100, 50, 200]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8"
    >
      {/* Victory icon */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center glow-emerald">
          <Trophy className="w-12 h-12 text-emerald-500" />
        </div>
      </motion.div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
          GAME COMPLETE!
        </h1>
        <p className="text-zinc-400 text-sm">Your passkey has been decrypted.</p>
      </div>

      {/* Passkey Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 glow-emerald"
      >
        <p className="text-[10px] font-mono uppercase text-zinc-500 text-center tracking-[0.2em]">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Decoded Passkey
        </p>
        <div className="text-4xl font-mono font-bold text-emerald-400 text-center tracking-[0.15em] bg-zinc-950 p-5 rounded-xl select-all passkey-glow">
          {passkey}
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center space-y-3 max-w-xs"
      >
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 space-y-2">
          <p className="font-bold text-cyan-400 text-sm flex items-center justify-center gap-2">
            <Radio className="w-4 h-4" />
            TELL YOUR SOLVER!
          </p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Go back to your Solver and tell them this passkey. They will enter it on their computer to unlock the next level.
          </p>
        </div>
      </motion.div>

      {/* Stars decoration */}
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          >
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================================
// INVALID GAME SCREEN
// ============================================================
const InvalidGameScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-6">
    <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center">
      <AlertCircle className="w-10 h-10 text-red-500/50" />
    </div>
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold text-zinc-300">Invalid Game Link</h1>
      <p className="text-zinc-500 text-sm">This QR code link is not valid.</p>
    </div>
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-w-xs">
      <p className="text-zinc-400 text-xs text-center">
        Make sure you scanned the correct QR code at the location. Ask your Solver or event admin for help.
      </p>
    </div>
  </div>
);

// ============================================================
// MAIN EXPLORER APP
// ============================================================
export default function ExplorerApp() {
  const params = new URLSearchParams(window.location.search);
  const gameParam = params.get("game") as "tap" | "memory" | "pattern" | null;
  const levelParam = parseInt(params.get("level") || "0");

  const validGames = ["tap", "memory", "pattern"];
  const hasValidGame = gameParam && validGames.includes(gameParam);

  const [screen, setScreen] = useState<"landing" | "joined" | "game" | "passkey" | "invalid">(
    gameParam ? (hasValidGame ? "game" : "invalid") : "landing"
  );
  const [passkey, setPasskey] = useState("");
  const [teamName, setTeamName] = useState(() => {
    try { return localStorage.getItem(EXPLORER_STORAGE_KEY) || ""; } catch { return ""; }
  });

  const handleJoinTeam = (name: string) => {
    setTeamName(name);
    try { localStorage.setItem(EXPLORER_STORAGE_KEY, name); } catch {}
    setScreen("joined");
    haptic(50);
  };

  const handleGameComplete = async () => {
    celebrate();
    haptic([100, 50, 100, 50, 200]);

    // Give a brief moment for the "Decrypting..." text to show
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const res = await fetch("/api/explorer/complete-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: levelParam,
          gameType: gameParam,
          teamName: teamName || undefined,
        }),
      });
      const data = await res.json();
      if (data.passkey) {
        setPasskey(data.passkey);
        setScreen("passkey");
        return;
      }
    } catch {}

    // Fallback passkeys for offline resilience
    const fallbackKeys: Record<string, string> = {
      tap: "BCA_ROCKZ",
      memory: "CODE_MASTER",
      pattern: "TREASURE_FOUND",
    };
    setPasskey(fallbackKeys[gameParam || ""] || "UNKNOWN");
    setScreen("passkey");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-emerald-500/30 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingScreen onJoinTeam={handleJoinTeam} />
          </motion.div>
        )}
        {screen === "joined" && (
          <motion.div key="joined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JoinedScreen teamName={teamName} />
          </motion.div>
        )}
        {screen === "game" && hasValidGame && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameScreen gameType={gameParam!} level={levelParam} onComplete={handleGameComplete} />
          </motion.div>
        )}
        {screen === "passkey" && (
          <motion.div key="passkey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PasskeyReveal passkey={passkey} />
          </motion.div>
        )}
        {screen === "invalid" && (
          <motion.div key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InvalidGameScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background radial glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.06)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.04)_0%,transparent_50%)]" />
      </div>
    </div>
  );
}
