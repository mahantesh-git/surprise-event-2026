import http from 'http';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs';
import ExcelJS from 'exceljs';

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { ObjectId } from 'mongodb';
import type { LoginPayload, GameState, QuestionDocument } from './types';
import { closeClient, ensureIndexes, getQuestionsCollection, getTeamsCollection, getConfigCollection, getAdminPhrasesCollection, getReservePoolCollection, getArena1TeamsCollection, getArena1QuestionsCollection } from './db';
import { requireAdmin, requireAuth, signAdminToken, signToken, normalizeRole, requireArena1Auth, type AdminAuthedRequest, type AuthedRequest, type Arena1AuthedRequest } from './auth';
import { createTeam, findTeamByName, verifyTeamPassword, findTeamById } from './team-service';
import { claimReserveRound, getCurrentQuestionForTeam } from './round-swap-service';
import { createInitialGameState, normalizeGameState, sanitizeGameStateUpdate, calculateDifficulty } from './game';
import { DEFAULT_QUESTIONS } from './defaultQuestions';
import { asyncHandler, createApiErrorHandler, HttpError } from './errors';
import type { ChatMessage } from './types';
import { initDiscordBridge, sendAdminAlert, sendQRToDiscord } from './discord-bridge';
import { initSocketServer, broadcastLeaderboard } from './socket';
import {
  findArena1TeamByName,
  findArena1TeamById,
  verifyArena1TeamPassword,
  createArena1Team,
  getSlotTimeLeftMs,
  checkAndAutoSkip,
  performSwap,
  submitSlot,
  reviewSlot,
  startArena1,
  endArena1,
  buildArena1Report,
  getSubmissionPath,
  getSubmissionsDir,
  SLOT_DURATION_MS,
  manualSkip,
} from './arena1';

// Load environment variables. In production (Render), these are provided by the system.
// In local dev, this loads from the .env file.
dotenv.config();

console.log('--- SYSTEM STARTUP ---');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Discord Token Configured:', !!process.env.DISCORD_BOT_TOKEN);
console.log('-----------------------');

const app = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT || 4000);

// Attach Socket.io to the HTTP server immediately (before any routes)
initSocketServer(httpServer);

const eventQrCodesDir = path.resolve(__dirname, '../../event_qr_codes');
const questionQrScriptPath = path.resolve(__dirname, '../scripts/generate_question_qr.py');
const route = asyncHandler;
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

  return await new Promise<string>((resolve, reject) => {
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

/**
 * Update score and record history in a single atomic operation
 */
export async function recordScoreChange(teamId: string | ObjectId, amount: number, reason: string) {
  const teams = await getTeamsCollection();
  const id = typeof teamId === 'string' ? toObjectId(teamId, 'team id') : teamId;

  await teams.updateOne(
    { _id: id },
    {
      $inc: { score: amount },
      $push: {
        scoreHistory: {
          amount,
          reason,
          timestamp: new Date().toISOString()
        }
      } as any,
      $set: { updatedAt: new Date() }
    }
  );
}

function createQuestionPayload(input: any, existing?: Partial<QuestionDocument>): Omit<QuestionDocument, 'createdAt' | 'updatedAt'> {
  const round = Number(input?.round);
  const isReserve = Boolean(input?.isReserve);
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
    isReserve,
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

  // Seed default tactical phrases
  const config = await getConfigCollection();
  const phrasesKey = 'tacticalPhrases';
  const existingPhrases = await config.findOne({ key: phrasesKey });
  if (!existingPhrases) {
    const defaultPhrases = [
      'Node reached',
      'Scanning QR',
      'Need help!',
      'Moving to next',
      'Code solved!',
      'Runner ready',
      'Solver working',
      'On my way'
    ];
    await config.insertOne({
      key: phrasesKey,
      value: defaultPhrases,
      updatedAt: now
    });
  }
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

// CORS Configuration - Hardened for production
app.use(cors({
  origin: '*', // In production, you might want to restrict this to your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: false
}));

// Manual OPTIONS pre-flight handler
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, ngrok-skip-browser-warning');
  res.sendStatus(200);
});

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/admin/adjust-score', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { teamId, amount, reason } = request.body as { teamId?: string; amount?: number; reason?: string };

  if (!teamId || typeof amount !== 'number' || !reason?.trim()) {
    response.status(400).json({ error: 'teamId, amount (number), and reason are required' });
    return;
  }

  if (reason.trim().length < 5) {
    response.status(400).json({ error: 'Reason must be at least 5 characters for auditing' });
    return;
  }

  await recordScoreChange(teamId, amount, reason.trim());
  response.json({ ok: true });
}));

app.post('/api/game/penalty', requireAuth, route(async (request: AuthedRequest, response) => {
  const { amount, reason } = request.body as { amount?: number; reason?: string };
  if (typeof amount !== 'number' || !reason) {
    response.status(400).json({ error: 'amount and reason are required' });
    return;
  }

  await recordScoreChange(request.auth!.teamId, -amount, reason);
  response.json({ ok: true });
}));

app.post('/api/admin/teams/:id/swap', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const teamId = request.params.id as string;
  const result = await claimReserveRound(teamId, true);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }
  response.json(result);
}));

// Helper to inject the current question into the game state payload
async function augmentGameState(teamId: string, baseState: GameState) {
  const currentQ = await getCurrentQuestionForTeam(teamId);
  const team = await findTeamById(teamId);

  const activeQuestionOverride = currentQ ? {
    id: currentQ._id.toString(),
    round: currentQ.round,
    p1: { title: currentQ.p1?.title, hint: currentQ.p1?.hint, language: currentQ.p1?.language, code: currentQ.p1?.code },
    coord: currentQ.coord,
    volunteer: currentQ.volunteer,
    qrPasskey: currentQ.qrPasskey
  } : null;

  return {
    ...baseState,
    activeQuestionOverride,
    hasSwapped: !!(team?.swappedRounds && Object.keys(team.swappedRounds).length > 0)
  };
}

