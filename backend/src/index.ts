import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { ObjectId } from 'mongodb';
import type { LoginPayload, GameState } from './types';
import { ensureIndexes, getQuestionsCollection, getTeamsCollection } from './db';
import { requireAdmin, requireAuth, signAdminToken, signToken, normalizeRole, type AdminAuthedRequest, type AuthedRequest } from './auth';
import { createTeam, findTeamByName, verifyTeamPassword, findTeamById } from './team-service';
import { createInitialGameState, normalizeGameState, sanitizeGameStateUpdate } from './game';
import { DEFAULT_QUESTIONS } from './defaultQuestions';
import { runPythonCode } from './pythonRunner';

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
  await teams.updateOne({ _id: team._id }, { $set: { lastLoginAt: new Date(), updatedAt: new Date() } });

  response.json({
    token,
    role,
    team: {
      id: team._id.toString(),
      name: team.name,
    },
    gameState: team.gameState,
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

app.post('/api/game/compile', requireAuth, async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (auth.role !== 'solver') {
    response.status(403).json({ error: 'Only solver can compile questions' });
    return;
  }

  const code = typeof request.body?.code === 'string' ? request.body.code : '';
  if (!code.trim()) {
    response.status(400).json({ error: 'code is required' });
    return;
  }

  if (code.length > 4000) {
    response.status(400).json({ error: 'Code is too large' });
    return;
  }

  try {
    const result = await runPythonCode(code);
    response.json(result);
  } catch {
    response.status(500).json({ error: 'Python runtime is not available on server' });
  }
});

app.get('/api/questions', async (_request, response) => {
  const questions = await getQuestionsCollection();
  const docs = await questions.find({}, { sort: { round: 1 } }).toArray();
  response.json({ questions: docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })) });
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
    };
  } else {
    nextState = {
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

app.post('/api/admin/login', (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };
  if (!email || !password) {
    response.status(400).json({ error: 'email and password are required' });
    return;
  }

  if (email !== getAdminEmail() || password !== getAdminPassword()) {
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
  const questions = await getQuestionsCollection();
  const docs = await questions.find({}, { sort: { round: 1 } }).toArray();
  response.json({ questions: docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })) });
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

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('API error:', error);
  response.status(500).json({ error: message });
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