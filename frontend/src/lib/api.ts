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

  // Ensure protocol exists and is secure for production
  const isLocalhost = h.includes('localhost') || h.includes('127.0.0.1');
  if (!h.startsWith('http') && !h.startsWith('//')) {
    h = isLocalhost ? `http://${h}` : `https://${h}`;
  } else if (!isLocalhost && h.startsWith('http://')) {
    // Force upgrade http to https for production URLs to avoid Mixed Content blocks
    h = h.replace('http://', 'https://');
  }



  // Cleanup: remove trailing slashes and ensure /api suffix
  h = h.replace(/\/+$/, '');
  const final = h.endsWith('/api') ? h : `${h}/api`;

  console.log('[API] Final base URL initialized at:', final);
  return final;
};

const API_BASE = getApiBaseUrl();

export function buildApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function requestApiText(path: string, token?: string): Promise<string> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(text || 'Request failed', response.status);
  }

  return text;
}

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
  arena?: string;
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

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string, _retry = 1): Promise<T> {
  // 15 second timeout — covers Railway cold-start without hanging forever
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409 && payload?.error === 'DEVICE_CONFLICT') {
        throw new DeviceConflictError();
      }
      throw new ApiError(payload?.error || 'Request failed', response.status);
    }

    return payload as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Retry once on network errors (timeout, connection reset, etc.)
    // Do NOT retry on API errors (4xx/5xx) — those are intentional responses.
    const isNetworkError = err instanceof TypeError || err?.name === 'AbortError';
    if (isNetworkError && _retry > 0) {
      console.warn(`[API] Network error on ${path}, retrying in 1.5s…`, err?.message);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return requestJson<T>(path, init, token, _retry - 1);
    }

    // Convert AbortError into a friendlier message
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out — server may be waking up, please try again.', 0);
    }

    throw err;
  }
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
  isReserve?: boolean;
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

export async function deleteAdminArena1Team(token: string, teamId: string) {
  return requestJson<{ ok: boolean }>(`/admin/a1/teams/${teamId}`, { method: 'DELETE' }, token);
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

// ── Arena 1 Types & Endpoints ──────────────────────────────────────────────────

export type Arena1SlotType = 'html' | 'css' | 'js' | 'combined';

export interface Arena1Question {
  id?: string;
  _id?: string;
  slot?: number;
  type: Arena1SlotType;
  title: string;
  description: string;
  starterHtml?: string;
  starterCss?: string;
  starterJs?: string;
  /** legacy/admin field */
  defaultCode?: string;
  points?: number;
  isReserve?: boolean;
}

export interface Arena1SlotResult {
  slot: number;
  questionId: string;
  submittedAt: string | null;
  submittedFilePath: string | null;
  approved: boolean | null;
  points: number;
  swapped: boolean;
  skipped: boolean;
  timeMs: number | null;
}

export interface Arena1GameState {
  status: 'waiting' | 'active' | 'done';
  currentSlot: number;
  slotStartedAt: string | null;
  swapsLeft: number;
  slotResults: Arena1SlotResult[];
  startedAt: string | null;
  finishedAt: string | null;
}

export async function getArena1State(token: string) {
  return requestJson<{
    gameState: Arena1GameState;
    currentQuestion: Arena1Question | null;
    msLeft: number;
  }>('/a1/game/state', { method: 'GET' }, token);
}

export async function submitArena1Code(token: string, slot: number, payload: { html: string; css: string; js: string }) {
  return requestJson<{ ok: boolean }>('/a1/game/submit', {
    method: 'POST',
    body: JSON.stringify({ ...payload, slot })
  }, token);
}

export async function skipArena1Slot(token: string) {
  return requestJson<{ ok: boolean; gameState: Arena1GameState }>('/a1/game/skip', {
    method: 'POST'
  }, token);
}

export async function useArena1Swap(token: string) {
  return requestJson<{ ok: boolean; gameState: Arena1GameState }>('/a1/game/swap', {
    method: 'POST'
  }, token);
}

export async function shareArena1Result(token: string) {
  return requestJson<{ ok: boolean }>('/a1/game/share', { method: 'POST' }, token);
}

// Admin Arena 1

export async function getAdminArena1Teams(token: string) {
  return requestJson<{ teams: any[] }>('/admin/a1/teams', { method: 'GET' }, token);
}

export async function createAdminArena1Team(token: string, payload: { name: string; password: string; solverName?: string; runnerName?: string }) {
  return requestJson<{ ok: true }>('/admin/a1/teams', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function getAdminArena1Questions(token: string) {
  return requestJson<{ questions: Arena1Question[] }>('/admin/a1/questions', { method: 'GET' }, token);
}

export async function createAdminArena1Question(token: string, payload: Partial<Arena1Question>) {
  return requestJson<{ ok: boolean; insertedId: string }>('/admin/a1/questions', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, token);
}

export async function updateAdminArena1Question(token: string, id: string, payload: Partial<Arena1Question>) {
  return requestJson<{ ok: boolean }>(`/admin/a1/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, token);
}

export async function deleteAdminArena1Question(token: string, id: string) {
  return requestJson<{ ok: boolean }>(`/admin/a1/questions/${id}`, { method: 'DELETE' }, token);
}

export async function adminGradeArena1Submission(token: string, teamId: string, slot: number, approved: boolean, points: number) {
  return requestJson<{ ok: boolean }>(`/admin/a1/review/${teamId}/${slot}`, {
    method: 'POST',
    body: JSON.stringify({ approved, points })
  }, token);
}

export async function adminStartArena1(token: string) {
  return requestJson<{ ok: boolean }>('/admin/a1/game/start', { method: 'POST' }, token);
}

export async function adminEndArena1(token: string) {
  return requestJson<{ ok: boolean }>('/admin/a1/game/end', { method: 'POST' }, token);
}

export async function adminPostArena1DiscordReport(token: string) {
  return requestJson<{ ok: boolean }>('/admin/a1/report/discord', { method: 'POST' }, token);
}

export async function adminUnlockArena1Team(token: string, teamId: string) {
  return requestJson<{ ok: boolean; message: string }>(`/admin/a1/teams/${teamId}/unlock`, { method: 'POST' }, token);
}
