import axios from 'axios';
import cors from 'cors';

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { ObjectId } from 'mongodb';
import type { LoginPayload, GameState, QuestionDocument } from './types';
import { closeClient, ensureIndexes, getQuestionsCollection, getTeamsCollection, getConfigCollection } from './db';
import { requireAdmin, requireAuth, signAdminToken, signToken, normalizeRole, type AdminAuthedRequest, type AuthedRequest } from './auth';
import { createTeam, findTeamByName, verifyTeamPassword, findTeamById } from './team-service';
import { createInitialGameState, normalizeGameState, sanitizeGameStateUpdate } from './game';
import { DEFAULT_QUESTIONS } from './defaultQuestions';
import { asyncHandler, createApiErrorHandler, HttpError } from './errors';

const envPath = path.resolve(__dirname, '../.env');
const fallbackEnvPath = path.resolve(__dirname, '../.env.example');
const envLoad = dotenv.config({ path: envPath });
if (envLoad.error) {
  dotenv.config({ path: fallbackEnvPath });
}

const app = express();
const port = Number(process.env.PORT || 4000);
const eventQrCodesDir = path.resolve(__dirname, '../../event_qr_codes');
const questionQrScriptPath = path.resolve(__dirname, '../scripts/generate_question_qr.py');
const route = asyncHandler;
let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

function buildLocationQrCode(round: number) {
  return `QUEST-LOC-R${Math.max(1, Math.trunc(round))}`;
}

function resolveQuestionLocationQrCode(question: Partial<QuestionDocument> & { round: number }) {
  const savedCode = typeof question.locationQrCode === 'string' ? question.locationQrCode.trim() : '';
  return savedCode || buildLocationQrCode(question.round);
}

async function generateQuestionQrAsset(question: Pick<QuestionDocument, 'round' | 'coord' | 'locationQrCode'>) {
  const place = typeof question.coord?.place === 'string' && question.coord.place.trim()
    ? question.coord.place.trim()
    : `Location ${question.round}`;
  const payload = resolveQuestionLocationQrCode(question);

  await new Promise<string>((resolve, reject) => {
    const child = spawn('python', [
      questionQrScriptPath,
      eventQrCodesDir,
      String(question.round),
      place,
      payload,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `QR generation exited with code ${code}`));
    });
  });
}

function createQuestionPayload(input: any, existing?: Partial<QuestionDocument>): Omit<QuestionDocument, 'createdAt' | 'updatedAt'> {
  const round = Number(input?.round);
  const qrPasskey = typeof input?.qrPasskey === 'string' ? input.qrPasskey.trim() : '';
  const locationQrCodeInput = typeof input?.locationQrCode === 'string' ? input.locationQrCode.trim() : '';
  const p1 = input?.p1 || {};
  const coord = input?.coord || {};
  const volunteer = input?.volunteer || {};
  const cx = Number(input?.cx ?? existing?.cx ?? 0.5);
  const cy = Number(input?.cy ?? existing?.cy ?? 0.5);

  if (!Number.isInteger(round) || round < 1) {
    throw new Error('round must be a positive integer');
  }

  if (!qrPasskey) {
    throw new Error('qrPasskey is required');
  }

  if (typeof p1.title !== 'string' || !p1.title.trim()) {
    throw new Error('p1.title is required');
  }

  return {
    round,
    p1: {
      title: p1.title.trim(),
      code: typeof p1.code === 'string' ? p1.code : '',
      hint: typeof p1.hint === 'string' ? p1.hint : '',
      ans: typeof p1.ans === 'string' ? p1.ans : '',
      output: typeof p1.output === 'string' ? p1.output : '',
      language: typeof p1.language === 'string' && p1.language.trim() ? p1.language.trim() : 'python',
      testCases: Array.isArray(p1.testCases)
        ? p1.testCases.map((testCase: any) => ({
          input: typeof testCase?.input === 'string' ? testCase.input : '',
          output: typeof testCase?.output === 'string' ? testCase.output : '',
        }))
        : [],
    },
    coord: {
      lat: typeof coord.lat === 'string' ? coord.lat : '',
      lng: typeof coord.lng === 'string' ? coord.lng : '',
      place: typeof coord.place === 'string' ? coord.place : '',
    },
    volunteer: {
      name: typeof volunteer.name === 'string' ? volunteer.name : '',
      initials: typeof volunteer.initials === 'string' ? volunteer.initials : '',
      bg: typeof volunteer.bg === 'string' ? volunteer.bg : '',
      color: typeof volunteer.color === 'string' ? volunteer.color : '',
    },
    qrPasskey,
    locationQrCode: locationQrCodeInput || existing?.locationQrCode || buildLocationQrCode(round),
    cx: Number.isFinite(cx) ? cx : 0.5,
    cy: Number.isFinite(cy) ? cy : 0.5,
  };
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || 'admin@quest.local';
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'admin123';
}

