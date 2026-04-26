import type { GameState, HandoffDetails } from './types';

function isHandoffDetails(value: unknown): value is HandoffDetails {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HandoffDetails>;
  return typeof candidate.passkey === 'string'
    && typeof candidate.lat === 'string'
    && typeof candidate.lng === 'string'
    && typeof candidate.volunteer === 'string'
    && typeof candidate.place === 'string';
}

export function createInitialGameState(roundCount: number): GameState {
  const safeRoundCount = Math.max(1, roundCount);
  return {
    round: 0,
    stage: 'p1_solve',
    roundsDone: new Array(safeRoundCount).fill(false),
    handoff: null,
    startTime: null,
    finishTime: null,
    difficulty: 'normal',
    currentRoundStartTime: new Date().toISOString(),
  };
}

export function calculateDifficulty(elapsedSeconds: number): 'normal' | 'hard' {
  // Hard mode threshold: If completed in under 3 minutes (180 seconds)
  return elapsedSeconds < 180 ? 'hard' : 'normal';
}

export function isValidStage(value: unknown): value is GameState['stage'] {
  return value === 'p1_solve'
    || value === 'p1_solved'
    || value === 'runner_travel'
    || value === 'runner_entry'
    || value === 'runner_game'
    || value === 'runner_done'
    || value === 'final_qr'
    || value === 'complete';
}

export function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameState>;
  return typeof candidate.round === 'number'
    && isValidStage(candidate.stage)
    && Array.isArray(candidate.roundsDone)
    && candidate.roundsDone.length > 0
    && candidate.roundsDone.every((item: unknown) => typeof item === 'boolean')
    && (candidate.handoff === null || candidate.handoff === undefined || isHandoffDetails(candidate.handoff))
    && (candidate.startTime === null || candidate.startTime === undefined || typeof candidate.startTime === 'string')
    && (candidate.finishTime === null || candidate.finishTime === undefined || typeof candidate.finishTime === 'string');
}

export function normalizeGameState(state: GameState, roundCount: number): GameState {
  const safeRoundCount = Math.max(1, roundCount);
  const roundsDone = [...state.roundsDone];
  while (roundsDone.length < safeRoundCount) roundsDone.push(false);
  if (roundsDone.length > safeRoundCount) roundsDone.length = safeRoundCount;

  const maxRoundIndex = safeRoundCount - 1;
  return {
    ...state,
    round: Math.min(Math.max(state.round, 0), maxRoundIndex),
    roundsDone,
    handoff: state.handoff && isHandoffDetails(state.handoff) ? state.handoff : null,
    startTime: typeof state.startTime === 'string' ? state.startTime : null,
    finishTime: typeof state.finishTime === 'string' ? state.finishTime : null,
    difficulty: state.difficulty || 'normal',
    currentRoundStartTime: state.currentRoundStartTime || new Date().toISOString(),
  };
}

export function sanitizeGameStateUpdate(currentState: GameState, update: Partial<GameState>, roundCount: number): GameState | null {
  const safeRoundCount = Math.max(1, roundCount);
  const nextState: GameState = {
    round: currentState.round,
    stage: currentState.stage,
    roundsDone: [...currentState.roundsDone],
    handoff: currentState.handoff,
    startTime: currentState.startTime,
    finishTime: currentState.finishTime,
    difficulty: currentState.difficulty || 'normal',
    currentRoundStartTime: currentState.currentRoundStartTime || new Date().toISOString(),
  };

  if (update.round !== undefined) {
    if (!Number.isInteger(update.round) || update.round < 0 || update.round >= safeRoundCount) return null;
    nextState.round = update.round;
  }

  if (update.stage !== undefined) {
    if (!isValidStage(update.stage)) return null;
    nextState.stage = update.stage;
  }

  if (update.roundsDone !== undefined) {
    if (!Array.isArray(update.roundsDone) || update.roundsDone.length !== safeRoundCount || !update.roundsDone.every((item: unknown) => typeof item === 'boolean')) {
      return null;
    }
    nextState.roundsDone = [...update.roundsDone];
  }

  if (update.handoff !== undefined) {
    if (update.handoff !== null && !isHandoffDetails(update.handoff)) {
      return null;
    }
    nextState.handoff = update.handoff ?? null;
  }

  if (update.startTime !== undefined) {
    if (update.startTime !== null && typeof update.startTime !== 'string') return null;
    nextState.startTime = update.startTime;
  }

  if (update.finishTime !== undefined) {
    if (update.finishTime !== null && typeof update.finishTime !== 'string') return null;
    nextState.finishTime = update.finishTime;
  }

  if (update.difficulty !== undefined) {
    if (update.difficulty !== 'normal' && update.difficulty !== 'hard') return null;
    nextState.difficulty = update.difficulty;
  }

  if (update.currentRoundStartTime !== undefined) {
    if (update.currentRoundStartTime !== null && typeof update.currentRoundStartTime !== 'string') return null;
    nextState.currentRoundStartTime = update.currentRoundStartTime;
  }

  return nextState;
}