app.post('/api/auth/login', route(async (request, response) => {
  const body = request.body as LoginPayload;
  const teamName = body.teamName?.trim();
  const password = body.password;
  const role = normalizeRole(body.role);
  const deviceBypassKey = (body.deviceBypassKey ?? '').trim();

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

  // ── Check Arena 1 first ──────────────────────────────────────────────────
  const a1Team = await findArena1TeamByName(teamName);
  if (a1Team) {
    const isA1PasswordValid = await verifyArena1TeamPassword(a1Team, password);
    if (!isA1PasswordValid) {
      response.status(401).json({ error: 'Invalid team credentials' });
      return;
    }

    // ── ARENA 1 DEVICE LOCK ──────────────────────────────────────────────────
    const a1ActiveDevices: Record<string, string> = (a1Team as any).activeDevices ?? {};
    const a1ExistingFingerprint = a1ActiveDevices[role];

    if (a1ExistingFingerprint) {
      // Get IP and Location
      const a1ClientIp = (request.headers['x-forwarded-for'] as string || request.socket.remoteAddress || '').split(',')[0].trim();
      let a1GeoString = `\n**IP:** ${a1ClientIp || 'Unknown'}`;
      if (a1ClientIp && a1ClientIp !== '::1' && a1ClientIp !== '127.0.0.1') {
        try {
          const geoRes = await fetch(`http://ip-api.com/json/${a1ClientIp}?fields=status,country,regionName,city,lat,lon,isp`);
          const geoData = await geoRes.json();
          if (geoData.status === 'success') {
            a1GeoString = `\n**IP:** ${a1ClientIp}\n**Location:** ${geoData.city}, ${geoData.regionName}, ${geoData.country}\n**ISP:** ${geoData.isp}\n**Map:** <https://www.google.com/maps?q=${geoData.lat},${geoData.lon}>`;
          }
        } catch { /* ignore */ }
      }

      const bypassConfig = await configCollection.findOne({ key: 'deviceBypassKey' });
      const serverBypassKey: string = bypassConfig?.value ?? '';

      if (!deviceBypassKey || !serverBypassKey || deviceBypassKey !== serverBypassKey) {
        // 🔴 Discord alert: blocked
        void sendAdminAlert(
          `🔴 **[ARENA 1] DEVICE CONFLICT BLOCKED**\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**Team:** ${a1Team.name}\n` +
          `**Role:** ${role.toUpperCase()}\n` +
          `**Time:** ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${a1GeoString}\n` +
          `A second device attempted to login as **${a1Team.name} [${role.toUpperCase()}]** (Arena 1) but was blocked.\n` +
          `Provide a bypass key from Admin → Config → Device Lock if this is authorized.`,
          undefined,
          'auth'
        );
        response.status(409).json({
          error: 'DEVICE_CONFLICT',
          message: 'This account is already active on another device for this role. Request a bypass key from the event admin to override.',
        });
        return;
      }

      // Bypass key correct — 🟡 Discord alert: override
      void sendAdminAlert(
        `🟡 **[ARENA 1] DEVICE OVERRIDE AUTHORIZED**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**Team:** ${a1Team.name}\n` +
        `**Role:** ${role.toUpperCase()}\n` +
        `**Time:** ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${a1GeoString}\n` +
        `A bypass key was used to override the device lock for **${a1Team.name} [${role.toUpperCase()}]** (Arena 1).\n` +
        `The previous session has been invalidated. If this was unauthorized, rotate the bypass key immediately.`,
        undefined,
        'auth'
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    const a1Token = signToken({
      kind: 'team',
      teamId: a1Team._id.toString(),
      teamName: a1Team.name,
      role,
      arena: 'arena1',
    } as any);

    const a1Fingerprint = a1Token.split('.').pop()?.slice(-16) ?? a1Token.slice(-16);
    const a1Teams = await getArena1TeamsCollection();
    await a1Teams.updateOne(
      { _id: a1Team._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date(), [`activeDevices.${role}`]: a1Fingerprint } },
    );

    return response.json({
      token: a1Token,
      role,
      arena: 'arena1',
      team: {
        id: a1Team._id.toString(),
        name: a1Team.name,
        solverName: a1Team.solverName,
        runnerName: a1Team.runnerName,
      },
      gameState: a1Team.gameState,
    });
  }
  // ── Fall through to Arena 2 ───────────────────────────────────────────────

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

  // ── DEVICE LOCK ──────────────────────────────────────────────────────────
  // Block a second device logging in as the same team AND same role.
  // Different role = allowed (e.g., same team has one solver + one runner).
  // If a bypass key is provided and matches the admin-set key, allow it.
  const activeDevices: Record<string, string> = (team as any).activeDevices ?? {};
  const existingFingerprint = activeDevices[role];

  if (existingFingerprint) {
    // Get IP and Location
    const clientIp = (request.headers['x-forwarded-for'] as string || request.socket.remoteAddress || '').split(',')[0].trim();
    let geoString = `\n**IP:** ${clientIp || 'Unknown'}`;
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon,isp`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          geoString = `\n**IP:** ${clientIp}\n**Location:** ${geoData.city}, ${geoData.regionName}, ${geoData.country}\n**ISP:** ${geoData.isp}\n**Map:** <https://www.google.com/maps?q=${geoData.lat},${geoData.lon}>`;
        }
      } catch { /* ignore fetch failure */ }
    }

    // There is already a device registered for this team+role.
    // Allow only if a correct bypass key is supplied.
    const bypassConfig = await configCollection.findOne({ key: 'deviceBypassKey' });
    const serverBypassKey: string = bypassConfig?.value ?? '';

    if (!deviceBypassKey || !serverBypassKey || deviceBypassKey !== serverBypassKey) {
      // 🔴 Discord alert: blocked login attempt
      void sendAdminAlert(
        `🔴 **DEVICE CONFLICT BLOCKED**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**Team:** ${team.name}\n` +
        `**Role:** ${role.toUpperCase()}\n` +
        `**Time:** ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${geoString}\n` +
        `A second device attempted to login as **${team.name} [${role.toUpperCase()}]** but was blocked.\n` +
        `Provide a bypass key from Admin → Config → Device Lock if this is authorized.`,
        undefined,
        'auth'
      );
      response.status(409).json({
        error: 'DEVICE_CONFLICT',
        message: 'This account is already active on another device for this role. Request a bypass key from the event admin to override.',
      });
      return;
    }
    // Bypass key is correct — the new device takes over, old session is invalidated implicitly.
    // 🟡 Discord alert: override succeeded
    void sendAdminAlert(
      `🟡 **DEVICE OVERRIDE AUTHORIZED**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**Team:** ${team.name}\n` +
      `**Role:** ${role.toUpperCase()}\n` +
      `**Time:** ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${geoString}\n` +
      `A bypass key was used to override the device lock for **${team.name} [${role.toUpperCase()}]**.\n` +
      `The previous session has been invalidated. If this was unauthorized, rotate the bypass key immediately.`,
      undefined,
      'auth'
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const token = signToken({
    kind: 'team',
    teamId: team._id.toString(),
    teamName: team.name,
    role,
  });

  // Store a short fingerprint of this token so we can detect a second login later.
  // We use the last 16 chars of the JWT signature segment (unique per token).
  const tokenFingerprint = token.split('.').pop()?.slice(-16) ?? token.slice(-16);

  const teams = await getTeamsCollection();

  let gameState = team.gameState;
  if (!gameState.startTime) {
    gameState = { ...gameState, startTime: new Date().toISOString() };
  }

  await teams.updateOne(
    { _id: team._id },
    {
      $set: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        gameState,
        [`activeDevices.${role}`]: tokenFingerprint,
      },
    }
  );

  const augmentedState = await augmentGameState(team._id.toString(), gameState);

  response.json({
    token,
    role,
    team: {
      id: team._id.toString(),
      name: team.name,
      solverName: team.solverName,
      runnerName: team.runnerName,
    },
    gameState: augmentedState,
  });
}));