async function getRoundCount() {
  const questions = await getQuestionsCollection();
  const count = await questions.countDocuments();
  return Math.max(1, count);
}

async function seedQuestionsIfEmpty() {
  const questions = await getQuestionsCollection();
  const count = await questions.countDocuments();
  if (count > 0) return;

  const now = new Date();
  for (const question of DEFAULT_QUESTIONS) {
    await generateQuestionQrAsset(question);
  }
  await questions.insertMany(DEFAULT_QUESTIONS.map(question => ({ ...question, createdAt: now, updatedAt: now })));
}

function toObjectId(value: string, label: string) {
  if (!ObjectId.isValid(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }

  return new ObjectId(value);
}

function buildFinalRoundQrCode(teamId: string) {
  return `QUEST-FINISH-${teamId.slice(-6).toUpperCase()}`;
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/auth/login', route(async (request, response) => {
  const body = request.body as LoginPayload;
  const teamName = body.teamName?.trim();
  const password = body.password;
  const role = normalizeRole(body.role);

  if (!teamName || !password || !role) {
    response.status(400).json({ error: 'teamName, password, and role are required' });
    return;
  }

  const configCollection = await getConfigCollection();
  const loginConfig = await configCollection.findOne({ key: 'loginEnabled' });
  if (!loginConfig?.value) {
    response.status(403).json({ error: 'Event login is currently disabled by administrators.' });
    return;
  }

  const team = await findTeamByName(teamName);
  if (!team) {
    response.status(401).json({ error: 'Invalid team credentials' });
    return;
  }

  const isPasswordValid = await verifyTeamPassword(team, password);
  if (!isPasswordValid) {
    response.status(401).json({ error: 'Invalid team credentials' });
    return;
  }

  const token = signToken({
    kind: 'team',
    teamId: team._id.toString(),
    teamName: team.name,
    role,
  });

  const teams = await getTeamsCollection();

  let gameState = team.gameState;
  if (!gameState.startTime) {
    gameState = { ...gameState, startTime: new Date().toISOString() };
  }

  await teams.updateOne({ _id: team._id }, { $set: { lastLoginAt: new Date(), updatedAt: new Date(), gameState } });

  response.json({
    token,
    role,
    team: {
      id: team._id.toString(),
      name: team.name,
    },
    gameState,
  });
}));

app.get('/api/session', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  response.json({
    team: {
      id: team._id.toString(),
      name: team.name,
    },
    role: auth.role,
  });
}));

app.get('/api/game/state', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const roundCount = await getRoundCount();
  const normalizedState = normalizeGameState(team.gameState, roundCount);
  if (JSON.stringify(normalizedState) !== JSON.stringify(team.gameState)) {
    const teams = await getTeamsCollection();
    await teams.updateOne({ _id: team._id }, { $set: { gameState: normalizedState, updatedAt: new Date() } });
  }

  response.json({ gameState: normalizedState });
}));

app.patch('/api/game/state', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const roundCount = await getRoundCount();
  const normalizedState = normalizeGameState(team.gameState, roundCount);
  const update = request.body as Partial<GameState>;
  const nextState = sanitizeGameStateUpdate(normalizedState, update, roundCount);
  if (!nextState) {
    response.status(400).json({ error: 'Invalid game state update' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    { $set: { gameState: nextState, updatedAt: new Date() } },
  );

  response.json({ gameState: nextState });
}));

