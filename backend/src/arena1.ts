import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { ObjectId, type WithId } from 'mongodb';
import { getArena1TeamsCollection, getArena1QuestionsCollection } from './db';
import { normalizeTeamName } from './auth';
import type {
  Arena1TeamDocument,
  Arena1QuestionDocument,
  Arena1GameState,
  Arena1SlotResult,
  Arena1SlotType,
} from './arena1-types';

// ── Constants ────────────────────────────────────────────────────────────────

export const SLOT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const TOTAL_SLOTS = 4;
export const INITIAL_SWAPS = 4;
const SLOT_TYPES: Arena1SlotType[] = ['html', 'css', 'js', 'combined'];

// Submissions stored here: backend/arena1_submissions/{teamId}/slot_{n}.html
export function getSubmissionsDir() {
  return path.resolve(process.cwd(), 'arena1_submissions');
}

export function getSubmissionPath(teamId: string, slot: number) {
  return path.join(getSubmissionsDir(), teamId, `slot_${slot}.html`);
}

// ── Initial State ────────────────────────────────────────────────────────────

export function createInitialArena1GameState(): Arena1GameState {
  return {
    status: 'waiting',
    currentSlot: 0,
    slotStartedAt: null,
    swapsLeft: INITIAL_SWAPS,
    slotResults: [],
    startedAt: null,
    finishedAt: null,
  };
}

// ── Team CRUD ────────────────────────────────────────────────────────────────

export async function findArena1TeamByName(teamName: string) {
  const teams = await getArena1TeamsCollection();
  return teams.findOne({ nameNormalized: normalizeTeamName(teamName) });
}

export async function findArena1TeamById(teamId: string) {
  if (!ObjectId.isValid(teamId)) return null;
  const teams = await getArena1TeamsCollection();
  return teams.findOne({ _id: new ObjectId(teamId) });
}

export async function verifyArena1TeamPassword(team: Arena1TeamDocument, password: string) {
  return bcrypt.compare(password, team.passwordHash);
}

export async function createArena1Team(
  teamName: string,
  password: string,
  solverName?: string,
  runnerName?: string,
) {
  const teams = await getArena1TeamsCollection();
  const nameNormalized = normalizeTeamName(teamName);
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const existing = await teams.findOne({ nameNormalized });
  if (existing) {
    const err = new Error('Arena1 team already exists');
    (err as any).code = 11000;
    throw err;
  }

  const document: Arena1TeamDocument = {
    name: teamName.trim(),
    nameNormalized,
    solverName: solverName?.trim(),
    runnerName: runnerName?.trim(),
    passwordHash,
    gameState: createInitialArena1GameState(),
    score: 0,
    createdAt: now,
    updatedAt: now,
  };

  await teams.insertOne(document);
}

// ── Timer Logic (server-authoritative) ──────────────────────────────────────

export function getSlotTimeLeftMs(team: Arena1TeamDocument): number {
  if (team.gameState.status !== 'active') return SLOT_DURATION_MS;
  if (!team.gameState.slotStartedAt) return SLOT_DURATION_MS;
  const elapsed = Date.now() - new Date(team.gameState.slotStartedAt).getTime();
  return Math.max(0, SLOT_DURATION_MS - elapsed);
}

export function isSlotExpired(team: Arena1TeamDocument): boolean {
  return getSlotTimeLeftMs(team) === 0;
}

// ── Slot Advance ─────────────────────────────────────────────────────────────

async function getSlotQuestion(slot: number, questionId?: string): Promise<WithId<Arena1QuestionDocument> | null> {
  const questions = await getArena1QuestionsCollection();
  if (questionId && ObjectId.isValid(questionId)) {
    return questions.findOne({ _id: new ObjectId(questionId) });
  }
  // Default: fetch main question for this slot type (not reserve)
  const type = SLOT_TYPES[slot];
  return questions.findOne({ type, isReserve: false });
}

async function getReserveQuestion(type: Arena1SlotType, excludeIds: string[]): Promise<WithId<Arena1QuestionDocument> | null> {
  const questions = await getArena1QuestionsCollection();
  const excludeOids = excludeIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
  
  const availableReserves = await questions.find({
    isReserve: true,
    ...(excludeOids.length > 0 ? { _id: { $nin: excludeOids } } : {}),
  }).toArray();

  if (availableReserves.length === 0) return null;

  // Pick a random reserve question from the pool
  const randomIndex = Math.floor(Math.random() * availableReserves.length);
  return availableReserves[randomIndex];
}