app.get('/api/session', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // ── Arena 1 session restore ───────────────────────────────────────────────
  if ((auth as any).arena === 'arena1') {
    const a1Team = await findArena1TeamById(auth.teamId);
    if (!a1Team) {
      response.status(401).json({ error: 'Invalid or expired Arena 1 session' });
      return;
    }
    return response.json({
      token: request.headers.authorization?.slice('Bearer '.length),
      role: auth.role,
      arena: 'arena1',
      team: {
        id: a1Team._id.toString(),
        name: a1Team.name,
        solverName: a1Team.solverName,
        runnerName: a1Team.runnerName,
      },
      gameState: a1Team.gameState,
    });
  }

  // ── Arena 2 / standard session restore ────────────────────────────────────
  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  response.json({
    team: {
      id: team._id.toString(),
      name: team.name,
      solverName: team.solverName,
      runnerName: team.runnerName,
    },
    role: auth.role,
  });
}));

app.get('/api/game/state', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const roundCount = await getRoundCount();
  const normalizedState = normalizeGameState(team.gameState, roundCount);
  if (JSON.stringify(normalizedState) !== JSON.stringify(team.gameState)) {
    const teams = await getTeamsCollection();
    await teams.updateOne({ _id: team._id }, { $set: { gameState: normalizedState, updatedAt: new Date() } });
  }

  const augmentedState = await augmentGameState(team._id.toString(), normalizedState);

  response.json({
    gameState: augmentedState,
    lastMessage: team.lastMessage || null,
    score: team.score || 0
  });
}));

app.patch('/api/game/state', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
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

  const augmentedState = await augmentGameState(team._id.toString(), nextState);

  response.json({
    gameState: augmentedState,
    lastMessage: team.lastMessage || null,
    score: team.score || 0
  });
}));

