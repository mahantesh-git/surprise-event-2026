import { MongoClient, type Collection } from 'mongodb';
import type { TeamDocument, QuestionDocument, ConfigDocument } from './types';

let client: MongoClient | null = null;
let connectingPromise: Promise<MongoClient> | null = null;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  return uri;
}

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || 'quest';
}

async function getClient() {
  if (client) {
    return client;
  }

  if (!connectingPromise) {
    const pendingClient = new MongoClient(getMongoUri());
    connectingPromise = pendingClient.connect()
      .then(() => {
        client = pendingClient;
        return pendingClient;
      })
      .catch((error) => {
        connectingPromise = null;
        client = null;
        throw error;
      });
  }

  return connectingPromise;
}

export async function getTeamsCollection(): Promise<Collection<TeamDocument>> {
  const dbClient = await getClient();

  return dbClient.db(getDatabaseName()).collection<TeamDocument>('teams');
}

export async function getQuestionsCollection(): Promise<Collection<QuestionDocument>> {
  const dbClient = await getClient();

  return dbClient.db(getDatabaseName()).collection<QuestionDocument>('questions');
}

export async function getConfigCollection(): Promise<Collection<ConfigDocument>> {
  const dbClient = await getClient();

  return dbClient.db(getDatabaseName()).collection<ConfigDocument>('config');
}

export async function getAdminPhrasesCollection(): Promise<Collection<any>> {
  const dbClient = await getClient();

  return dbClient.db(getDatabaseName()).collection<any>('admin_phrases');
}

export async function ensureIndexes() {
  const teams = await getTeamsCollection();
  const questions = await getQuestionsCollection();
  const config = await getConfigCollection();
  await teams.createIndex({ nameNormalized: 1 }, { unique: true });
  await questions.createIndex({ round: 1 }, { unique: true });
  await config.createIndex({ key: 1 }, { unique: true });
}

export async function closeClient() {
  if (!client) {
    return;
  }

  const activeClient = client;
  client = null;
  connectingPromise = null;
  await activeClient.close();
}
