import { pairKey, pairLabel } from '@/lib/tournaments/pairs';
import type {
  MatchParticipant,
  RankingsBundle,
  StandingRow,
  TournamentMatch,
  TournamentPlayer,
} from '@/lib/tournaments/types';

export type MatchOutcome = 'home' | 'away' | 'draw';

export function resolveOutcome(match: TournamentMatch): MatchOutcome | null {
  if (match.scoreHome != null && match.scoreAway != null) {
    if (match.scoreHome > match.scoreAway) return 'home';
    if (match.scoreHome < match.scoreAway) return 'away';
    return 'draw';
  }
  if (match.simplifiedOutcome) return match.simplifiedOutcome;
  return null;
}

function emptyRow(key: string, label: string, playerIds: string[]): StandingRow {
  return {
    key,
    label,
    playerIds,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    scoredMatches: 0,
    winPct: 0,
    streak: 0,
    undefeatedRun: 0,
  };
}

function applyResult(
  row: StandingRow,
  result: 'W' | 'D' | 'L',
  gf: number | null,
  ga: number | null,
): void {
  row.played += 1;
  if (result === 'W') {
    row.wins += 1;
    row.points += 3;
  } else if (result === 'D') {
    row.draws += 1;
    row.points += 1;
  } else {
    row.losses += 1;
  }
  if (gf != null && ga != null) {
    row.goalsFor += gf;
    row.goalsAgainst += ga;
    row.goalDiff = row.goalsFor - row.goalsAgainst;
    row.scoredMatches += 1;
  }
  row.winPct = row.played === 0 ? 0 : row.wins / row.played;

  // Rachas en orden cronológico (se llama en orden)
  if (result === 'W') {
    row.streak = row.streak > 0 ? row.streak + 1 : 1;
    row.undefeatedRun += 1;
  } else if (result === 'D') {
    row.streak = 0;
    row.undefeatedRun += 1;
  } else {
    row.streak = row.streak < 0 ? row.streak - 1 : -1;
    row.undefeatedRun = 0;
  }
}

function sidePlayers(
  participants: MatchParticipant[],
  side: 'home' | 'away',
): string[] {
  return participants
    .filter((p) => p.side === side)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => p.playerId);
}

function compareStandings(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  // GD solo cuando ambos tienen partidos con marcador
  if (a.scoredMatches > 0 && b.scoredMatches > 0) {
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  }
  if (b.played !== a.played) return b.played - a.played;
  return a.key.localeCompare(b.key);
}

function finalize(map: Map<string, StandingRow>): StandingRow[] {
  return [...map.values()].filter((r) => r.played > 0).sort(compareStandings);
}

/**
 * Ranking individual 1 vs 1 (solo partidos mode=solo).
 */
export function computeSoloRankings(
  matches: TournamentMatch[],
  players: TournamentPlayer[],
): StandingRow[] {
  const names = new Map(players.map((p) => [p.id, p.displayName]));
  const map = new Map<string, StandingRow>();

  const ordered = matches
    .filter((m) => m.mode === 'solo')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

  for (const match of ordered) {
    const outcome = resolveOutcome(match);
    if (!outcome) continue;
    const home = sidePlayers(match.participants, 'home')[0];
    const away = sidePlayers(match.participants, 'away')[0];
    if (!home || !away) continue;

    if (!map.has(home)) {
      map.set(home, emptyRow(home, names.get(home) ?? home, [home]));
    }
    if (!map.has(away)) {
      map.set(away, emptyRow(away, names.get(away) ?? away, [away]));
    }

    const hasScore = match.scoreHome != null && match.scoreAway != null;
    const homeResult: 'W' | 'D' | 'L' =
      outcome === 'home' ? 'W' : outcome === 'away' ? 'L' : 'D';
    const awayResult: 'W' | 'D' | 'L' =
      outcome === 'away' ? 'W' : outcome === 'home' ? 'L' : 'D';

    applyResult(
      map.get(home)!,
      homeResult,
      hasScore ? match.scoreHome : null,
      hasScore ? match.scoreAway : null,
    );
    applyResult(
      map.get(away)!,
      awayResult,
      hasScore ? match.scoreAway : null,
      hasScore ? match.scoreHome : null,
    );
  }

  return finalize(map);
}

/**
 * Ranking de jugadores en 2 vs 2 (independiente de la pareja).
 */