app.post('/api/game/reset', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const roundCount = await getRoundCount();
  const nextState = createInitialGameState(roundCount);

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    { $set: { gameState: nextState, updatedAt: new Date() } },
  );

  const augmentedState = await augmentGameState(team._id.toString(), nextState);

  response.json({
    gameState: augmentedState,
    lastMessage: team.lastMessage || null,
    score: team.score || 0
  });
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
    response.status(401).json({ error: 'Invalid or expired session' });
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
    response.status(401).json({ error: 'Invalid or expired session' });
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
  const question = await getCurrentQuestionForTeam(team._id.toString());

  if (!question || question._id.toString() !== questionId) {
    response.status(404).json({ error: 'Question not found or mismatch' });
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
            version: '*',
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

app.post('/api/team/request-help', requireAuth, route(async (request: AuthedRequest, response) => {
  if (!request.auth) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const teams = await getTeamsCollection();
  const team = await teams.findOne({ _id: toObjectId(request.auth.teamId, 'team id') });

  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const questions = await getQuestionsCollection();
  const roundCount = await questions.countDocuments({});
  const gameState = normalizeGameState(team.gameState, roundCount);
  const roundDisplay = gameState.round + 1;

  const location = request.body; // { lat, lng }
  const requesterName = request.auth.role === 'runner'
    ? (team.runnerName || 'RUNNER')
    : (team.solverName || 'SOLVER');

  const alertText = `TACTICAL SUPPORT REQUEST: ${requesterName} from Squad ${team.name} is requesting assistance on Round ${roundDisplay}`;

  const messageId = await sendAdminAlert(alertText, location?.lat ? location : undefined);

  if (messageId) {
    await teams.updateOne(
      { _id: team._id },
      {
        $set: {
          lastHelpMessageId: messageId,
          lastHelpRequesterRole: request.auth.role,
          'gameState.helpRequested': true,
          updatedAt: new Date()
        }
      }
    );
  }

  response.json({ ok: true });
}));
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

app.post('/api/runner/verify-location-qr', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth;
  if (!auth || auth.role !== 'runner') {
    response.status(403).json({ error: 'Only runners can verify location QR codes' });
    return;
  }

  const { qrCode, lat, lng } = request.body as { qrCode?: string; lat?: number; lng?: number };
  if (!qrCode?.trim()) {
    response.status(400).json({ error: 'qrCode is required' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const question = await getCurrentQuestionForTeam(team._id.toString());
  if (!question) {
    response.status(404).json({ error: 'No question found for this round' });
    return;
  }

  const expectedQrCode = resolveQuestionLocationQrCode(question);
  if (expectedQrCode.trim().toUpperCase() !== qrCode.trim().toUpperCase()) {
    response.status(401).json({ error: 'Invalid location QR' });
    return;
  }

  // Geofence enforcement
  if (lat !== undefined && lng !== undefined) {
    const targetLat = parseFloat(question.coord.lat);
    const targetLng = parseFloat(question.coord.lng);

    if (!isNaN(targetLat) && !isNaN(targetLng)) {
      const dist = getDistance(lat, lng, targetLat, targetLng);
      /* 
      if (dist > 25) {
        response.status(403).json({ error: `Area Restricted: You are ${Math.round(dist)}m away from the target location.` });
        return;
      }
      */
      console.log(`[TEST] Geofence bypassed. Actual distance: ${Math.round(dist)}m`);
    }
  } else {
    response.status(403).json({ error: 'Location required to scan QR. Please enable location services.' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    { $set: { 'gameState.lastValidatedAt': new Date(), 'gameState.stage': 'runner_entry', updatedAt: new Date() } }
  );

  // Award points for reaching the checkpoint
  const roundDisplay = team.gameState.round + 1;
  await recordScoreChange(team._id, 200, `Tactical Checkpoint ${roundDisplay} Secured`);

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
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const roundCount = await getRoundCount();
  const currentRoundIndex = team.gameState.round;
  const question = await getCurrentQuestionForTeam(team._id.toString());

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
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const roundCount = await getRoundCount();
  const currentRound = team.gameState.round;
  const roundsDone = [...team.gameState.roundsDone];
  roundsDone[currentRound] = true;

  const isLastRound = currentRound >= roundCount - 1;

  // Calculate Points & Speed Bonus according to Master Spec
  const basePoints = 200;
  const isHard = team.gameState.difficulty === 'hard';
  const difficultyBonus = isHard ? 283 : 0;

  let speedBonus = 0;
  let speedReason = "";
  let elapsedSeconds = 0;

  if (team.gameState.currentRoundStartTime) {
    const startTime = new Date(team.gameState.currentRoundStartTime).getTime();
    const endTime = Date.now();
    elapsedSeconds = (endTime - startTime) / 1000;

    // Time Tiers
    const elapsedMinutes = elapsedSeconds / 60;
    if (elapsedMinutes < 10) {
      speedBonus = 500;
    } else if (elapsedMinutes < 15) {
      speedBonus = 250;
    } else if (elapsedMinutes < 25) {
      speedBonus = 100;
    } else {
      speedBonus = 0;
    }

    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    speedReason = ` (Time: ${mins}m ${secs}s)`;
  }

  // Fetch Global Difficulty Protocol
  const config = await getConfigCollection();
  const protocolConfig = await config.findOne({ key: 'difficultyProtocol' });
  const protocol = protocolConfig?.value || 'auto'; // auto, normal, hard

  let nextDifficulty: 'normal' | 'hard' = calculateDifficulty(elapsedSeconds);
  if (protocol === 'normal') nextDifficulty = 'normal';
  if (protocol === 'hard') nextDifficulty = 'hard';

  // Calculate Hard Mode Decay Jackpot (Only if they were already in Hard mode for this round)
  let decayJackpot = 0;
  if (isHard) {
    const jackpotStart = 1000;
    const decayRate = 50;
    const decayInterval = 30;
    const decayPeriods = Math.floor(elapsedSeconds / decayInterval);
    decayJackpot = Math.max(0, jackpotStart - (decayPeriods * decayRate));
  }

  let nextState: GameState;
  if (isLastRound) {
    nextState = {
      ...team.gameState,
      stage: 'final_qr',
      roundsDone,
      finishTime: null,
      difficulty: nextDifficulty,
    };
  } else {
    nextState = {
      ...team.gameState,
      round: currentRound + 1,
      stage: 'p1_solve',
      roundsDone,
      handoff: null,
      difficulty: nextDifficulty,
      currentRoundStartTime: new Date().toISOString(),
    };
  }

  const teams = await getTeamsCollection();
  await teams.updateOne({ _id: team._id }, { $set: { gameState: nextState, difficultyTier: nextDifficulty, updatedAt: new Date() } });

  const totalPoints = basePoints + difficultyBonus + speedBonus + decayJackpot;
  const hardReason = isHard ? ` (Hard +${decayJackpot} Speed Jackpot)` : '';
  await recordScoreChange(team._id, totalPoints, `Round ${currentRound + 1} Cleared${hardReason}${speedReason}`);

  // Notify team of phase transition
  if (isLastRound) {
    const lastMessage: ChatMessage = {
      text: "MISSION UPDATE: Final authentication required at Solver Terminal. Scanned data incoming.",
      senderRole: 'system',
      timestamp: Date.now()
    };
    await teams.updateOne({ _id: team._id }, { $set: { lastMessage, updatedAt: new Date() } });
    notifyTeamMessage(team._id.toString(), 'game:update', { type: 'final_phase' });
    notifyTeamMessage(team._id.toString(), 'chat:message', lastMessage);
  } else {
    // Normal round transition
    notifyTeamMessage(team._id.toString(), 'game:update', { type: 'round_complete' });
  }

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
    response.status(401).json({ error: 'Invalid or expired session' });
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
    lastValidatedAt: new Date(),
  };

  const teams = await getTeamsCollection();
  await teams.updateOne({ _id: team._id }, { $set: { gameState: nextState, updatedAt: new Date() } });

  response.json({ ok: true, gameState: nextState });
}));

app.put('/api/runner/location', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  // Allow both runner and solver roles to update tactical location
  // to ensure continuous tracking throughout the round.

  const { lat, lng, heading } = request.body as { lat?: unknown; lng?: unknown; heading?: unknown };
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    response.status(400).json({ error: 'lat and lng must be valid numbers' });
    return;
  }

  const h = (typeof heading === 'number' && !isNaN(heading)) ? heading : null;

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    {
      $set: {
        'gameState.currentLat': lat,
        'gameState.currentLng': lng,
        'gameState.currentHeading': h,
        updatedAt: new Date()
      }
    }
  );

  // Also push lightweight update over socket to admin room (REST fallback path)
  const { getIo } = await import('./socket');
  getIo()?.to('admin').emit('runner:location', {
    teamId: auth.teamId,
    lat, lng, heading: h,
    timestamp: Date.now(),
  });

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
      score: team.score || 0,
      stage: team.gameState.stage,
      startTime: team.gameState.startTime,
      finishTime: team.gameState.finishTime,
      currentLat: team.gameState.currentLat ?? null,
      currentLng: team.gameState.currentLng ?? null,
      currentHeading: team.gameState.currentHeading ?? null,
      helpRequested: team.gameState.helpRequested || false,
      lastValidatedAt: team.gameState.lastValidatedAt || null,
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
app.post('/api/team/claim-swap', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  const result = await claimReserveRound(auth.teamId);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  // Record a notification message for the team
  const teams = await getTeamsCollection();
  const lastMessage: ChatMessage = {
    text: `MISSION UPDATE: Round Swap executed by ${auth.role.toUpperCase()}. New coordinates received. -300 pts.`,
    senderRole: 'system',
    timestamp: Date.now()
  };

  await teams.updateOne(
    { _id: new ObjectId(auth.teamId) },
    { $set: { lastMessage, updatedAt: new Date() } }
  );

  // Broadcast to trigger instant sync and notification on both devices
  notifyTeamMessage(auth.teamId, 'game:update', { type: 'burn_swap', role: auth.role });
  notifyTeamMessage(auth.teamId, 'chat:message', lastMessage);
  notifyTeamMessage('admin', 'chat:message', { ...lastMessage, teamId: auth.teamId });

  response.json(result);
}));


