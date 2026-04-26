import { ObjectId } from 'mongodb';
import { getTeamsCollection, getReservePoolCollection, getQuestionsCollection } from './db';
import { findTeamById } from './team-service';
import { recordScoreChange } from './index';

export async function claimReserveRound(teamId: string, isByAdmin: boolean = false): Promise<{ ok: boolean; error?: string; question?: any }> {
  const team = await findTeamById(teamId);
  if (!team) return { ok: false, error: 'Team not found' };

  // Check if they already swapped (Admin bypasses this check)
  if (!isByAdmin && team.swappedRounds && Object.keys(team.swappedRounds).length > 0) {
    return { ok: false, error: 'Team has already used their one-time Round Swap' };
  }

  const currentRoundIndex = team.gameState.round;
  const reservePool = await getReservePoolCollection();
  
  // Find a question in reserve pool that hasn't been used (in case there are many)
  // For simplicity, just pick a random one
  const reserveQuestions = await reservePool.find({}).toArray();
  if (reserveQuestions.length === 0) {
    return { ok: false, error: 'Reserve pool is currently empty. Cannot swap.' };
  }

  const selectedReserve = reserveQuestions[Math.floor(Math.random() * reserveQuestions.length)];

  // Deduct points (Admin bypasses this penalty)
  if (!isByAdmin) {
    await recordScoreChange(team._id, -300, 'Burned Round Swap');
  } else {
    // Record audit trail
    await recordScoreChange(team._id, 0, 'Admin Forced Round Swap (No Penalty)');
  }

  // Update team swappedRounds
  const updatedSwappedRounds = { ...team.swappedRounds, [currentRoundIndex.toString()]: selectedReserve._id.toString() };
  
  const teams = await getTeamsCollection();
  await teams.updateOne(
    { _id: team._id },
    { 
      $set: { 
        swappedRounds: updatedSwappedRounds, 
        'gameState.stage': 'p1_solve',
        'gameState.handoff': null,
        updatedAt: new Date() 
      } 
    }
  );


  return { ok: true, question: selectedReserve };
}

export async function getCurrentQuestionForTeam(teamId: string): Promise<any | null> {
  const team = await findTeamById(teamId);
  if (!team) return null;

  const currentRoundIndex = team.gameState.round;
  
  if (team.swappedRounds && team.swappedRounds[currentRoundIndex.toString()]) {
    const reserveId = team.swappedRounds[currentRoundIndex.toString()];
    const reservePool = await getReservePoolCollection();
    const reserveQuestion = await reservePool.findOne({ _id: new ObjectId(reserveId) });
    if (reserveQuestion) return reserveQuestion;
  }

  const questions = await getQuestionsCollection();
  return questions.findOne({ round: currentRoundIndex + 1 });
}
