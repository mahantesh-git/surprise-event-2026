import { useEffect, useState } from 'react';
import { getGameState, getSession, loginTeam, resetGameState, updateGameState } from '@/lib/api';

export type Stage = 'p1_solve' | 'p1_solved' | 'runner_travel' | 'runner_game' | 'runner_done' | 'complete';
export type Role = 'solver' | 'runner';

export interface GameState {
  round: number;
  stage: Stage;
  roundsDone: boolean[];
  handoff: HandoffDetails | null;
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
}

export interface TeamSession {
  token: string;
  role: Role;
  team: TeamProfile;
  gameState: GameState;
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

export function useGameState(role: Role) {
  const [session, setSession] = useState<TeamSession | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageKey = getStorageKey(role);

  const syncGameState = async (token: string) => {
    const response = await getGameState(token);
    setGameState(response.gameState);
    return response.gameState;
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
      } catch {
        window.localStorage.removeItem(storageKey);
        if (!active) return;
        setSession(null);
        setGameState(null);
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
      syncGameState(session.token).catch(() => {
        window.localStorage.removeItem(storageKey);
        setSession(null);
        setGameState(null);
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [session, storageKey]);

  const login = async (teamName: string, password: string) => {
    setError(null);
    const response = await loginTeam(teamName, password, role);
    const nextSession: TeamSession = {
      token: response.token,
      role: response.role,
      team: response.team,
      gameState: response.gameState,
    };
    setSession(nextSession);
    setGameState(response.gameState);
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
    setGameState(response.gameState);
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const nextSession = { ...currentSession, gameState: response.gameState };
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const resetGame = async () => {
    if (!session) return;
    const response = await resetGameState(session.token);
    setGameState(response.gameState);
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const nextSession = { ...currentSession, gameState: response.gameState };
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const sync = async () => {
    if (session) {
      await syncGameState(session.token);
    }
  };

  return { session, gameState, loading, error, login, logout, updateState, resetGame, setError, sync };
}