app.get('/api/chat/phrases', requireAuth, route(async (_request: AuthedRequest, response) => {
  const config = await getConfigCollection();
  const phrases = await config.findOne({ key: 'tacticalPhrases' });
  response.json({ phrases: phrases?.value || [] });
}));

import { notifyTeamMessage } from './socket';

app.post('/api/chat/send', requireAuth, route(async (request: AuthedRequest, response) => {
  const auth = request.auth!;
  const { text } = request.body as { text?: string };

  if (!text || typeof text !== 'string') {
    response.status(400).json({ error: 'Message text is required' });
    return;
  }

  const team = await findTeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const teams = await getTeamsCollection();
  const lastMessage: ChatMessage = {
    text,
    senderRole: auth.role,
    timestamp: Date.now()
  };

  await teams.updateOne(
    { _id: team._id },
    { $set: { lastMessage, updatedAt: new Date() } }
  );

  // Instantly push the message to the team room and admin room
  notifyTeamMessage(auth.teamId, 'chat:message', lastMessage);
  notifyTeamMessage('admin', 'chat:message', { ...lastMessage, teamId: auth.teamId });

  response.json({ ok: true, lastMessage });
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
      solverName: team.solverName || '',
      runnerName: team.runnerName || '',
      createdAt: team.createdAt,
      lastLoginAt: team.lastLoginAt || null,
      score: team.score || 0,
      scoreHistory: team.scoreHistory || [],
      gameState: team.gameState
    })),
  });
}));

app.post('/api/admin/chat/send', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { text, targetTeamId, targetRole } = request.body as { text?: string; targetTeamId?: string; targetRole?: 'runner' | 'solver' | 'all' };

  if (!text || typeof text !== 'string') {
    response.status(400).json({ error: 'Message text is required' });
    return;
  }

  const teams = await getTeamsCollection();
  const lastMessage: ChatMessage = {
    text,
    senderRole: 'admin',
    timestamp: Date.now(),
    targetRole: targetRole || 'all'
  };

  if (targetTeamId && targetTeamId !== 'all') {
    await teams.updateOne(
      { _id: toObjectId(targetTeamId, 'team id') },
      { $set: { lastMessage, updatedAt: new Date() } }
    );
    notifyTeamMessage(targetTeamId, 'chat:message', lastMessage);
  } else {
    await teams.updateMany(
      {},
      { $set: { lastMessage, updatedAt: new Date() } }
    );
    notifyTeamMessage('all', 'chat:message', lastMessage);
  }

  response.json({ ok: true });
}));

// ── DEVICE LOCK ADMIN ROUTES ─────────────────────────────────────────────────

/** GET /api/admin/device-bypass-key — returns the current bypass key (or empty string) */
app.get('/api/admin/device-bypass-key', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const configCollection = await getConfigCollection();
  const cfg = await configCollection.findOne({ key: 'deviceBypassKey' });
  response.json({ bypassKey: cfg?.value ?? '' });
}));

/** POST /api/admin/device-bypass-key — set or regenerate the bypass key */
app.post('/api/admin/device-bypass-key', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { bypassKey } = request.body as { bypassKey?: string };
  // If no key supplied, auto-generate a random 8-char uppercase key
  const key = (bypassKey ?? '').trim() || Math.random().toString(36).slice(2, 10).toUpperCase();
  const configCollection = await getConfigCollection();
  await configCollection.updateOne(
    { key: 'deviceBypassKey' },
    { $set: { key: 'deviceBypassKey', value: key, updatedAt: new Date() } },
    { upsert: true }
  );
  response.json({ ok: true, bypassKey: key });
}));

/** DELETE /api/admin/device-bypass-key — clear the bypass key (disable bypass entirely) */
app.delete('/api/admin/device-bypass-key', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const configCollection = await getConfigCollection();
  await configCollection.updateOne(
    { key: 'deviceBypassKey' },
    { $set: { key: 'deviceBypassKey', value: '', updatedAt: new Date() } },
    { upsert: true }
  );
  response.json({ ok: true });
}));

/** POST /api/admin/clear-device-lock — clear device lock for a specific team+role or all teams */
app.post('/api/admin/clear-device-lock', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { teamId, role } = request.body as { teamId?: string; role?: string };
  const teams = await getTeamsCollection();

  if (teamId && teamId !== 'all') {
    // Clear specific team's lock
    const oid = toObjectId(teamId, 'team id');
    if (role && (role === 'solver' || role === 'runner')) {
      await teams.updateOne({ _id: oid }, { $unset: { [`activeDevices.${role}`]: '' } });
    } else {
      await teams.updateOne({ _id: oid }, { $unset: { activeDevices: '' } });
    }
  } else {
    // Clear all teams
    await teams.updateMany({}, { $unset: { activeDevices: '' } });
  }

  response.json({ ok: true });
}));

// ─────────────────────────────────────────────────────────────────────────────

// --- Admin Phrases CRUD ---
app.get('/api/admin/phrases', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const collection = await getAdminPhrasesCollection();
  const phrases = await collection.find({}).toArray();
  response.json({ phrases });
}));

app.post('/api/admin/phrases', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { text } = request.body as { text?: string };
  if (!text || typeof text !== 'string') {
    response.status(400).json({ error: 'Phrase text is required' });
    return;
  }
  const collection = await getAdminPhrasesCollection();
  const result = await collection.insertOne({ text, createdAt: new Date() });
  response.json({ ok: true, phrase: { _id: result.insertedId, text } });
}));

app.put('/api/admin/phrases/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const phraseId = String(request.params.id);
  const { text } = request.body as { text?: string };
  if (!text || typeof text !== 'string') {
    response.status(400).json({ error: 'Phrase text is required' });
    return;
  }
  const collection = await getAdminPhrasesCollection();
  await collection.updateOne(
    { _id: toObjectId(phraseId, 'phrase id') },
    { $set: { text, updatedAt: new Date() } }
  );
  response.json({ ok: true });
}));

