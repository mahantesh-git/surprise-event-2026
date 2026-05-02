import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useArena1 } from '@/hooks/useArena1';
import { Arena1HUD } from '@/components/Arena1HUD';
import { TriPanelEditor, TriPanelCode } from '@/components/TriPanelEditor';
import { TacticalBackground } from '@/components/TacticalBackground';
import { Terminal, ShieldAlert, CheckCircle2, Eye } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import type { TeamSession } from '@/hooks/useGameState';

interface Arena1AppProps {
  session: TeamSession;
  onLogout: () => void;
}

/** Builds the sandboxed HTML document that is rendered in the Runner's live preview */
function buildSrcDoc(code: TriPanelCode): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      /* Default: white background until solver writes code that overrides it */
      html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: sans-serif; }
      ${code.css}
    </style>
  </head>
  <body>
    ${code.html}
    <script>
      try { ${code.js} } catch(e) { console.error(e); }
    </script>
  </body>
</html>`;
}

export function Arena1App({ session, onLogout }: Arena1AppProps) {
  const { gameState, question, timeLeftMs, loading, error, submitCode, skipSlot, swapSlot } = useArena1(session);
  const { socket } = useSocket();
  const [code, setCode] = useState<TriPanelCode>({ html: '', css: '', js: '' });
  const isSolver = session.role === 'solver';

  // Action states (solver only)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  // Debounce ref for solver → socket emit
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset code whenever the question changes (new slot) ──────────────────
  useEffect(() => {
    if (question) {
      setCode({
        html: question.starterHtml || question.defaultCode || '',
        css: question.starterCss || '',
        js: question.starterJs || '',
      });
    } else {
      setCode({ html: '', css: '', js: '' });
    }
  }, [question?._id, gameState?.currentSlot]);

  // ── Runner: listen for real-time code updates from Solver ────────────────
  useEffect(() => {
    if (!socket || isSolver) return;

    const handleUpdate = (data: TriPanelCode) => setCode(data);
    socket.on('a1:code-update', handleUpdate);
    return () => { socket.off('a1:code-update', handleUpdate); };
  }, [socket, isSolver]);

  // ── Solver: broadcast code changes via socket (debounced 500ms) ──────────
  const handleCodeChange = useCallback((newCode: TriPanelCode) => {
    setCode(newCode);
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    emitTimerRef.current = setTimeout(() => {
      socket?.emit('a1:code-update', newCode);
    }, 500);
  }, [socket]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitCode(code.html, code.css, code.js);
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    if (!confirm('Skip this slot? You will receive 0 points.')) return;
    setIsSkipping(true);
    await skipSlot();
    setIsSkipping(false);
  };

  const handleSwap = async () => {
    if (!confirm('Use a Burn Swap? You will receive 0 pts for this question.')) return;
    setIsSwapping(true);
    await swapSlot();
    setIsSwapping(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && !gameState) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="w-8 h-8 text-[var(--color-accent)] animate-pulse" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Initializing Arena 1...</div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black p-6">
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-lg flex flex-col items-center gap-4 text-center max-w-md">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h2 className="text-red-500 font-bold uppercase tracking-widest">System Error</h2>
          <p className="text-white/70 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase tracking-widest transition-colors rounded"
          >
            Reboot Interface
          </button>
        </div>
      </div>
    );
  }

  const isDone = gameState?.status === 'done';
  const totalScore = gameState?.slotResults.reduce((acc, r) => acc + r.points, 0) || 0;
  const srcDoc = buildSrcDoc(code);

  // ── Runner View ─────────────────────────────────────────────────────────
  if (!isSolver) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col relative overflow-hidden">
        <TacticalBackground />
        {/* Minimal runner header */}
        <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-accent)]">Live Preview</span>
            <span className="text-[11px] text-white/40 ml-2">— {session.team.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Read-only slot indicator */}
            {gameState && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                Slot {(gameState.currentSlot ?? 0) + 1} / 4
              </span>
            )}
            <button
              onClick={onLogout}
              className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Full-screen live preview */}
        <div className="relative z-10 flex-1">
          {isDone ? (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 p-8 rounded-xl flex flex-col items-center text-center max-w-sm"
              >
                <CheckCircle2 className="w-12 h-12 text-[var(--color-accent)] mb-4" />
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Arena Completed</h2>
              </motion.div>
            </div>
          ) : (
            <iframe
              key={`runner-preview-${gameState?.currentSlot}`}
              srcDoc={srcDoc}
              title="Live Preview"
              sandbox="allow-scripts"
              className="w-full h-full border-none bg-white"
              style={{ height: 'calc(100dvh - 49px)' }}
            />
          )}
        </div>

        {/* Arena 1 Footer */}
        <footer className="p-3 border-t border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest relative z-20 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" /> 
              SYSTEM ONLINE
            </span>
            <span className="hidden md:inline text-white/20">|</span>
            <span className="hidden md:inline">CODE SCAVENGER :: ARENA 1</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--color-accent)]">{session.team.name}</span>
            <span className="text-white/20">|</span>
            <span>{isSolver ? 'SOLVER' : 'RUNNER'} TERMINAL</span>
          </div>
        </footer>
      </div>
    );
  }

  // ── Solver View ─────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col font-mono relative overflow-hidden">
      <TacticalBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--color-accent)] text-black flex items-center justify-center rounded font-black text-sm">
            A1
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest leading-none">Code Scavenger</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Team: {session.team.name}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </header>

      {/* Main Content — fills remaining height */}
      <main className="flex-1 relative z-10 flex flex-col gap-3 p-3 overflow-hidden" style={{ minHeight: 0 }}>
        {isDone ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 p-8 md:p-12 rounded-xl flex flex-col items-center text-center max-w-lg"
            >
              <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mb-6" />
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest mb-2">Arena Completed</h2>
              <p className="text-white/70 mb-8">All slots have been submitted.</p>
              <button
                onClick={onLogout}
                className="w-full py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-black font-black uppercase tracking-widest text-xs transition-colors rounded"
              >
                Return to Base
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* HUD (Solver only — has Submit / Skip / Swap) */}
            <Arena1HUD
              gameState={gameState}
              question={question}
              timeLeftMs={timeLeftMs}
              onSubmit={handleSubmit}
              onSkip={handleSkip}
              onSwap={handleSwap}
              isSubmitting={isSubmitting}
              isSkipping={isSkipping}
              isSwapping={isSwapping}
            />

            {/* Tri-Panel Editor — takes all remaining height */}
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <TriPanelEditor
                initialCode={code}
                onChange={handleCodeChange}
                teamId={session.team.id}
                activePanel={question?.type === 'combined' ? 'html' : question?.type}
              />
            </div>
          </>
        )}
      </main>

      {/* Arena 1 Footer */}
      <footer className="p-3 border-t border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest relative z-20 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" /> 
            SYSTEM ONLINE
          </span>
          <span className="hidden md:inline text-white/20">|</span>
          <span className="hidden md:inline">CODE SCAVENGER :: ARENA 1</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[var(--color-accent)]">{session.team.name}</span>
          <span className="text-white/20">|</span>
          <span>{isSolver ? 'SOLVER' : 'RUNNER'} TERMINAL</span>
        </div>
      </footer>
    </div>
  );
}
