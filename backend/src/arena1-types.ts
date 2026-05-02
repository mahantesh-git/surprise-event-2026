// ── Arena 1 Types ────────────────────────────────────────────────────────────

export type Arena1SlotType = 'html' | 'css' | 'js' | 'combined';

export interface Arena1SlotResult {
  slot: number;                    // 0-indexed
  questionId: string;
  submittedAt: string | null;
  submittedFilePath: string | null;
  approved: boolean | null;        // null = pending, true = approved, false = rejected
  points: number;                  // 300 (approved) | 0 (rejected/skipped/swapped)
  swapped: boolean;
  skipped: boolean;
  timeMs: number | null;           // elapsed ms when submitted, null if skipped
}

export type Arena1Status = 'waiting' | 'active' | 'done';

export interface Arena1GameState {
  status: Arena1Status;
  currentSlot: number;             // 0–3
  slotStartedAt: string | null;    // ISO timestamp — server-authoritative 15-min timer
  swapsLeft: number;               // starts at 4
  slotResults: Arena1SlotResult[];
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Arena1TeamDocument {
  name: string;
  nameNormalized: string;
  solverName?: string;
  runnerName?: string;
  passwordHash: string;
  gameState: Arena1GameState;
  score: number;
  activeDevices?: Record<string, string>;
  failedLoginAttempts?: number;  // consecutive wrong-password count
  lockedUntil?: Date | null;     // null/undefined = not locked
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Arena1QuestionDocument {
  slot: number;                    // 1–4 = main, 5+ = reserve
  type: Arena1SlotType;
  title: string;
  description: string;
  starterHtml: string;
  starterCss: string;
  starterJs: string;
  defaultCode?: string;
  points?: number;
  isReserve: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extend the team token payload to carry arena info
export interface Arena1TokenPayload {
  kind: 'team';
  teamId: string;
  teamName: string;
  role: 'solver' | 'runner';
  arena: 'arena1';
}