app.delete('/api/admin/phrases/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const phraseId = String(request.params.id);
  const collection = await getAdminPhrasesCollection();
  await collection.deleteOne({ _id: toObjectId(phraseId, 'phrase id') });
  response.json({ ok: true });
}));

app.post('/api/admin/teams', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { name, email, password, solverName, runnerName } = request.body as { name?: string; email?: string; password?: string; solverName?: string; runnerName?: string };
  if (!name || !password) {
    response.status(400).json({ error: 'name and password are required' });
    return;
  }

  const roundCount = await getRoundCount();
  try {
    await createTeam(name, password, email?.trim() || undefined, solverName?.trim() || undefined, runnerName?.trim() || undefined, roundCount, false);
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
    const qrPath = await generateQuestionQrAsset(payload);
    const result = await questions.insertOne({ ...payload, createdAt: now, updatedAt: now });

    if (payload.coord) {
      // Background task: send to Discord
      sendQRToDiscord(qrPath, payload.round, payload.coord.lat, payload.coord.lng, payload.coord.place || `Location ${payload.round}`).catch(err => {
        console.error('Failed to send QR to Discord on question creation:', err);
      });
    }

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
    const qrPath = await generateQuestionQrAsset(payload);
    await questions.updateOne({ _id: objectId }, { $set: { ...payload, updatedAt: new Date() } });

    if (payload.coord) {
      // Background task: send to Discord
      sendQRToDiscord(qrPath, payload.round, payload.coord.lat, payload.coord.lng, payload.coord.place || `Location ${payload.round}`).catch(err => {
        console.error('Failed to send QR to Discord on question update:', err);
      });
    }

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
  const reservePool = await getReservePoolCollection();

  const [totalQuestions, totalReserve, teamCount] = await Promise.all([
    questions.countDocuments(),
    reservePool.countDocuments(),
    teams.countDocuments()
  ]);

  response.json({ ok: true, data: { status: 'online', totalQuestions, totalReserve, teamCount } });
}));

// ── Arena 2: Time Handicap ────────────────────────────────────────────────────
app.post('/api/admin/teams/:id/adjust-time', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const teamId = String(request.params.id);
  const { adjustMinutes } = request.body as { adjustMinutes?: number };
  if (typeof adjustMinutes !== 'number' || isNaN(adjustMinutes)) {
    response.status(400).json({ error: 'adjustMinutes (number) is required' });
    return;
  }
  const teams = await getTeamsCollection();
  const team = await teams.findOne({ _id: toObjectId(teamId, 'team id') });
  if (!team) {
    response.status(404).json({ error: 'Team not found' });
    return;
  }
  if (!team.gameState.currentRoundStartTime) {
    response.status(400).json({ error: 'No active round timer to adjust' });
    return;
  }
  const currentStart = new Date(team.gameState.currentRoundStartTime).getTime();
  const adjustedStart = new Date(currentStart - adjustMinutes * 60 * 1000).toISOString();
  await teams.updateOne(
    { _id: team._id },
    { $set: { 'gameState.currentRoundStartTime': adjustedStart, updatedAt: new Date() } }
  );
  response.json({ ok: true, newStartTime: adjustedStart });
}));

// ═══════════════════════════════════════════════════════════════════════════
// ARENA 1 — ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ── A1: Team game state ──────────────────────────────────────────────────────
app.get('/api/a1/game/state', requireArena1Auth, route(async (request: Arena1AuthedRequest, response) => {
  const auth = request.a1Auth!;
  await checkAndAutoSkip(auth.teamId);
  const team = await findArena1TeamById(auth.teamId);
  if (!team) {
    response.status(401).json({ error: 'Invalid session' });
    return;
  }
  const msLeft = getSlotTimeLeftMs(team);
  // Fetch current question (safe fields only — no answers)
  const currentResult = team.gameState.slotResults.find(r => r.slot === team.gameState.currentSlot);
  let currentQuestion = null;
  if (currentResult?.questionId && ObjectId.isValid(currentResult.questionId)) {
    const questions = await getArena1QuestionsCollection();
    const q = await questions.findOne({ _id: new ObjectId(currentResult.questionId) });
    if (q) {
      currentQuestion = {
        id: q._id.toString(),
        slot: q.slot,
        type: q.type,
        title: q.title,
        description: q.description,
        starterHtml: q.starterHtml,
        starterCss: q.starterCss,
        starterJs: q.starterJs,
      };
    }
  }
  response.json({
    gameState: team.gameState,
    msLeft,
    score: team.score,
    currentQuestion,
    team: { id: team._id.toString(), name: team.name, solverName: team.solverName, runnerName: team.runnerName },
  });
}));

// ── A1: Submit code ────────────────────────────────────────────────────────
app.post('/api/a1/game/submit', requireArena1Auth, route(async (request: Arena1AuthedRequest, response) => {
  const auth = request.a1Auth!;
  if (auth.role !== 'solver') {
    response.status(403).json({ error: 'Only solver can submit code' });
    return;
  }
  const { html = '', css = '', js = '', slot } = request.body as { html?: string; css?: string; js?: string; slot?: number };
  if (typeof slot !== 'number') {
    response.status(400).json({ error: 'slot is required' });
    return;
  }
  await checkAndAutoSkip(auth.teamId);
  const result = await submitSlot(auth.teamId, slot, html, css, js);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }
  // Notify via socket
  const { getIo } = await import('./socket');
  getIo()?.to(`a1:${auth.teamId}`).emit('a1:submitted', { slot });
  getIo()?.to('admin').emit('a1:admin:refresh');
  response.json({ ok: true });
}));

// ── A1: Swap ───────────────────────────────────────────────────────────────
app.post('/api/a1/game/swap', requireArena1Auth, route(async (request: Arena1AuthedRequest, response) => {
  const auth = request.a1Auth!;
  await checkAndAutoSkip(auth.teamId);
  const result = await performSwap(auth.teamId);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }
  const team = await findArena1TeamById(auth.teamId);
  const msLeft = team ? getSlotTimeLeftMs(team) : SLOT_DURATION_MS;
  const { getIo } = await import('./socket');
  getIo()?.to(`a1:${auth.teamId}`).emit('a1:slot-change', {
    slot: team?.gameState.currentSlot,
    reason: 'swap',
    newQuestionId: result.newQuestionId,
    msLeft,
  });
  getIo()?.to('admin').emit('a1:admin:refresh');
  response.json({ ok: true, newQuestionId: result.newQuestionId, msLeft });
}));

