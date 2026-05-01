import type { GameState, HandoffDetails, Role } from '@/hooks/useGameState';

const getApiBaseUrl = () => {
  // Use VITE_API_HOST as primary, fallback to VITE_API_BASE_URL
  let h = import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || '';
  
  // Debug log for production (visible in browser console)
  console.log('[API] Raw host from environment:', h || '(empty)');

  if (!h && typeof window !== 'undefined') {
    // If no host specified, and we're on localhost, assume local backend
    if (window.location.hostname === 'localhost') {
      h = 'http://localhost:4000';
    } else {
      // Otherwise fallback to relative /api
      return '/api';
    }
  }

  if (!h) return '/api';

  // Ensure protocol exists
  if (!h.startsWith('http') && !h.startsWith('//')) {
    h = `https://${h}`;
  }

  // Render-specific fix: internal service names (no dots) are not resolvable from browsers.
  // We automatically append .onrender.com if it's not localhost and missing a top-level domain.
  try {
    const u = new URL(h);
    const hostname = u.hostname;
    
    if (hostname !== 'localhost' && !hostname.includes('.') && !hostname.includes(':')) {
      console.log(`[API] Fixing internal hostname: ${hostname} -> ${hostname}.onrender.com`);
      u.hostname = `${hostname}.onrender.com`;
      h = u.toString();
    }
  } catch (e) {
    // Fallback for non-URL strings
    if (!h.includes('.') && !h.includes('localhost') && !h.includes('://localhost')) {
      h = `${h}.onrender.com`;
    }
  }

  // Cleanup: remove trailing slashes and ensure /api suffix
  h = h.replace(/\/+$/, '');
  const final = h.endsWith('/api') ? h : `${h}/api`;
  
  console.log('[API] Final base URL initialized at:', final);
  return final;
};

const API_BASE = getApiBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Special error thrown when backend returns DEVICE_CONFLICT (409)
export class DeviceConflictError extends Error {
  constructor() {
    super('DEVICE_CONFLICT');
    this.name = 'DeviceConflictError';
  }
}

export interface TeamSession {
  token: string;
  role: Role;
  team: {
    id: string;
    name: string;
    solverName?: string;
    runnerName?: string;
  };
  gameState: GameState;
  lastMessage?: ChatMessage | null;
}

export interface AdminSession {
  token: string;
  email: string;
}

export interface TeamProfile {
  team: {
    id: string;
    name: string;
    solverName?: string;
    runnerName?: string;
  };
  role: Role;
}

export interface ChatMessage {
  text: string;
  senderRole: string;
  timestamp: number;
  targetRole?: 'runner' | 'solver' | 'all';
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
    // Surface device conflicts as a distinct error type
    if (response.status === 409 && payload?.error === 'DEVICE_CONFLICT') {
      throw new DeviceConflictError();
    }
    throw new ApiError(payload?.error || 'Request failed', response.status);
  }

  return payload as T;
}

export async function loginTeam(teamName: string, password: string, role: Role, deviceBypassKey?: string) {
  return requestJson<TeamSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ teamName, password, role, ...(deviceBypassKey ? { deviceBypassKey } : {}) }),
  });
}

export async function getSession(token: string) {
  return requestJson<TeamProfile>('/session', { method: 'GET' }, token);
}

export async function getGameState(token: string) {
  return requestJson<{ gameState: GameState; lastMessage?: ChatMessage; score?: number }>(`/game/state?_t=${Date.now()}`, { method: 'GET' }, token);
}

export async function updateGameState(token: string, updates: GameStateUpdate) {
  return requestJson<{ gameState: GameState; lastMessage?: ChatMessage; score?: number }>('/game/state', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, token);
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404);
}

