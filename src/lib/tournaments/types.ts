export type TournamentPlayer = {
  id: string;
  displayName: string;
  active: boolean;
  sortOrder: number;
};

export type TournamentGroup = {
  id: string;
  publicId: string;
  name: string;
  createdAt: string;
  players: TournamentPlayer[];
};

export type CreateGroupResult = {
  group: TournamentGroup;
  adminSecret: string;
  recoveryKey: string;
  viewUrl: string;
  adminClaimHint: string;
};

export type MatchdayStatus = 'prepared' | 'live' | 'finished';
export type MatchMode = 'solo' | 'pairs';
export type MatchSide = 'home' | 'away';
export type SimplifiedOutcome = 'home' | 'away' | 'draw';

export type TournamentMatchday = {
  id: string;
  groupId: string;
  name: string;
  status: MatchdayStatus;
  sequenceNumber: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type MatchParticipant = {
  playerId: string;
  side: MatchSide;
  slot: 0 | 1;
};

export type TournamentMatch = {
  id: string;
  matchdayId: string;
  mode: MatchMode;
  sortOrder: number;
  scoreHome: number | null;
  scoreAway: number | null;
  simplifiedOutcome: SimplifiedOutcome | null;
  participants: MatchParticipant[];
  createdAt: string;
};

export type AwardType =
  | 'mvp'
  | 'best_goal'
  | 'best_pair'
  | 'custom'
  | 'champion_solo'
  | 'champion_pairs'
  | 'undefeated_pair';

export type TournamentAward = {
  id: string;
  matchdayId: string;
  awardType: AwardType | string;
  playerId: string | null;
  playerBId: string | null;
  note: string | null;
};

export type StandingRow = {
  key: string;
  label: string;
  playerIds: string[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  scoredMatches: number;
  winPct: number;
  /** Racha actual: >0 victorias, <0 derrotas, 0 sin partidos / empate corta. */
  streak: number;
  undefeatedRun: number;
};

export type RankingsBundle = {
  solo: StandingRow[];
  pairsPlayer: StandingRow[];
  pairs: StandingRow[];
};

export type Achievement =
  | { type: 'undefeated'; key: string; label: string; played: number }
  | { type: 'win_streak'; key: string; label: string; streak: number }
  | { type: 'dominator'; key: string; label: string; wins: number }
  | { type: 'historic_pair'; key: string; label: string }
  | { type: 'night_king'; key: string; label: string };

export type GroupState = {
  group: TournamentGroup;
  isAdmin: boolean;
  matchdays: TournamentMatchday[];
  activeMatchday: TournamentMatchday | null;
  matches: TournamentMatch[];
  awards: TournamentAward[];
  rankings: {
    matchday: RankingsBundle;
    allTime: RankingsBundle;
  };
  achievements: Achievement[];
};

export const UNDEFEATED_MIN_MATCHES = 3;
export const WIN_STREAK_MIN = 3;