export function computePairsPlayerRankings(
  matches: TournamentMatch[],
  players: TournamentPlayer[],
): StandingRow[] {
  const names = new Map(players.map((p) => [p.id, p.displayName]));
  const map = new Map<string, StandingRow>();

  const ordered = matches
    .filter((m) => m.mode === 'pairs')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

  for (const match of ordered) {
    const outcome = resolveOutcome(match);
    if (!outcome) continue;
    const home = sidePlayers(match.participants, 'home');
    const away = sidePlayers(match.participants, 'away');
    if (home.length !== 2 || away.length !== 2) continue;

    const hasScore = match.scoreHome != null && match.scoreAway != null;
    const homeResult: 'W' | 'D' | 'L' =
      outcome === 'home' ? 'W' : outcome === 'away' ? 'L' : 'D';
    const awayResult: 'W' | 'D' | 'L' =
      outcome === 'away' ? 'W' : outcome === 'home' ? 'L' : 'D';

    for (const id of home) {
      if (!map.has(id)) map.set(id, emptyRow(id, names.get(id) ?? id, [id]));
      applyResult(
        map.get(id)!,
        homeResult,
        hasScore ? match.scoreHome : null,
        hasScore ? match.scoreAway : null,
      );
    }
    for (const id of away) {
      if (!map.has(id)) map.set(id, emptyRow(id, names.get(id) ?? id, [id]));
      applyResult(
        map.get(id)!,
        awayResult,
        hasScore ? match.scoreAway : null,
        hasScore ? match.scoreHome : null,
      );
    }
  }

  return finalize(map);
}

/**
 * Ranking de parejas (mismas dos personas, cualquier orden).
 */
export function computePairRankings(
  matches: TournamentMatch[],
  players: TournamentPlayer[],
): StandingRow[] {
  const names = new Map(players.map((p) => [p.id, p.displayName]));
  const map = new Map<string, StandingRow>();

  const ordered = matches
    .filter((m) => m.mode === 'pairs')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

  for (const match of ordered) {
    const outcome = resolveOutcome(match);
    if (!outcome) continue;
    const home = sidePlayers(match.participants, 'home');
    const away = sidePlayers(match.participants, 'away');
    if (home.length !== 2 || away.length !== 2) continue;

    const homeKey = pairKey(home[0]!, home[1]!);
    const awayKey = pairKey(away[0]!, away[1]!);

    if (!map.has(homeKey)) {
      map.set(
        homeKey,
        emptyRow(homeKey, pairLabel(homeKey, names), [home[0]!, home[1]!]),
      );
    }
    if (!map.has(awayKey)) {
      map.set(
        awayKey,
        emptyRow(awayKey, pairLabel(awayKey, names), [away[0]!, away[1]!]),
      );
    }

    const hasScore = match.scoreHome != null && match.scoreAway != null;
    const homeResult: 'W' | 'D' | 'L' =
      outcome === 'home' ? 'W' : outcome === 'away' ? 'L' : 'D';
    const awayResult: 'W' | 'D' | 'L' =
      outcome === 'away' ? 'W' : outcome === 'home' ? 'L' : 'D';

    applyResult(
      map.get(homeKey)!,
      homeResult,
      hasScore ? match.scoreHome : null,
      hasScore ? match.scoreAway : null,
    );
    applyResult(
      map.get(awayKey)!,
      awayResult,
      hasScore ? match.scoreAway : null,
      hasScore ? match.scoreHome : null,
    );
  }

  return finalize(map);
}

export function computeRankingsBundle(
  matches: TournamentMatch[],
  players: TournamentPlayer[],
): RankingsBundle {
  return {
    solo: computeSoloRankings(matches, players),
    pairsPlayer: computePairsPlayerRankings(matches, players),
    pairs: computePairRankings(matches, players),
  };
}

export function validateMatchParticipants(
  mode: 'solo' | 'pairs',
  participants: MatchParticipant[],
): string | null {
  const ids = participants.map((p) => p.playerId);
  if (new Set(ids).size !== ids.length) {
    return 'Un jugador no puede repetirse en el mismo partido.';
  }
  const home = sidePlayers(participants, 'home');
  const away = sidePlayers(participants, 'away');
  if (mode === 'solo') {
    if (home.length !== 1 || away.length !== 1) {
      return 'En 1 vs 1 cada equipo tiene un jugador.';
    }
  } else if (home.length !== 2 || away.length !== 2) {
    return 'En 2 vs 2 cada equipo tiene exactamente dos jugadores.';
  }
  return null;
}

export function validateMatchResult(input: {
  scoreHome?: number | null;
  scoreAway?: number | null;
  simplifiedOutcome?: MatchOutcome | null;
}): string | null {
  const hasScores =
    input.scoreHome != null &&
    input.scoreAway != null &&
    Number.isFinite(input.scoreHome) &&
    Number.isFinite(input.scoreAway);
  const hasSimple = Boolean(input.simplifiedOutcome);

  if (hasScores && hasSimple) {
    return 'Usá marcador exacto o resultado simple, no ambos.';
  }
  if (!hasScores && !hasSimple) {
    return 'Indicá el marcador o el ganador.';
  }
  if (hasScores) {
    if (input.scoreHome! < 0 || input.scoreAway! < 0) {
      return 'El marcador no puede ser negativo.';
    }
    if (input.scoreHome! > 99 || input.scoreAway! > 99) {
      return 'Marcador fuera de rango.';
    }
  }
  return null;
}
