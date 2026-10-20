import type {
  Achievement,
  RankingsBundle,
  StandingRow,
  TournamentPlayer,
} from '@/lib/tournaments/types';
import { UNDEFEATED_MIN_MATCHES, WIN_STREAK_MIN } from '@/lib/tournaments/types';

function topByWins(rows: StandingRow[]): StandingRow | null {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.wins));
  if (max <= 0) return null;
  const tied = rows.filter((r) => r.wins === max);
  return tied.length === 1 ? tied[0]! : tied[0]!;
}

/**
 * Reconocimientos automáticos a partir de rankings (sin inventar stats).
 */
export function computeAchievements(input: {
  matchday: RankingsBundle;
  allTime: RankingsBundle;
  players: TournamentPlayer[];
  minUndefeated?: number;
  minWinStreak?: number;
}): Achievement[] {
  const minU = input.minUndefeated ?? UNDEFEATED_MIN_MATCHES;
  const minS = input.minWinStreak ?? WIN_STREAK_MIN;
  const out: Achievement[] = [];

  for (const row of input.matchday.pairs) {
    if (row.losses === 0 && row.played >= minU) {
      out.push({
        type: 'undefeated',
        key: row.key,
        label: row.label,
        played: row.played,
      });
    }
  }

  const streakSources = [
    ...input.matchday.solo,
    ...input.matchday.pairsPlayer,
    ...input.matchday.pairs,
  ];
  for (const row of streakSources) {
    if (row.streak >= minS) {
      out.push({
        type: 'win_streak',
        key: `${row.key}:streak`,
        label: row.label,
        streak: row.streak,
      });
    }
  }

  const dominatorPool = [
    ...input.matchday.solo,
    ...input.matchday.pairsPlayer,
  ];
  const dom = topByWins(dominatorPool);
  if (dom && dom.wins > 0) {
    out.push({
      type: 'dominator',
      key: dom.key,
      label: dom.label,
      wins: dom.wins,
    });
  }

  if (input.allTime.pairs[0] && input.allTime.pairs[0].played >= minU) {
    const best = input.allTime.pairs[0];
    out.push({
      type: 'historic_pair',
      key: best.key,
      label: best.label,
    });
  }

  // Rey de la noche: líder del ranking con más partidos en la fecha
  // (prioriza pairsPlayer si hay 2v2, si no solo)
  const nightLeader =
    input.matchday.pairsPlayer[0] ?? input.matchday.solo[0] ?? null;
  if (nightLeader) {
    out.push({
      type: 'night_king',
      key: nightLeader.key,
      label: nightLeader.label,
    });
  }

  // Deduplicar por type+key
  const seen = new Set<string>();
  return out.filter((a) => {
    const id = `${a.type}:${a.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Parejas invictas con mínimo de partidos (no 1 solo encuentro). */
export function undefeatedPairs(
  pairs: StandingRow[],
  minMatches = UNDEFEATED_MIN_MATCHES,
): StandingRow[] {
  return pairs.filter((p) => p.losses === 0 && p.played >= minMatches);
}
