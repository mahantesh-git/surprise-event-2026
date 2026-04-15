export type Role = 'solver' | 'runner';

export type Stage = 'p1_solve' | 'p1_solved' | 'runner_travel' | 'runner_game' | 'runner_done' | 'complete';


export interface HandoffDetails {
  passkey: string;
  lat: string;
  lng: string;
  volunteer: string;
  place: string;
}

export interface GameState {
  round: number;
  stage: Stage;
  roundsDone: boolean[];
  handoff: HandoffDetails | null;
  startTime?: string | null;
  finishTime?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
}

export interface TeamDocument {
  name: string;
  nameNormalized: string;
  email?: string;
  passwordHash: string;
  gameState: GameState;
  executionAttempts?: number[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface LoginPayload {
  teamName?: string;
  password?: string;
  role?: Role;
}

export interface TeamTokenPayload {
  kind: 'team';
  teamId: string;
  teamName: string;
  role: Role;
}

export interface AdminTokenPayload {
  kind: 'admin';
  email: string;
}

export type AuthTokenPayload = TeamTokenPayload | AdminTokenPayload;

export interface TestCase {
  input: string;
  output: string;
}

export interface PuzzlePart {
  title: string;
  code: string;
  hint: string;
  ans: string;
  output: string;
  language: string;
  testCases: TestCase[];
}

export interface CoordinateInfo {
  lat: string;
  lng: string;
  place: string;
}

export interface VolunteerInfo {
  name: string;
  initials: string;
  bg: string;
  color: string;
}

export interface QuestionDocument {
  round: number;
  p1: PuzzlePart;
  coord: CoordinateInfo;
  volunteer: VolunteerInfo;
  qrPasskey: string;
  cx: number;
  cy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigDocument {
  key: string;
  value: any;
  updatedAt: Date;
}