// ── A1: Skip ───────────────────────────────────────────────────────────────
app.post('/api/a1/game/skip', requireArena1Auth, route(async (request: Arena1AuthedRequest, response) => {
  const auth = request.a1Auth!;
  const result = await manualSkip(auth.teamId);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }
  const team = await findArena1TeamById(auth.teamId);
  const msLeft = team ? getSlotTimeLeftMs(team) : SLOT_DURATION_MS;
  const { getIo } = await import('./socket');
  getIo()?.to(`a1:${auth.teamId}`).emit('a1:slot-change', {
    slot: team?.gameState.currentSlot,
    reason: 'skip',
    msLeft,
  });
  response.json({ ok: true, msLeft });
}));

app.post('/api/a1/game/share', requireArena1Auth, route(async (request: Arena1AuthedRequest, response) => {
  const auth = request.a1Auth!;
  const team = await findArena1TeamById(auth.teamId);
  if (!team) return response.status(404).json({ error: 'Team not found' });

  if (team.gameState.status !== 'done') {
    return response.status(400).json({ error: 'Arena not completed yet' });
  }

  const totalPoints = team.gameState.slotResults.reduce((sum: number, s: any) => sum + (s.points || 0), 0);
  const slotsIcons = team.gameState.slotResults.map((s: any) => s.approved ? '✅' : '❌').join(' ');

  const embed = [
    `TEAM ACHIEVEMENT: ${team.name}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ` Arena 1 Completed!`,
    ` Points: ${totalPoints}`,
    ` Progress: ${slotsIcons}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `#CodeScavenger #Arena1 #Achievement`
  ].join('\n');

  const { sendAdminAlert } = await import('./discord-bridge');
  await sendAdminAlert(embed, undefined, 'a1_result');
  response.json({ ok: true });
}));

// ── A1: Admin — list teams ─────────────────────────────────────────────────
app.get('/api/admin/a1/teams', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const teams = await getArena1TeamsCollection();
  const docs = await teams.find({}).sort({ createdAt: -1 }).toArray();
  response.json({
    teams: docs.map(t => ({
      id: t._id.toString(),
      name: t.name,
      solverName: t.solverName || '',
      runnerName: t.runnerName || '',
      score: t.score,
      gameState: t.gameState,
      createdAt: t.createdAt,
      failedLoginAttempts: t.failedLoginAttempts ?? 0,
      lockedUntil: t.lockedUntil ?? null,
    })),
  });
}));

// ── A1: Admin — create team ────────────────────────────────────────────────
app.post('/api/admin/a1/teams', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { name, password, solverName, runnerName } = request.body as { name?: string; password?: string; solverName?: string; runnerName?: string };
  if (!name || !password) {
    response.status(400).json({ error: 'name and password are required' });
    return;
  }
  try {
    await createArena1Team(name, password, solverName, runnerName);
  } catch (err: any) {
    response.status(409).json({ error: 'Arena 1 team already exists' });
    return;
  }
  response.status(201).json({ ok: true });
}));

// ── A1: Admin — delete team ────────────────────────────────────────────────
app.delete('/api/admin/a1/teams/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const id = String(request.params.id);
  const teams = await getArena1TeamsCollection();
  await teams.deleteOne({ _id: toObjectId(id, 'team id') });
  response.json({ ok: true });
}));

// ── A1: Admin — unlock account ─────────────────────────────────────────────
app.post('/api/admin/a1/teams/:id/unlock', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const id = String(request.params.id);
  const teams = await getArena1TeamsCollection();
  const team = await teams.findOne({ _id: toObjectId(id, 'team id') });
  if (!team) {
    return response.status(404).json({ error: 'Team not found' });
  }
  await teams.updateOne(
    { _id: team._id },
    { $set: { failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() } },
  );
  response.json({ ok: true, message: `Account unlocked for team "${team.name}"` });
}));

// ── A1: Admin — questions CRUD ─────────────────────────────────────────────
app.get('/api/admin/a1/questions', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const questions = await getArena1QuestionsCollection();
  const docs = await questions.find({}).sort({ slot: 1 }).toArray();
  response.json({ questions: docs.map(q => ({ ...q, id: q._id.toString() })) });
}));

app.post('/api/admin/a1/questions', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const { slot, type, title, description, starterHtml, starterCss, starterJs, defaultCode, points, isReserve } = request.body;
  if (!title || !type) {
    response.status(400).json({ error: 'title and type are required' });
    return;
  }
  const questions = await getArena1QuestionsCollection();
  const now = new Date();
  const result = await questions.insertOne({
    slot: Number(slot) || 1,
    type: type || 'html',
    title: String(title),
    description: String(description || ''),
    starterHtml: String(starterHtml || ''),
    starterCss: String(starterCss || ''),
    starterJs: String(starterJs || ''),
    defaultCode: String(defaultCode || ''),
    points: Number(points) || 100,
    isReserve: Boolean(isReserve),
    createdAt: now,
    updatedAt: now,
  });
  response.status(201).json({ ok: true, id: result.insertedId.toString() });
}));

app.put('/api/admin/a1/questions/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const id = String(request.params.id);
  const { slot, type, title, description, starterHtml, starterCss, starterJs, defaultCode, points, isReserve } = request.body;
  const questions = await getArena1QuestionsCollection();
  await questions.updateOne(
    { _id: toObjectId(id, 'question id') },
    {
      $set: {
        ...(slot !== undefined && { slot: Number(slot) }),
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title: String(title) }),
        ...(description !== undefined && { description: String(description) }),
        ...(starterHtml !== undefined && { starterHtml: String(starterHtml) }),
        ...(starterCss !== undefined && { starterCss: String(starterCss) }),
        ...(starterJs !== undefined && { starterJs: String(starterJs) }),
        ...(defaultCode !== undefined && { defaultCode: String(defaultCode) }),
        ...(points !== undefined && { points: Number(points) }),
        ...(isReserve !== undefined && { isReserve: Boolean(isReserve) }),
        updatedAt: new Date(),
      },
    }
  );
  response.json({ ok: true });
}));

