import { useEffect, useState } from 'react';
import { getGameState, getSession, loginTeam, resetGameState, updateGameState, ChatMessage, isAuthError } from '@/lib/api';

export type Stage = 'p1_solve' | 'p1_solved' | 'runner_travel' | 'runner_game' | 'runner_done' | 'final_qr' | 'complete';
export type Role = 'solver' | 'runner';

export interface GameState {
  round: number;
  stage: Stage;
  roundsDone: boolean[];
  handoff: HandoffDetails | null;
  startTime?: string | null;
  finishTime?: string | null;
  lastMessage?: ChatMessage | null;
}

export interface HandoffDetails {
  passkey: string;
  lat: string;
  lng: string;
  volunteer: string;
  place: string;
}

const INITIAL_STATE: GameState = {
  round: 0,
  stage: 'p1_solve',
  roundsDone: new Array(6).fill(false),
  handoff: null,
};

function getStorageKey(role: Role) {
  return `quest-session:${role}`;
}

export interface TeamProfile {
  id: string;
  name: string;
  solverName?: string;
  runnerName?: string;
}

export interface TeamSession {
  token: string;
  role: Role;
  team: TeamProfile;
  gameState: GameState;
  lastMessage?: ChatMessage | null;
}

function parseStoredSession(role: Role): TeamSession | null {
  if (typeof window === 'undefined') return null;

  const storedValue = window.localStorage.getItem(getStorageKey(role));
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue) as TeamSession;
    if (!parsed.token || !parsed.team?.id || !parsed.team?.name) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

import { useSocket } from '@/contexts/SocketContext';

export function useGameState(role: Role) {
  const [session, setSession] = useState<TeamSession | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageKey = getStorageKey(role);
  const { socket } = useSocket();

  const syncGameState = async (token: string) => {
    const response = await getGameState(token);
    const stateWithMsg = { ...response.gameState, lastMessage: response.lastMessage ?? null };
    
    setGameState(stateWithMsg);
    if (typeof response.score === 'number') {
      setScore(response.score);
    }

    setSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, gameState: stateWithMsg };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    return stateWithMsg;
  };

  useEffect(() => {
    const storedSession = parseStoredSession(role);
    if (!storedSession) {
      setLoading(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      try {
        await getSession(storedSession.token);
        const freshState = await syncGameState(storedSession.token);
        if (!active) return;
        setSession({ ...storedSession, gameState: freshState });
        window.localStorage.setItem(storageKey, JSON.stringify({ ...storedSession, gameState: freshState }));
      } catch (err) {
        // Only logout on auth errors. Network errors should be ignored (let the session persist).
        if (isAuthError(err)) {
          window.localStorage.removeItem(storageKey);
          if (!active) return;
          setSession(null);
          setGameState(null);
        } else {
          console.warn('[Session] Bootstrap sync failed (network?), retaining session', err);
          if (active) {
            setSession(storedSession);
            setGameState(storedSession.gameState);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        const nextSession = parseStoredSession(role);
        setSession(nextSession);
        setGameState(nextSession?.gameState ?? null);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [role, storageKey]);

  useEffect(() => {
    if (!session) return;

    const interval = window.setInterval(() => {
      syncGameState(session.token).catch((err) => {
        // Only logout on auth errors. 
        if (isAuthError(err)) {
          console.error('[Session] Auth failure during sync, logging out', err);
          window.localStorage.removeItem(storageKey);
          setSession(null);
          setGameState(null);
        } else {
          // Network errors are expected on mobile when screen is off or connection is weak.
          // We silently ignore them to keep the session alive.
          console.debug('[Session] Periodic sync failed (expected on flaky networks)');
        }
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [session, storageKey]);

  useEffect(() => {
    if (!socket || !session) return;

    const handleChatMessage = (msg: ChatMessage) => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, lastMessage: msg };
      });
    };

    socket.on('chat:message', handleChatMessage);
    return () => {
      socket.off('chat:message', handleChatMessage);
    };
  }, [socket, session]);

  const login = async (teamName: string, password: string) => {
    setError(null);
    const response = await loginTeam(teamName, password, role);
    const nextSession: TeamSession = {
      token: response.token,
      role: response.role,
      team: response.team,
      gameState: response.gameState,
      lastMessage: null,
    };
    setSession(nextSession);
    setGameState({ ...response.gameState, lastMessage: null });
    if (typeof (response as any).score === 'number') {
      setScore((response as any).score);
    }
    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
  };

  const logout = () => {
    window.localStorage.removeItem(storageKey);
    setSession(null);
    setGameState(null);
    setError(null);
  };

  const updateState = async (updates: Partial<GameState>) => {
    if (!session) return;
    const response = await updateGameState(session.token, updates);
    const stateWithMsg = { ...response.gameState, lastMessage: response.lastMessage ?? null };
    setGameState(stateWithMsg);
    if (typeof response.score === 'number') {
      setScore(response.score);
    }
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const nextSession = { ...currentSession, gameState: stateWithMsg, lastMessage: response.lastMessage ?? null };
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const resetGame = async () => {
    if (!session) return;
    const response = await resetGameState(session.token);
    const stateWithMsg = { ...response.gameState, lastMessage: null };
    setGameState(stateWithMsg);
    if (typeof response.score === 'number') {
      setScore(response.score);
    }
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const nextSession = { ...currentSession, gameState: stateWithMsg, lastMessage: null };
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const sync = async () => {
    if (session) {
      await syncGameState(session.token);
    }
  };

  return { session, gameState, score, loading, error, login, logout, updateState, resetGame, setError, sync };
}
