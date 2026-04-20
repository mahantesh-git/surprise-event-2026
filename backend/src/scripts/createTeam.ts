import dotenv from 'dotenv';
import path from 'path';
import { createTeam } from '../team-service';
import { getQuestionsCollection } from '../db';

const envPath = path.resolve(__dirname, '../../.env');
const fallbackEnvPath = path.resolve(__dirname, '../../.env.example');
const envLoad = dotenv.config({ path: envPath });
if (envLoad.error) {
  dotenv.config({ path: fallbackEnvPath });
}

function getArg(name: string) {
  const flag = process.argv.indexOf(name);
  if (flag !== -1) {
    return process.argv[flag + 1];
  }

  return undefined;
}

async function main() {
  const teamName = getArg('--team') || process.env.TEAM_NAME;
  const email = getArg('--email') || process.env.TEAM_EMAIL;
  const password = getArg('--password') || process.env.TEAM_PASSWORD;
  const force = process.argv.includes('--force');

  if (!teamName || !password) {
    throw new Error('Provide --team and --password or set TEAM_NAME and TEAM_PASSWORD');
  }

  const questions = await getQuestionsCollection();
  const roundCount = await questions.countDocuments();
  await createTeam(teamName, password, email, undefined, undefined, Math.max(1, roundCount), force);
  console.log(`Team ${teamName} saved`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});