app.delete('/api/admin/a1/questions/:id', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const id = String(request.params.id);
  const questions = await getArena1QuestionsCollection();
  await questions.deleteOne({ _id: toObjectId(id, 'question id') });
  response.json({ ok: true });
}));

// ── A1: Admin — start / end ────────────────────────────────────────────────
app.post('/api/admin/a1/game/start', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  await startArena1();
  const { getIo } = await import('./socket');
  getIo()?.emit('a1:state-refresh');
  response.json({ ok: true });
}));

app.post('/api/admin/a1/game/end', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  await endArena1();
  const { getIo } = await import('./socket');
  getIo()?.emit('a1:state-refresh');
  response.json({ ok: true });
}));

// ── A1: Admin — review submission ──────────────────────────────────────────
app.post('/api/admin/a1/review/:teamId/:slot', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const teamId = String(request.params.teamId);
  const slot = Number(request.params.slot);
  const { approved, points } = request.body as { approved?: boolean; points?: number };
  if (typeof approved !== 'boolean' || typeof points !== 'number') {
    response.status(400).json({ error: 'approved (boolean) and points (number) are required' });
    return;
  }
  const result = await reviewSlot(teamId, slot, approved, points);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }
  // Notify team
  const { getIo } = await import('./socket');
  getIo()?.to(`a1:${teamId}`).emit('a1:reviewed', { slot, approved, points });
  response.json({ ok: true });
}));

// ── A1: Admin — serve submission iframe ────────────────────────────────────
app.get('/api/admin/a1/submissions/:teamId/:slot', requireAdmin, route(async (request: AdminAuthedRequest, response) => {
  const teamId = String(request.params.teamId);
  const slot = Number(request.params.slot);
  const filePath = getSubmissionPath(teamId, slot);
  if (!fs.existsSync(filePath)) {
    response.status(404).send('No submission found');
    return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.sendFile(filePath);
}));

// ── A1: Admin — JSON report ────────────────────────────────────────────────
app.get('/api/admin/a1/report', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const report = await buildArena1Report();
  response.json({ report });
}));

// ── A1: Admin — Excel report ───────────────────────────────────────────────
app.get('/api/admin/a1/report/xlsx', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const report = await buildArena1Report();
  if (report.length === 0) {
    return response.status(400).json({ error: 'No data available for Arena 1 report' });
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QUEST: The Code Scavenger';
  const sheet = workbook.addWorksheet('Arena 1 Results');

  // Header
  sheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Team', key: 'name', width: 20 },
    { header: 'Q1 (HTML)', key: 'q1', width: 12 },
    { header: 'Q2 (CSS)', key: 'q2', width: 12 },
    { header: 'Q3 (JS)', key: 'q3', width: 12 },
    { header: 'Q4 (Combined)', key: 'q4', width: 14 },
    { header: 'Swaps Used', key: 'swaps', width: 12 },
    { header: 'Total Points', key: 'total', width: 14 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  headerRow.alignment = { horizontal: 'center' };

  // Data rows
  for (const row of report) {
    const dataRow = sheet.addRow({
      rank: row.rank,
      name: row.name,
      q1: row.slots[0],
      q2: row.slots[1],
      q3: row.slots[2],
      q4: row.slots[3],
      swaps: row.swapsUsed,
      total: row.total,
    });
    // Color code scores
    [3, 4, 5, 6].forEach(col => {
      const cell = dataRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: Number(cell.value) >= 300 ? 'FF2ECC71' : 'FFE74C3C' } };
      cell.alignment = { horizontal: 'center' };
    });
    dataRow.getCell(8).font = { bold: true };
  }

  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.setHeader('Content-Disposition', `attachment; filename="arena1_report_${Date.now()}.xlsx"`);
  await workbook.xlsx.write(response);
  response.end();
}));

// ── A1: Admin — Discord report ─────────────────────────────────────────────
app.post('/api/admin/a1/report/discord', requireAdmin, route(async (_request: AdminAuthedRequest, response) => {
  const report = await buildArena1Report();
  if (report.length === 0) {
    return response.status(400).json({ error: 'No teams have participated in Arena 1 yet' });
  }
  const medals = ['🥇', '🥈', '🥉'];
  const lines = report.map((row, i) => {
    const medal = medals[i] || `${row.rank}.`;
    const pts = row.total.toLocaleString();
    const slots = row.slots.map(p => p >= 300 ? '✅' : p === 0 ? '❌' : '⏳').join(' ');
    return `${medal} **${row.name}** — ${pts} pts ${slots}`;
  });

  const embed = [
    'ARENA 1 — FINAL RESULTS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    ...lines,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
  ].join('\n');

  await sendAdminAlert(embed, undefined, 'a1_result');
  response.json({ ok: true });
}));


app.use(createApiErrorHandler());


app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

async function main() {
  await ensureIndexes();
  await seedQuestionsIfEmpty();

  // ── Arena 1 background timer job ─────────────────────────────────────────
  // Check every 15s if any active A1 team's slot has expired and auto-skip
  setInterval(async () => {
    try {
      const a1Teams = await getArena1TeamsCollection();
      const activeTeams = await a1Teams.find({ 'gameState.status': 'active' }).toArray();
      for (const team of activeTeams) {
        const skipped = await checkAndAutoSkip(team._id.toString());
        if (skipped) {
          const { getIo } = await import('./socket');
          const updatedTeam = await findArena1TeamById(team._id.toString());
          getIo()?.to(`a1:${team._id}`).emit('a1:slot-change', {
            slot: updatedTeam?.gameState.currentSlot,
            reason: 'skip',
          });
          console.log(`[Arena1] Auto-skipped slot for team ${team.name}`);
        }
      }
    } catch (err) {
      console.error('[Arena1] Background timer error:', err);
    }
  }, 15_000);
  // ────────────────────────────────────────────────────────────────────────

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening on http://localhost:${port} (HTTP + WebSocket)`);

    // Init Discord Bridge in background (non-blocking so Render port stays open)
    initDiscordBridge().catch(error => {
      console.error('Discord Bridge failed to initialize, continuing without it:', error);
    });
  });

  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the existing process or change PORT in backend/.env.`);
      process.exit(1);
    }

    console.error('Server failed to start', error);
    process.exit(1);
  });
}


async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  await new Promise<void>((resolve) => {
    httpServer.close((error) => {
      if (error) console.error('Error while closing HTTP server', error);
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