app.post('/api/game/reset', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const roundCount = await getRoundCount();
  const nextState = createInitialGameState(roundCount);

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    { $set: { gameState: nextState, updatedAt: new Date() } },
  );

  response.json({ gameState: nextState });
}));

app.get('/api/game/final-qr', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (auth.role !== 'solver') {
    response.status(403).json({ error: 'Only solver can access final QR' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  if (team.gameState.stage !== 'final_qr') {
    response.status(409).json({ error: 'Final QR is not available yet' });
    return;
  }

  response.json({ qrCode: buildFinalRoundQrCode(team._id.toString()) });
}));

// Language → Piston runtime config
const PISTON_CONFIG: Record<string, { language: string; version: string; fileName: string }> = {
  python: { language: 'python', version: '3.10.0', fileName: 'solution.py' },
  javascript: { language: 'javascript', version: '18.15.0', fileName: 'solution.js' },
  typescript: { language: 'typescript', version: '5.0.3', fileName: 'solution.ts' },
  java: { language: 'java', version: '15.0.2', fileName: 'Main.java' },
  c: { language: 'c', version: '10.2.0', fileName: 'solution.c' },
  cpp: { language: 'c++', version: '10.2.0', fileName: 'solution.cpp' },
  go: { language: 'go', version: '1.16.2', fileName: 'solution.go' },
};

app.post('/api/game/compile', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (auth.role !== 'solver') {
    response.status(403).json({ error: 'Only solver can compile code' });
    return;
  }

  const { code, questionId } = request.body;
  const langKey = typeof request.body?.language === 'string' ? request.body.language : 'python';

  if (!code?.trim()) {
    response.status(400).json({ error: 'code is required' });
    return;
  }

  if (code.length > 8000) {
    response.status(400).json({ error: 'Code is too large (max 8000 chars)' });
    return;
  }

  if (!questionId || !ObjectId.isValid(questionId)) {
    response.status(400).json({ error: 'valid questionId is required' });
    return;
  }

  const pistonCfg = PISTON_CONFIG[langKey];
  if (!pistonCfg) {
    response.status(400).json({ error: `Unsupported language: ${langKey}` });
    return;
  }

  // 1. Rate Limiting (10 attempts per minute)
  const teams = await getTeamsCollection();
  const team = await teams.findOne({ _id: toObjectId(auth.teamId, 'team id') });
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const now = Date.now();
  const minuteAgo = now - 60000;
  const recentAttempts = (team.executionAttempts || []).filter((ts: number) => ts > minuteAgo);

  if (recentAttempts.length >= 10) {
    response.status(429).json({ error: 'Rate limit exceeded: 10 attempts per minute. Please wait.' });
    return;
  }

  // Update team execution attempts
  await teams.updateOne(
    { _id: team._id },
    { $set: { executionAttempts: [...recentAttempts, now] } }
  );

  // 2. Fetch Question for Verification
  const questions = await getQuestionsCollection();
  const question = await questions.findOne({ _id: toObjectId(questionId, 'questionId') });
  
  if (!question) {
    response.status(404).json({ error: 'Question not found' });
    return;
  }

  const testCases = question.p1.testCases || [];
  if (testCases.length === 0) {
    testCases.push({ input: '', output: question.p1.ans });
  }

  try {
    const pistonUrls = [
      process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute',
      'https://piston.engineer/api/v2/execute',
      'http://127.0.0.1:2000/api/v2/execute'
    ];
    
    const testResults = [];
    let allPassed = true;
    let activeUrlIndex = 0;

    for (const tc of testCases) {
      let pistonData: any = null;
      let lastError = '';

      while (activeUrlIndex < pistonUrls.length) {
        const url = pistonUrls[activeUrlIndex];
        try {
          console.log(`Trying Piston at: ${url}`);
          const res = await axios.post(url, {
            language: pistonCfg.language,
            version: pistonCfg.version,
            files: [{ name: pistonCfg.fileName, content: code }],
            stdin: tc.input || '',
            args: [],
            run_timeout: 5000,
            compile_timeout: 5000,
          }, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Quest-Scavenger-Hunt/1.0'
            }
          });

          if (res.status === 200) {
            pistonData = res.data;
            break;
          }
          lastError = `Status ${res.status}: ${JSON.stringify(res.data)}`;
        } catch (err: any) {
          lastError = err.response?.data?.message || err.message;
          console.warn(`Piston attempt failed for ${url}:`, lastError);
        }
        activeUrlIndex++;
      }

      if (!pistonData) {
        throw new Error(`Piston API error (all endpoints failed): ${lastError}`);
      }

      const run = pistonData.run ?? { stdout: '', stderr: '', code: 0 };
      const compile = pistonData.compile ?? { code: 0, stderr: '' };

      const stdout = (run.stdout || '').trim();
      const stderr = (run.stderr || compile.stderr || '').trim();
      const passed = stdout === (tc.output || '').trim() && (run.code === 0 && compile.code === 0);

      testResults.push({
        input: tc.input,
        passed,
        stdout: stdout,
        stderr: stderr,
        timedOut: run.code === 124,
      });

      if (!passed) allPassed = false;
    }

    response.json({
      ok: allPassed,
      testResults,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Execution failed:', errorMsg);
    response.status(502).json({ 
      error: 'Code execution failed. Please check the server logs or try again.',
      details: errorMsg
    });
  }
}));

