import React, { useState } from 'react';
import { Clock, Zap, Flame, CheckCircle, SkipForward, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Arena1GameState, Arena1Question } from '@/lib/api';

interface Arena1HUDProps {
  gameState: Arena1GameState | null;
  question: Arena1Question | null;
  timeLeftMs: number;
  onSubmit: () => void;
  onSkip: () => void;
  onSwap: () => void;
  isSubmitting: boolean;
  isSkipping: boolean;
  isSwapping: boolean;
}

export function Arena1HUD({
  gameState,
  question,
  timeLeftMs,
  onSubmit,
  onSkip,
  onSwap,
  isSubmitting,
  isSkipping,
  isSwapping
}: Arena1HUDProps) {
  const [briefOpen, setBriefOpen] = useState(true);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeftMs < 60000;
  const slotNumber = (gameState?.currentSlot ?? 0) + 1;
  const isDone = gameState?.status === 'done';
  const isWaiting = gameState?.status === 'waiting';

  return (
    <div className="w-full space-y-2">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-black/80 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-4 shadow-lg">

        {/* Left: Slot + Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black tracking-widest text-white/40 uppercase">
              Slot {slotNumber} / 4 &bull; {question?.type?.toUpperCase() || 'LOADING'}
            </div>
            <div className="text-sm font-bold text-white truncate">
              {isDone ? 'Arena Completed' : isWaiting ? 'Waiting for Admin to Start...' : (question?.title || 'Awaiting Intel...')}
            </div>
          </div>
        </div>

        {/* Center: Timer */}
        <div className="flex flex-col items-center shrink-0">
          <div className={cn(
            "text-2xl font-black tracking-widest tabular-nums transition-colors",
            isWarning && !isWaiting ? "text-red-500 animate-pulse" : "text-white"
          )}>
            {isWaiting ? '--:--' : formatTime(timeLeftMs)}
          </div>
          <div className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">
            Time Remaining
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Brief toggle */}
          {question?.description && (
            <button
              onClick={() => setBriefOpen(o => !o)}
              className="flex flex-col items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white rounded transition-colors"
              title="Toggle question brief"
            >
              {briefOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {/* Swap */}
          <button
            onClick={onSwap}
            disabled={isSwapping || isDone || isWaiting || (gameState?.swapsLeft || 0) <= 0}
            className="flex flex-col items-center justify-center w-14 h-10 bg-white/5 hover:bg-red-500/10 border border-red-500/30 text-red-400 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title={`Burn Swap (${gameState?.swapsLeft} left)`}
          >
            {isSwapping ? <Loader2 className="w-3 h-3 animate-spin mb-0.5" /> : <Flame className="w-3 h-3 mb-0.5" />}
            <span className="text-[8px] font-black tracking-wider uppercase">{gameState?.swapsLeft} Left</span>
          </button>

          {/* Skip */}
          <button
            onClick={onSkip}
            disabled={isSkipping || isDone || isWaiting}
            className="flex flex-col items-center justify-center w-14 h-10 bg-white/5 hover:bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {isSkipping ? <Loader2 className="w-3 h-3 animate-spin mb-0.5" /> : <SkipForward className="w-3 h-3 mb-0.5" />}
            <span className="text-[8px] font-black tracking-wider uppercase">Skip</span>
          </button>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={isSubmitting || isDone || isWaiting}
            className="flex items-center gap-2 h-10 px-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-black font-black uppercase tracking-widest text-[10px] rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Data
          </button>
        </div>
      </div>

      {/* ── Question Brief ───────────────────────────────────────────────── */}
      {briefOpen && question?.description && !isDone && !isWaiting && (
        <div className="bg-black/60 border border-[var(--color-accent)]/20 rounded-lg px-5 py-4">
          <div className="text-[9px] font-black tracking-[0.3em] text-[var(--color-accent)] uppercase mb-2">
            Mission Brief
          </div>
          <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
            {question.description}
          </pre>
        </div>
      )}
    </div>
  );
}