/** Advance to next slot or finish the game */
async function advanceToNextSlot(teamId: string, finishedResult: Arena1SlotResult): Promise<Arena1GameState> {
  const teams = await getArena1TeamsCollection();
  const team = await findArena1TeamById(teamId);
  if (!team) throw new Error('Team not found');

  const slotResults = [...team.gameState.slotResults.filter(r => r.slot !== finishedResult.slot), finishedResult];
  const nextSlot = finishedResult.slot + 1;
  const now = new Date().toISOString();

  let nextState: Arena1GameState;

  if (nextSlot >= TOTAL_SLOTS) {
    // All 4 slots done — game over
    const totalScore = slotResults.reduce((acc, r) => acc + r.points, 0);
    await teams.updateOne(
      { _id: new ObjectId(teamId) },
      {
        $set: {
          'gameState.status': 'done',
          'gameState.slotResults': slotResults,
          'gameState.finishedAt': now,
          'gameState.slotStartedAt': null,
          score: totalScore,
          updatedAt: new Date(),
        },
      }
    );
    nextState = { ...team.gameState, status: 'done', slotResults, finishedAt: now, slotStartedAt: null };
  } else {
    // Load next slot's question
    const nextQ = await getSlotQuestion(nextSlot);
    const nextQId = nextQ ? nextQ._id.toString() : '';

    // Ensure result placeholder exists for next slot
    if (!slotResults.find(r => r.slot === nextSlot)) {
      slotResults.push(makeBlankResult(nextSlot, nextQId));
    }

    nextState = {
      ...team.gameState,
      currentSlot: nextSlot,
      slotStartedAt: now,
      slotResults,
    };

    await teams.updateOne(
      { _id: new ObjectId(teamId) },
      { $set: { gameState: nextState, updatedAt: new Date() } }
    );
  }

  return nextState;
}

function makeBlankResult(slot: number, questionId: string): Arena1SlotResult {
  return {
    slot,
    questionId,
    submittedAt: null,
    submittedFilePath: null,
    approved: null,
    points: 0,
    swapped: false,
    skipped: false,
    timeMs: null,
  };
}

// ── Auto-Skip (called by background job + every API hit) ────────────────────

export async function checkAndAutoSkip(teamId: string): Promise<boolean> {
  const team = await findArena1TeamById(teamId);
  if (!team || team.gameState.status !== 'active') return false;
  if (!isSlotExpired(team)) return false;

  const currentSlot = team.gameState.currentSlot;
  const existingResult = team.gameState.slotResults.find(r => r.slot === currentSlot);

  // Don't re-skip an already-processed slot
  if (existingResult && (existingResult.skipped || existingResult.approved !== null)) return false;

  const skippedResult: Arena1SlotResult = {
    slot: currentSlot,
    questionId: existingResult?.questionId ?? '',
    submittedAt: null,
    submittedFilePath: null,
    approved: false,
    points: 0,
    swapped: existingResult?.swapped ?? false,
    skipped: true,
    timeMs: SLOT_DURATION_MS,
  };

  await advanceToNextSlot(teamId, skippedResult);
  return true;
}

export async function manualSkip(teamId: string): Promise<{ ok: boolean; error?: string }> {
  const team = await findArena1TeamById(teamId);
  if (!team || team.gameState.status !== 'active') return { ok: false, error: 'Game is not active' };

  const currentSlot = team.gameState.currentSlot;
  const existingResult = team.gameState.slotResults.find(r => r.slot === currentSlot);

  // Don't re-skip an already-processed slot
  if (existingResult && (existingResult.skipped || existingResult.approved !== null)) {
    return { ok: false, error: 'Slot already processed' };
  }

  const skippedResult: Arena1SlotResult = {
    slot: currentSlot,
    questionId: existingResult?.questionId ?? '',
    submittedAt: null,
    submittedFilePath: null,
    approved: false,
    points: 0,
    swapped: existingResult?.swapped ?? false,
    skipped: true,
    timeMs: existingResult?.timeMs ?? 0, // Record time taken if possible, but 0 is fine for manual skip
  };

  await advanceToNextSlot(teamId, skippedResult);
  return { ok: true };
}

// ── Swap ─────────────────────────────────────────────────────────────────────

export async function performSwap(teamId: string): Promise<{ ok: boolean; error?: string; newQuestionId?: string }> {
  const team = await findArena1TeamById(teamId);
  if (!team) return { ok: false, error: 'Team not found' };
  if (team.gameState.status !== 'active') return { ok: false, error: 'Game is not active' };
  if (team.gameState.swapsLeft <= 0) return { ok: false, error: 'No swaps remaining' };

  const currentSlot = team.gameState.currentSlot;
  const type = SLOT_TYPES[currentSlot];

  // Collect IDs already seen for this slot
  const usedIds = team.gameState.slotResults
    .filter(r => r.slot === currentSlot)
    .map(r => r.questionId);

  const reserveQ = await getReserveQuestion(type, usedIds);
  if (!reserveQ) return { ok: false, error: 'No reserve questions available for this slot type' };

  const now = new Date().toISOString();
  const newResult = makeBlankResult(currentSlot, reserveQ._id.toString());
  newResult.swapped = true;

  const slotResults = [
    ...team.gameState.slotResults.filter(r => r.slot !== currentSlot),
    newResult,
  ];

  const teams = await getArena1TeamsCollection();
  await teams.updateOne(
    { _id: new ObjectId(teamId) },
    {
      $set: {
        'gameState.slotResults': slotResults,
        'gameState.slotStartedAt': now,
        'gameState.swapsLeft': team.gameState.swapsLeft - 1,
        updatedAt: new Date(),
      },
    }
  );

  return { ok: true, newQuestionId: reserveQ._id.toString() };
}