app.get('/api/questions', route(async (_request, response) => {
  const questions = await getQuestionsCollection();
  const docs = await questions.find({}).sort({ round: 1 }).toArray();

  // Mask sensitive fields for non-privileged players
  const masked = docs.map(({ _id, ...rest }) => {
    const q = rest as any;
    const p1 = q.p1 || {};
    return {
      id: _id.toString(),
      ...q,
      locationQrCode: undefined,
      p1: {
        title: p1.title || 'Untitled',
        language: p1.language || 'python',
        code: p1.code || '',
        hint: p1.hint || '',
        // Hide ans, output, and testCases for security
      }
    };
  });

  response.json({ questions: masked });
}));

app.post('/api/runner/verify-location-qr', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth || auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can verify location QR codes' });
    return;
  }

  const { qrCode } = request.body as { qrCode?: string };
  if (!qrCode?.trim()) {
    response.status(400).json({ error: 'qrCode is required' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const questions = await getQuestionsCollection();
  const question = await questions.findOne({ round: team.gameState.round + 1 });
  if (!question) {
    response.status(404).json({ error: 'No question found for this round' });
    return;
  }

  const expectedQrCode = resolveQuestionLocationQrCode(question);
  if (expectedQrCode.trim().toUpperCase() !== qrCode.trim().toUpperCase()) {
    response.status(401).json({ error: 'Invalid location QR' });
    return;
  }

  response.json({ ok: true });
}));

// Runner verifies the QR passkey to unlock their minigame
app.post('/api/runner/verify-passkey', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth || auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can verify passkeys' });
    return;
  }

  const { passkey } = request.body as { passkey?: string };
  if (!passkey) {
    response.status(400).json({ error: 'passkey is required' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const questions = await getQuestionsCollection();
  const roundCount = await getRoundCount();
  const currentRoundIndex = team.gameState.round;
  const question = await questions.findOne({ round: currentRoundIndex + 1 });

  if (!question) {
    response.status(404).json({ error: 'No question found for this round' });
    return;
  }

  if (question.qrPasskey.trim().toUpperCase() !== passkey.trim().toUpperCase()) {
    response.status(401).json({ error: 'Invalid passkey' });
    return;
  }

  // Advance stage to runner_game so both devices know the runner unlocked the game
  const teams = await getTeamsCollection();
  const nextState = { ...team.gameState, stage: 'runner_game' as const };
  await teams.updateOne({ _id: team._id }, { $set: { gameState: nextState, updatedAt: new Date() } });

  // Return the game type for this round (cycle through tap/memory/pattern)
  const gameTypes = ['tap', 'memory', 'pattern'] as const;
  const gameType = gameTypes[currentRoundIndex % 3];

  response.json({ ok: true, gameType, stage: 'runner_game' });
}));

