import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { ObjectId } from 'mongodb';
import type { LoginPayload, GameState } from './types';
import { ensureIndexes, getQuestionsCollection, getTeamsCollection, getConfigCollection } from './db';
import { requireAdmin, requireAuth, signAdminToken, signToken, normalizeRole, type AdminAuthedRequest, type AuthedRequest } from './auth';
import { createTeam, findTeamByName, verifyTeamPassword, findTeamById } from './team-service';
import { createInitialGameState, normalizeGameState, sanitizeGameStateUpdate } from './game';
import { DEFAULT_QUESTIONS } from './defaultQuestions';

const envPath = path.resolve(__dirname, '../.env');
const fallbackEnvPath = path.resolve(__dirname, '../.env.example');
const envLoad = dotenv.config({ path: envPath });
if (envLoad.error) {
  dotenv.config({ path: fallbackEnvPath });
}

const app = express();
const port = Number(process.env.PORT || 4000);

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
  await questions.insertMany(DEFAULT_QUESTIONS.map(question => ({ ...question, createdAt: now, updatedAt: now })));
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/auth/login', async (request, response) => {
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
});

app.get('/api/session', requireAuth, async (request: AuthedRequest, response) => {
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
});

app.get('/api/game/state', requireAuth, async (request: AuthedRequest, response) => {
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
});

app.patch('/api/game/state', requireAuth, async (request: AuthedRequest, response) => {
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
});

app.post('/api/game/reset', requireAuth, async (request: AuthedRequest, response) => {
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
});

// Language → Piston runtime config
const PISTON_CONFIG: Record<string, { language: string; version: string; fileName: string }> = {
  python:     { language: 'python',     version: '3.10.0',  fileName: 'solution.py'  },
  javascript: { language: 'javascript', version: '18.15.0', fileName: 'solution.js'  },
  typescript: { language: 'typescript', version: '5.0.3',   fileName: 'solution.ts'  },
  java:       { language: 'java',       version: '15.0.2',  fileName: 'Main.java'     },
  c:          { language: 'c',          version: '10.2.0',  fileName: 'solution.c'   },
  cpp:        { language: 'c++',        version: '10.2.0',  fileName: 'solution.cpp' },
  go:         { language: 'go',         version: '1.16.2',  fileName: 'solution.go'  },
};

app.post('/api/game/compile', requireAuth, async (request: AuthedRequest, response) => {
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
  const team = await teams.findOne({ _id: new ObjectId(auth.teamId) });
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
  const question = await questions.findOne({ _id: new ObjectId(questionId) });
  if (!question) {
    response.status(404).json({ error: 'Question not found' });
    return;
  }

  const testCases = question.p1.testCases || [];
  if (testCases.length === 0) {
    // Fallback for legacy questions without test cases (though we should migrate them)
    testCases.push({ input: '', output: question.p1.ans });
  }

  try {
    const pistonUrl = process.env.PISTON_API_URL || 'http://127.0.0.1:2000/api/v2/execute';
    const testResults = [];
    let allPassed = true;

    for (const tc of testCases) {
      const pistonRes = await fetch(pistonUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonCfg.language,
          version: pistonCfg.version,
          files: [{ name: pistonCfg.fileName, content: code }],
          stdin: tc.input || '',
          args: [],
          run_timeout: 5000,
          compile_timeout: 5000,
        }),
      });

      if (!pistonRes.ok) {
        throw new Error(`Piston API error: ${await pistonRes.text()}`);
      }

      const data = await pistonRes.json() as any;
      const run = data.run ?? { stdout: '', stderr: '', code: 0 };
      const compile = data.compile ?? { code: 0, stderr: '' };
      
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
    console.error('Execution failed:', err);
    response.status(502).json({ error: 'Code execution failed. Please check your logic or try again later.' });
  }
});

