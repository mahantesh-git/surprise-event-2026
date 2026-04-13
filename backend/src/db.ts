import { MongoClient, type Collection } from 'mongodb';
import type { TeamDocument, QuestionDocument } from './types';

let client: MongoClient | null = null;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  return uri;
}

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || 'quest';
}

export async function getTeamsCollection(): Promise<Collection<TeamDocument>> {
  if (!client) {
    client = new MongoClient(getMongoUri());
    await client.connect();
  }

  return client.db(getDatabaseName()).collection<TeamDocument>('teams');
}

export async function getQuestionsCollection(): Promise<Collection<QuestionDocument>> {
  if (!client) {
    client = new MongoClient(getMongoUri());
    await client.connect();
  }

  return client.db(getDatabaseName()).collection<QuestionDocument>('questions');
}

export async function ensureIndexes() {
  const teams = await getTeamsCollection();
  const questions = await getQuestionsCollection();
  await teams.createIndex({ nameNormalized: 1 }, { unique: true });
  await questions.createIndex({ round: 1 }, { unique: true });
}