// Runner completes minigame — advances both solver & runner to next round
app.post('/api/runner/complete-round', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth || auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can complete rounds' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  const roundCount = await getRoundCount();
  const currentRound = team.gameState.round;
  const roundsDone = [...team.gameState.roundsDone];
  roundsDone[currentRound] = true;

  const isLastRound = currentRound >= roundCount - 1;

  let nextState: GameState;
  if (isLastRound) {
    nextState = {
      ...team.gameState,
      stage: 'final_qr',
      roundsDone,
      finishTime: null,
    };
  } else {
    nextState = {
      ...team.gameState,
      round: currentRound + 1,
      stage: 'p1_solve',
      roundsDone,
      handoff: null,
    };
  }

  const teams = await getTeamsCollection();
  await teams.updateOne({ _id: team._id }, { $set: { gameState: nextState, updatedAt: new Date() } });

  response.json({ ok: true, gameState: nextState });
}));

app.post('/api/runner/verify-final-qr', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth || auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can verify final QR code' });
    return;
  }

  const { qrCode } = request.body as { qrCode?: string };
  if (!qrCode?.trim()) {
    response.status(400).json({ error: 'qrCode is required' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }

  if (team.gameState.stage !== 'final_qr') {
    response.status(409).json({ error: 'Final QR verification is not active right now' });
    return;
  }

  const expectedQrCode = buildFinalRoundQrCode(team._id.toString());
  if (expectedQrCode !== qrCode.trim().toUpperCase()) {
    response.status(401).json({ error: 'Invalid final QR code' });
    return;
  }

  const nextState: GameState = {
    ...team.gameState,
    stage: 'complete',
    finishTime: team.gameState.finishTime || new Date().toISOString(),
  };

  const teams = await getTeamsCollection();
  await teams.updateOne({ _id: team._id }, { $set: { gameState: nextState, updatedAt: new Date() } });

  response.json({ ok: true, gameState: nextState });
}));

// Runner GPS location update — called frequently by runner's device
app.put('/api/runner/location', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  if (auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can update location' });
    return;
  }

  const { lat, lng } = request.body as { lat?: unknown; lng?: unknown };
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    response.status(400).json({ error: 'lat and lng must be valid numbers' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: toObjectId(auth.teamId, 'team id') },
    { $set: { 'gameState.currentLat': lat, 'gameState.currentLng': lng, updatedAt: new Date() } }
  );

  response.json({ ok: true });
}));

app.get('/api/leaderboard', route(async (_request, response) => {
  const teams = await getTeamsCollection();
  const docs = await teams.find({}, { sort: { 'gameState.round': -1, 'gameState.startTime': 1 } }).toArray();

  const leaderboard = docs.map(team => {
    const solvedCount = team.gameState.roundsDone.filter(Boolean).length;
    return {
      id: team._id.toString(),
      name: team.name,
      round: team.gameState.round,
      solvedCount,
      stage: team.gameState.stage,
      startTime: team.gameState.startTime,
      finishTime: team.gameState.finishTime,
      currentLat: team.gameState.currentLat ?? null,
      currentLng: team.gameState.currentLng ?? null,
    };
  });

  response.json({ leaderboard });
}));

app.get('/api/admin/config', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const config = await getConfigCollection();
  const docs = await config.find({}).toArray();
  const configMap = docs.reduce((acc, doc) => {
    acc[doc.key] = doc.value;
    return acc;
  }, {} as Record<string, any>);
  response.json(configMap);
}));

app.put('/api/admin/config', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { key, value } = request.body as { key?: string; value?: any };
  if (!key) {
    response.status(400).json({ error: 'key is required' });
    return;
  }
  const config = await getConfigCollection();
  await config.updateOne(
    { key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
  response.json({ ok: true });
}));

app.post('/api/admin/login', (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };
  if (!email || !password) {
    response.status(400).json({ error: 'email and password are required' });
    return;
  }

  if (email.toLowerCase() !== getAdminEmail().toLowerCase() || password !== getAdminPassword()) {
    response.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  const token = signAdminToken({ kind: 'admin', email });
  response.json({ token, email });
});