app.get('/api/questions', async (_request, response) => {
  try {
    const questions = await getQuestionsCollection();
    const docs = await questions.find({}).sort({ round: 1 }).toArray();
    
    // Mask sensitive fields for non-privileged players
    const masked = docs.map(({ _id, ...rest }) => {
      const q = rest as any;
      const p1 = q.p1 || {};
      return { 
        id: _id.toString(), 
        ...q,
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
  } catch (error: any) {
    console.error('Questions error:', error);
    response.status(500).json({ error: 'Failed to fetch questions', details: error.message });
  }
});

// Runner verifies the QR passkey to unlock their minigame
app.post('/api/runner/verify-passkey', requireAuth, async (request: AuthedRequest, response) => {
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
});

// Runner completes minigame — advances both solver & runner to next round
app.post('/api/runner/complete-round', requireAuth, async (request: AuthedRequest, response) => {
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
      stage: 'complete',
      roundsDone,
      finishTime: team.gameState.finishTime || new Date().toISOString(),
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
});

// Runner GPS location update — called frequently by runner's device
app.put('/api/runner/location', requireAuth, async (request: AuthedRequest, response) => {
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
    { _id: new ObjectId(auth.teamId) },
    { $set: { 'gameState.currentLat': lat, 'gameState.currentLng': lng, updatedAt: new Date() } }
  );

  response.json({ ok: true });
});

app.get('/api/leaderboard', async (_request, response) => {
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
});

app.get('/api/admin/config', requireAdmin, async (_request: AdminAuthedRequest, response) => {
  const config = await getConfigCollection();
  const docs = await config.find({}).toArray();
  const configMap = docs.reduce((acc, doc) => {
    acc[doc.key] = doc.value;
    return acc;
  }, {} as Record<string, any>);
  response.json(configMap);
});

app.put('/api/admin/config', requireAdmin, async (request: AdminAuthedRequest, response) => {
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
});

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

app.get('/api/admin/teams', requireAdmin, async (_request: AdminAuthedRequest, response) => {
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
});

app.post('/api/admin/teams', requireAdmin, async (request: AdminAuthedRequest, response) => {
  const { name, email, password } = request.body as { name?: string; email?: string; password?: string };
  if (!name || !password) {
    response.status(400).json({ error: 'name and password are required' });
    return;
  }

  const roundCount = await getRoundCount();
  try {
    await createTeam(name, password, email?.trim() || undefined, roundCount, false);
  } catch {
    response.status(409).json({ error: 'Team already exists' });
    return;
  }

  response.status(201).json({ ok: true });
});

app.delete('/api/admin/teams/:id', requireAdmin, async (request: AdminAuthedRequest, response) => {
  const teamId = String(request.params.id);
  if (!ObjectId.isValid(teamId)) {
    response.status(400).json({ error: 'Invalid team id' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.deleteOne({ _id: new ObjectId(teamId) });
  response.json({ ok: true });
});

app.delete('/api/admin/teams', requireAdmin, async (_request: AdminAuthedRequest, response) => {
  const teams = await getTeamsCollection();
  const result = await teams.deleteMany({});
  response.json({ ok: true, deletedCount: result.deletedCount });
});

app.get('/api/admin/questions', requireAdmin, async (_request: AdminAuthedRequest, response) => {
  try {
    const questions = await getQuestionsCollection();
    const docs = await questions.find({}).sort({ round: 1 }).toArray();
    response.json({ questions: docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })) });
  } catch (error: any) {
    console.error('Admin questions error:', error);
    response.status(500).json({ error: 'Failed to fetch questions', details: error.message });
  }
});

app.post('/api/admin/questions', requireAdmin, async (request: AdminAuthedRequest, response) => {
  const payload = request.body;
  const now = new Date();
  const questions = await getQuestionsCollection();
  try {
    const result = await questions.insertOne({ ...payload, createdAt: now, updatedAt: now });
    response.status(201).json({ id: result.insertedId.toString() });
  } catch {
    response.status(400).json({ error: 'Invalid question payload or duplicate round number' });
  }
});

app.put('/api/admin/questions/:id', requireAdmin, async (request: AdminAuthedRequest, response) => {
  const questionId = String(request.params.id);
  if (!ObjectId.isValid(questionId)) {
    response.status(400).json({ error: 'Invalid question id' });
    return;
  }

  const payload = request.body;
  const questions = await getQuestionsCollection();
  try {
    await questions.updateOne({ _id: new ObjectId(questionId) }, { $set: { ...payload, updatedAt: new Date() } });
    response.json({ ok: true });
  } catch {
    response.status(400).json({ error: 'Invalid question payload or duplicate round number' });
  }
});

app.delete('/api/admin/questions/:id', requireAdmin, async (request: AdminAuthedRequest, response) => {
  const questionId = String(request.params.id);
  if (!ObjectId.isValid(questionId)) {
    response.status(400).json({ error: 'Invalid question id' });
    return;
  }

  const questions = await getQuestionsCollection();
  await questions.deleteOne({ _id: new ObjectId(questionId) });
  response.json({ ok: true });
});

app.delete('/api/admin/questions', requireAdmin, async (_request: AdminAuthedRequest, response) => {
  const questions = await getQuestionsCollection();
  const result = await questions.deleteMany({});
  response.json({ ok: true, deletedCount: result.deletedCount });
});

app.delete('/api/admin/database', requireAdmin, async (_request: AdminAuthedRequest, response) => {
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
});

app.use((error: any, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('API error:', error);
  response.status(500).json({ error: 'Internal server error' });
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

async function main() {
  await ensureIndexes();
  await seedQuestionsIfEmpty();

  const server = app.listen(port, '0.0.0.0',() => {
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

main().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});