// ── Submit (save HTML file) ──────────────────────────────────────────────────

export async function submitSlot(
  teamId: string,
  slot: number,
  html: string,
  css: string,
  js: string,
): Promise<{ ok: boolean; error?: string; filePath?: string }> {
  const team = await findArena1TeamById(teamId);
  if (!team) return { ok: false, error: 'Team not found' };
  if (team.gameState.status !== 'active') return { ok: false, error: 'Game is not active' };
  if (team.gameState.currentSlot !== slot) return { ok: false, error: 'Incorrect slot' };

  const timeMs = SLOT_DURATION_MS - getSlotTimeLeftMs(team);

  // Build self-contained HTML file
  const combined = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission – Slot ${slot + 1}</title>
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}</script>
</body>
</html>`;

  // Save to filesystem
  const dir = path.join(getSubmissionsDir(), teamId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = getSubmissionPath(teamId, slot);
  fs.writeFileSync(filePath, combined, 'utf-8');

  // Update DB
  const now = new Date().toISOString();
  const existingResult = team.gameState.slotResults.find(r => r.slot === slot);
  const blankFallback = makeBlankResult(slot, '');
  const updatedResult: Arena1SlotResult = {
    ...(existingResult ?? blankFallback),
    submittedAt: now,
    submittedFilePath: filePath,
    approved: null,  // pending review
    points: 0,
    timeMs,
  };

  await advanceToNextSlot(teamId, updatedResult);

  return { ok: true, filePath };
}

// ── Admin Review ─────────────────────────────────────────────────────────────

export async function reviewSlot(
  teamId: string,
  slot: number,
  approved: boolean,
  points: number,
): Promise<{ ok: boolean; error?: string }> {
  const team = await findArena1TeamById(teamId);
  if (!team) return { ok: false, error: 'Team not found' };

  const result = team.gameState.slotResults.find(r => r.slot === slot);
  if (!result) return { ok: false, error: 'Slot result not found' };
  if (result.submittedAt === null) return { ok: false, error: 'No submission to review' };

  const updatedResult: Arena1SlotResult = { ...result, approved, points };
  const slotResults = [
    ...team.gameState.slotResults.filter(r => r.slot !== slot),
    updatedResult,
  ];

  const teams = await getArena1TeamsCollection();
  await teams.updateOne(
    { _id: new ObjectId(teamId) },
    { $set: { 'gameState.slotResults': slotResults, updatedAt: new Date() } }
  );

  // Recalculate total score
  const latestTeam = await findArena1TeamById(teamId);
  if (latestTeam) {
    const totalScore = latestTeam.gameState.slotResults.reduce((acc, r) => acc + r.points, 0);
    await teams.updateOne(
      { _id: new ObjectId(teamId) },
      { $set: { score: totalScore, updatedAt: new Date() } }
    );
  }

  return { ok: true };
}

// ── Start / End Arena 1 ──────────────────────────────────────────────────────

export async function startArena1(): Promise<void> {
  const teams = await getArena1TeamsCollection();
  const questions = await getArena1QuestionsCollection();
  const now = new Date().toISOString();

  const allTeams = await teams.find({}).toArray();

  for (const team of allTeams) {
    // Get the question for slot 0
    const firstQ = await questions.findOne({ type: 'html', isReserve: false });
    const firstQId = firstQ ? firstQ._id.toString() : '';

    const initialResult = makeBlankResult(0, firstQId);

    await teams.updateOne(
      { _id: team._id },
      {
        $set: {
          gameState: {
            status: 'active',
            currentSlot: 0,
            slotStartedAt: now,
            swapsLeft: INITIAL_SWAPS,
            slotResults: [initialResult],
            startedAt: now,
            finishedAt: null,
          } as Arena1GameState,
          updatedAt: new Date(),
        },
      }
    );
  }
}

export async function endArena1(): Promise<void> {
  const teams = await getArena1TeamsCollection();
  const allTeams = await teams.find({ 'gameState.status': 'active' }).toArray();
  const now = new Date().toISOString();

  for (const team of allTeams) {
    const totalScore = team.gameState.slotResults.reduce((acc, r) => acc + r.points, 0);
    await teams.updateOne(
      { _id: team._id },
      {
        $set: {
          'gameState.status': 'done',
          'gameState.finishedAt': now,
          score: totalScore,
          updatedAt: new Date(),
        },
      }
    );
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

export async function buildArena1Report() {
  const teams = await getArena1TeamsCollection();
  const allTeams = await teams.find({}).sort({ score: -1 }).toArray();

  return allTeams.map((team, index) => {
    const slots = [0, 1, 2, 3].map(slot => {
      const result = team.gameState.slotResults.find(r => r.slot === slot);
      return result?.points ?? 0;
    });
    const swapsUsed = INITIAL_SWAPS - team.gameState.swapsLeft;

    return {
      rank: index + 1,
      name: team.name,
      slots,
      swapsUsed,
      total: team.score,
    };
  });
}
