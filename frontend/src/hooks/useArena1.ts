import { useState, useEffect, useCallback, useRef } from 'react';
import { getArena1State, submitArena1Code, skipArena1Slot, useArena1Swap, Arena1GameState, Arena1Question, isAuthError, TeamSession } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';

const SLOT_DURATION_MS = 15 * 60 * 1000;

export function useArena1(session: TeamSession | null) {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<Arena1GameState | null>(null);
  const [question, setQuestion] = useState<Arena1Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamePaused, setGamePaused] = useState(false);
  const [gamePausedAt, setGamePausedAt] = useState<string | null>(null);

  // Timer state - seeded from backend msLeft on each fetch
  const [timeLeftMs, setTimeLeftMs] = useState<number>(SLOT_DURATION_MS);
  const msLeftRef = useRef<number>(SLOT_DURATION_MS);
  const lastFetchAt = useRef<number>(Date.now());

  const fetchState = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await getArena1State(session.token);

      // Backend sends msLeft (authoritative remaining ms for this slot)
      const serverMsLeft = res.msLeft ?? SLOT_DURATION_MS;
      msLeftRef.current = serverMsLeft;
      lastFetchAt.current = Date.now();

      setGameState(res.gameState);
      // Backend returns `currentQuestion` (not `question`)
      setQuestion(res.currentQuestion);
      setGamePaused(!!res.gamePaused);
      setGamePausedAt(res.gamePausedAt ?? null);
      setTimeLeftMs(serverMsLeft);
      setError(null);
    } catch (err: any) {
      if (isAuthError(err)) {
        setError('Authentication error');
      } else {
        setError(err.message || 'Failed to fetch Arena 1 state');
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // WebSocket: re-fetch on any slot change or review event
  useEffect(() => {
    if (!socket || !session) return;
    const refresh = () => fetchState();
    socket.on('a1:state-refresh', refresh);
    socket.on('a1:slot-change', refresh);
    socket.on('a1:reviewed', refresh);
    socket.on('a1:submitted', refresh);
    socket.on('game:pause', (data: { pausedAt?: string }) => {
      setGamePaused(true);
      setGamePausedAt(data.pausedAt ?? new Date().toISOString());
    });
    socket.on('game:resume', () => {
      setGamePaused(false);
      setGamePausedAt(null);
      fetchState();
    });
    socket.on('game:blocked', () => setGamePaused(true));
    return () => {
      socket.off('a1:state-refresh', refresh);
      socket.off('a1:slot-change', refresh);
      socket.off('a1:reviewed', refresh);
      socket.off('a1:submitted', refresh);
      socket.off('game:pause');
      socket.off('game:resume');
      socket.off('game:blocked');
    };
  }, [socket, session, fetchState]);

  // Client-side countdown (1s tick, using elapsed time since last fetch)
  useEffect(() => {
    if (gamePaused || !gameState || gameState.status !== 'active') {
      if (gameState?.status === 'waiting') setTimeLeftMs(SLOT_DURATION_MS);
      else if (gameState?.status === 'done') setTimeLeftMs(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastFetchAt.current;
      const remaining = Math.max(0, msLeftRef.current - elapsed);
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        // Backend auto-skips; just re-fetch to get updated state
        fetchState();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, fetchState]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const submitCode = async (html: string, css: string, js: string) => {
    if (!session || !gameState) return false;
    try {
      const slot = gameState.currentSlot;
      await submitArena1Code(session.token, slot, { html, css, js });
      await fetchState(); // re-sync to get next question
      return true;
    } catch (err: any) {
      if (err?.status === 423) setGamePaused(true);
      else setError(err.message || 'Submit failed');
      return false;
    }
  };

  const skipSlot = async () => {
    if (!session) return false;
    try {
      const res = await skipArena1Slot(session.token);
      setGameState(res.gameState);
      await fetchState();
      return true;
    } catch (err: any) {
      if (err?.status === 423) setGamePaused(true);
      else setError(err.message || 'Skip failed');
      return false;
    }
  };

  const swapSlot = async () => {
    if (!session) return false;
    try {
      const res = await useArena1Swap(session.token);
      setGameState(res.gameState);
      await fetchState();
      return true;
    } catch (err: any) {
      if (err?.status === 423) setGamePaused(true);
      else setError(err.message || 'Swap failed');
      return false;
    }
  };

  return {
    gameState,
    question,
    timeLeftMs,
    loading,
    error,
    gamePaused,
    gamePausedAt,
    refreshState: fetchState,
    submitCode,
    skipSlot,
    swapSlot,
  };
}
