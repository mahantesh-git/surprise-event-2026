import type { GameState, HandoffDetails, Role } from '@/hooks/useGameState';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TeamSession {
  token: string;
  role: Role;
  team: {
    id: string;
    name: string;
  };
  gameState: GameState;
}

export interface TeamProfile {
  team: {
    id: string;
    name: string;
  };
  role: Role;
}

export interface GameStateUpdate extends Partial<Omit<GameState, 'handoff'>> {
  handoff?: HandoffDetails | null;
}

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload as T;
}

export async function loginTeam(teamName: string, password: string, role: Role) {
  return requestJson<TeamSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ teamName, password, role }),
  });
}

export async function getSession(token: string) {
  return requestJson<TeamProfile>('/session', { method: 'GET' }, token);
}

export async function getGameState(token: string) {
  return requestJson<{ gameState: GameState }>('/game/state', { method: 'GET' }, token);
}

export async function updateGameState(token: string, updates: GameStateUpdate) {
  return requestJson<{ gameState: GameState }>('/game/state', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, token);
}
export async function verifyRunnerPasskey(token: string, passkey: string) {
  return requestJson<{ ok: boolean; gameType: string }>('/runner/verify-passkey', {
    method: 'POST',
    body: JSON.stringify({ passkey }),
  }, token);
}

export async function completeRunnerGame(token: string) {
  return requestJson<{ ok: boolean }>('/runner/complete-round', {
    method: 'POST',
  }, token);
}

export async function resetGameState(token: string) {
  return requestJson<{ gameState: GameState }>('/game/reset', {
    method: 'POST',
  }, token);
}

export async function compilePython(token: string, code: string) {
  return requestJson<{ ok: boolean; stdout: string; stderr: string; timedOut: boolean }>('/game/compile', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }, token);
}

export interface RoundQuestion {
  id?: string;
  round: number;
  p1: { title: string; code: string; hint: string; ans: string; output: string };
  coord: { lat: string; lng: string; place: string };
  volunteer: { name: string; initials: string; bg: string; color: string };
  qrPasskey: string;
  cx: number;
  cy: number;
}

export interface AdminSession {
  token: string;
  email: string;
}

export async function getQuestions() {
  return requestJson<{ questions: RoundQuestion[] }>('/questions', { method: 'GET' });
}

export async function adminLogin(email: string, password: string) {
  return requestJson<AdminSession>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getAdminTeams(token: string) {
  return requestJson<{ teams: Array<{ id: string; name: string; email: string; createdAt: string; lastLoginAt: string | null }> }>('/admin/teams', { method: 'GET' }, token);
}

export async function createAdminTeam(token: string, payload: { name: string; email: string; password: string }) {
  return requestJson<{ ok: boolean }>('/admin/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteAdminTeam(token: string, teamId: string) {
  return requestJson<{ ok: boolean }>(`/admin/teams/${teamId}`, { method: 'DELETE' }, token);
}

export async function deleteAllAdminTeams(token: string) {
  return requestJson<{ ok: boolean; deletedCount: number }>('/admin/teams', { method: 'DELETE' }, token);
}

export async function getAdminQuestions(token: string) {
  return requestJson<{ questions: RoundQuestion[] }>('/admin/questions', { method: 'GET' }, token);
}

export async function createAdminQuestion(token: string, payload: RoundQuestion) {
  return requestJson<{ id: string }>('/admin/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateAdminQuestion(token: string, id: string, payload: RoundQuestion) {
  return requestJson<{ ok: boolean }>(`/admin/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteAdminQuestion(token: string, id: string) {
  return requestJson<{ ok: boolean }>(`/admin/questions/${id}`, { method: 'DELETE' }, token);
}

export async function deleteAllAdminQuestions(token: string) {
  return requestJson<{ ok: boolean; deletedCount: number }>('/admin/questions', { method: 'DELETE' }, token);
}

export async function wipeAdminDatabase(token: string) {
  return requestJson<{ ok: boolean; deletedTeams: number; deletedQuestions: number }>('/admin/database', { method: 'DELETE' }, token);
}

export interface LeaderboardTeam {
  id: string;
  name: string;
  round: number;
  solvedCount: number;
  stage: string;
  startTime: string | null;
  finishTime: string | null;
  currentLat: number | null;
  currentLng: number | null;
}

export async function getLeaderboard() {
  return requestJson<{ leaderboard: LeaderboardTeam[] }>('/leaderboard', { method: 'GET' });
}

export async function updateRunnerLocation(token: string, lat: number, lng: number) {
  return requestJson<{ ok: boolean }>('/runner/location', {
    method: 'PUT',
    body: JSON.stringify({ lat, lng }),
  }, token);
}

export async function getAdminConfig(token: string) {
  return requestJson<Record<string, any>>('/admin/config', { method: 'GET' }, token);
}

export async function updateAdminConfig(token: string, key: string, value: any) {
  return requestJson<{ ok: boolean }>('/admin/config', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  }, token);
}