export async function verifyRunnerLocationQr(token: string, qrCode: string, lat?: number, lng?: number) {
  return requestJson<{ ok: boolean }>('/runner/verify-location-qr', {
    method: 'POST',
    body: JSON.stringify({ qrCode, lat, lng }),
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
  return requestJson<{ gameState: GameState; lastMessage?: ChatMessage; score?: number }>('/game/reset', {
    method: 'POST',
  }, token);
}

export async function compileCode(token: string, questionId: string, code: string, language: string = 'python') {
  return requestJson<CompileResult>('/game/compile', {
    method: 'POST',
    body: JSON.stringify({ questionId, code, language }),
  }, token);
}

/** @deprecated use compileCode */
export const compilePython = (token: string, questionId: string, code: string) => compileCode(token, questionId, code, 'python');

export type QuestionLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'c' | 'cpp' | 'go';

export interface TestCase {
  input: string;
  output: string;
}

export interface PuzzlePart {
  title: string;
  code: string;
  hint: string;
  ans: string;
  output: string;
  language: string;
  testCases?: TestCase[];
}

export interface RoundQuestion {
  id: string;
  round: number;
  p1: PuzzlePart;
  coord: {
    lat: string;
    lng: string;
    place: string;
  };
  volunteer: {
    name: string;
    initials: string;
    bg: string;
    color: string;
  };
  qrPasskey: string;
  locationQrCode?: string;
  cx: number;
  cy: number;
}

export interface TestResult {
  passed: boolean;
  input: string;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface CompileResult {
  ok: boolean;
  matched: boolean;
  testResults: TestResult[];
  stdout: string;
  stderr: string;
  error?: string;
  timedOut?: boolean;
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
  return requestJson<{ 
    teams: Array<{ 
      id: string; 
      name: string; 
      email: string; 
      solverName: string; 
      runnerName: string; 
      createdAt: string; 
      lastLoginAt: string | null;
      score: number;
      scoreHistory: Array<{ amount: number; reason: string; timestamp: string }>;
      gameState: GameState;
    }> 
  }>('/admin/teams', { method: 'GET' }, token);
}

export async function createAdminTeam(token: string, payload: { name: string; email: string; password: string; solverName?: string; runnerName?: string }) {
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
  currentHeading: number | null;
  locationHistory?: { lat: number; lng: number }[];
  helpRequested?: boolean;
  lastValidatedAt?: string | null;
  difficultyTier?: 'normal' | 'hard';
}

export async function getLeaderboard() {
  return requestJson<{ leaderboard: LeaderboardTeam[] }>('/leaderboard', { method: 'GET' });
}

export async function updateRunnerLocation(token: string, lat: number, lng: number, heading: number | null = null) {
  return requestJson<{ ok: boolean }>('/runner/location', {
    method: 'PUT',
    body: JSON.stringify({ lat, lng, heading }),
  }, token);
}

export async function getFinalRoundQrCode(token: string) {
  return requestJson<{ qrCode: string }>('/game/final-qr', { method: 'GET' }, token);
}

export async function verifyRunnerFinalQr(token: string, qrCode: string) {
  return requestJson<{ ok: boolean; gameState: GameState }>('/runner/verify-final-qr', {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
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

export async function getChatPhrases(token: string) {
  return requestJson<{ phrases: string[] }>('/chat/phrases', { method: 'GET' }, token);
}

export async function sendChatMessage(token: string, text: string) {
  return requestJson<{ ok: boolean; lastMessage: ChatMessage }>('/chat/send', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, token);
}

export async function sendAdminChatMessage(token: string, payload: { text: string; targetTeamId: string | 'all'; targetRole: 'runner' | 'solver' | 'all' }) {
  return requestJson<{ ok: boolean }>('/admin/chat/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function getAdminPhrases(token: string) {
  return requestJson<{ phrases: { _id?: string, id?: string, text: string }[] }>('/admin/phrases', { method: 'GET' }, token);
}

export async function createAdminPhrase(token: string, text: string) {
  return requestJson<{ ok: boolean }>('/admin/phrases', {
    method: 'POST',
    body: JSON.stringify({ text })
  }, token);
}

export async function updateAdminPhrase(token: string, id: string, text: string) {
  return requestJson<{ ok: boolean }>(`/admin/phrases/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ text })
  }, token);
}

export async function deleteAdminPhrase(token: string, id: string) {
  return requestJson<{ ok: boolean }>(`/admin/phrases/${id}`, { method: 'DELETE' }, token);
}

export async function requestTacticalSupport(token: string, location?: { lat: number, lng: number }) {
  return requestJson<{ ok: boolean }>('/team/request-help', {
    method: 'POST',
    body: JSON.stringify(location)
  }, token);
}

export async function claimTeamRoundSwap(token: string) {
  return requestJson<{ ok: boolean; error?: string }>('/team/claim-swap', {
    method: 'POST'
  }, token);
}

export async function swapAdminTeamRound(token: string, teamId: string) {
  return requestJson<{ ok: boolean; error?: string }>(`/admin/teams/${teamId}/swap`, {
    method: 'POST'
  }, token);
}