app.get('/api/admin/teams', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const teams = await getTeamsCollection();
  const docs = await teams.find({}, { sort: { createdAt: -1 } }).toArray();
  response.json({
    teams: docs.map(team => ({
      id: team._id.toString(),
      name: team.name,
      email: team.email || '',
      createdAt: team.createdAt,
      lastLoginAt: team.lastLoginAt || null,
    })),
  });
}));

app.post('/api/admin/teams', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { name, email, password } = request.body as { name?: string; email?: string; password?: string };
  if (!name || !password) {
    response.status(400).json({ error: 'name and password are required' });
    return;
  }

  const roundCount = await getRoundCount();
  try {
    await createTeam(name, password, email?.trim() || undefined, roundCount, false);
  } catch (err: any) {
    response.status(409).json({ error: 'Team already exists' });
    return;
  }

  response.status(201).json({ ok: true });
}));

app.delete('/api/admin/teams/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const teamId = String(request.params.id);
  if (!ObjectId.isValid(teamId)) {
    response.status(400).json({ error: 'Invalid team id' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.deleteOne({ _id: toObjectId(teamId, 'team id') });
  response.json({ ok: true });
}));

app.delete('/api/admin/teams', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const teams = await getTeamsCollection();
  const result = await teams.deleteMany({});
  response.json({ ok: true, deletedCount: result.deletedCount });
}));

app.get('/api/admin/questions', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const questions = await getQuestionsCollection();
  const docs = await questions.find({}).sort({ round: 1 }).toArray();
  response.json({
    questions: docs.map(({ _id, ...rest }) => ({
      id: _id.toString(),
      ...rest,
      locationQrCode: resolveQuestionLocationQrCode(rest as QuestionDocument),
    })),
  });
}));

app.post('/api/admin/questions', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const payload = createQuestionPayload(request.body);
  const now = new Date();
  const questions = await getQuestionsCollection();
  try {
    await generateQuestionQrAsset(payload);
    const result = await questions.insertOne({ ...payload, createdAt: now, updatedAt: now });
    response.status(201).json({ id: result.insertedId.toString(), locationQrCode: payload.locationQrCode });
  } catch (error) {
    throw new HttpError(400, 'Invalid question payload or duplicate round number');
  }
}));

app.put('/api/admin/questions/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const questionId = String(request.params.id);
  const objectId = toObjectId(questionId, 'question id');

  const questions = await getQuestionsCollection();
  try {
    const existing = await questions.findOne({ _id: objectId });
    if (!existing) {
      response.status(404).json({ error: 'Question not found' });
      return;
    }

    const payload = createQuestionPayload(request.body, existing);
    await generateQuestionQrAsset(payload);
    await questions.updateOne({ _id: objectId }, { $set: { ...payload, updatedAt: new Date() } });
    response.json({ ok: true });
  } catch {
    throw new HttpError(400, 'Invalid question payload or duplicate round number');
  }
}));

app.delete('/api/admin/questions/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const questionId = String(request.params.id);

  const questions = await getQuestionsCollection();
  await questions.deleteOne({ _id: toObjectId(questionId, 'question id') });
  response.json({ ok: true });
}));

app.delete('/api/admin/questions', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const questions = await getQuestionsCollection();
  const result = await questions.deleteMany({});
  response.json({ ok: true, deletedCount: result.deletedCount });
}));

app.delete('/api/admin/database', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const teams = await getTeamsCollection();
  const questions = await getQuestionsCollection();

  const [teamsResult, questionsResult] = await Promise.all([
    teams.deleteMany({}),
    questions.deleteMany({}),
  ]);

  response.json({
    ok: true,
    deletedTeams: teamsResult.deletedCount,
    deletedQuestions: questionsResult.deletedCount,
  });
}));

app.use(createApiErrorHandler());

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

async function main() {
  await ensureIndexes();
  await seedQuestionsIfEmpty();

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the existing process or change PORT in backend/.env.`);
      process.exit(1);
    }

    console.error('Server failed to start', error);
    process.exit(1);
  });
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  await new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        console.error('Error while closing HTTP server', error);
      }
      resolve();
    });
  });

  try {
    await closeClient();
  } catch (error) {
    console.error('Error while closing MongoDB connection', error);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT').finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM').finally(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

main().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
