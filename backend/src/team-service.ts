import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { createInitialGameState } from './game';
import { getTeamsCollection } from './db';
import { normalizeTeamName } from './auth';
import type { TeamDocument } from './types';

export async function findTeamByName(teamName: string) {
  const teams = await getTeamsCollection();
  return teams.findOne({ nameNormalized: normalizeTeamName(teamName) });
}

export async function findTeamById(teamId: string) {
  if (!ObjectId.isValid(teamId)) {
    return null;
  }

  const teams = await getTeamsCollection();
  return teams.findOne({ _id: new ObjectId(teamId) });
}

export async function verifyTeamPassword(team: TeamDocument, password: string) {
  return bcrypt.compare(password, team.passwordHash);
}

export async function createTeam(teamName: string, password: string, email: string | undefined, roundCount: number, force = false) {
  const teams = await getTeamsCollection();
  const nameNormalized = normalizeTeamName(teamName);
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const document: TeamDocument = {
    name: teamName.trim(),
    nameNormalized,
    email,
    passwordHash,
    gameState: createInitialGameState(roundCount),
    createdAt: now,
    updatedAt: now,
  };

  if (force) {
    await teams.updateOne(
      { nameNormalized },
      { $set: document, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return;
  }

  const existing = await teams.findOne({ nameNormalized });
  if (existing) {
    const err = new Error('Team already exists');
    (err as any).code = 11000;
    throw err;
  }

  await teams.insertOne(document);
}
