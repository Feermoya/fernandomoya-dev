import { pairKey } from '@/lib/tournaments/pairs';
import type { TournamentMatch } from '@/lib/tournaments/types';

export type NightPair = {
  key: string;
  playerIds: [string, string];
};

export type NightLineup = {
  pairs: NightPair[];
  resting: string[];
};

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function makeNightPair(a: string, b: string): NightPair {
  const key = pairKey(a, b);
  const [left, right] = key.split('|') as [string, string];
  return { key, playerIds: [left, right] };
}

/** Arma parejas con los jugadores que se pasen. Si sobra uno, descansa. */
export function drawNightPairs(
  playerIds: string[],
  rng: () => number = Math.random,
): { pairs: NightPair[]; resting: string[] } | { error: string } {
  const unique = [...new Set(playerIds)];
  if (unique.length < 2) {
    return { error: 'Hacen falta al menos 2 jugadores para una pareja.' };
  }
  const shuffled = shuffle(unique, rng);
  const resting = shuffled.length % 2 === 1 ? [shuffled.pop()!] : [];
  const pairs: NightPair[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push(makeNightPair(shuffled[i]!, shuffled[i + 1]!));
  }
  return { pairs, resting };
}

export function fixtureKey(pairA: string, pairB: string): string {
  return pairA < pairB ? `${pairA}~${pairB}` : `${pairB}~${pairA}`;
}

export function roundRobin(pairs: NightPair[]): Array<[NightPair, NightPair]> {
  const fixtures: Array<[NightPair, NightPair]> = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      fixtures.push([pairs[i]!, pairs[j]!]);
    }
  }
  return fixtures;
}

function sideKey(match: TournamentMatch, side: 'home' | 'away'): string | null {
  const ids = match.participants
    .filter((participant) => participant.side === side)
    .sort((a, b) => a.slot - b.slot)
    .map((participant) => participant.playerId);
  if (ids.length !== 2 || !ids[0] || !ids[1]) return null;
  return pairKey(ids[0], ids[1]);
}

export function matchFixtureKey(match: TournamentMatch): string | null {
  if (match.mode !== 'pairs') return null;
  const home = sideKey(match, 'home');
  const away = sideKey(match, 'away');
  if (!home || !away) return null;
  return fixtureKey(home, away);
}

/**
 * Si los partidos de la fecha usan parejas fijas (nadie cambia de compañero),
 * las recupera. Si se mezclaron, no inventa un torneo.
 */
export function inferNightLineup(
  matches: TournamentMatch[],
  activeIds: string[],
): NightLineup | null {
  const owner = new Map<string, string>();
  const pairs = new Map<string, [string, string]>();
  for (const match of matches) {
    if (match.mode !== 'pairs') continue;
    for (const side of ['home', 'away'] as const) {
      const key = sideKey(match, side);
      if (!key) continue;
      const [a, b] = key.split('|') as [string, string];
      for (const id of [a, b]) {
        const previous = owner.get(id);
        if (previous && previous !== key) return null;
        owner.set(id, key);
      }
      pairs.set(key, [a, b]);
    }
  }
  if (pairs.size < 2) return null;
  const used = new Set(owner.keys());
  return sanitizeLineup(
    {
      pairs: [...pairs.entries()].map(([key, playerIds]) => ({ key, playerIds })),
      resting: activeIds.filter((id) => !used.has(id)),
    },
    activeIds,
  );
}

export function sanitizeLineup(lineup: NightLineup, activeIds: string[]): NightLineup | null {
  const active = new Set(activeIds);
  const seen = new Set<string>();
  const pairs: NightPair[] = [];
  for (const pair of lineup.pairs) {
    const [a, b] = pair.playerIds;
    if (!a || !b || !active.has(a) || !active.has(b) || a === b) continue;
    if (seen.has(a) || seen.has(b)) continue;
    const next = makeNightPair(a, b);
    seen.add(next.playerIds[0]);
    seen.add(next.playerIds[1]);
    pairs.push(next);
  }
  if (pairs.length < 2) return null;
  return {
    pairs,
    resting: lineup.resting.filter((id) => active.has(id) && !seen.has(id)),
  };
}

function storageKey(publicId: string, matchdayId: string): string {
  return `lf-night:${publicId}:${matchdayId}`;
}

export function readNightLineup(
  publicId: string,
  matchdayId: string,
  activeIds: string[],
): NightLineup | null {
  if (typeof window === 'undefined' || !publicId || !matchdayId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(publicId, matchdayId));
    if (!raw) return null;
    return sanitizeLineup(JSON.parse(raw) as NightLineup, activeIds);
  } catch {
    return null;
  }
}

export function writeNightLineup(publicId: string, matchdayId: string, lineup: NightLineup): void {
  if (typeof window === 'undefined' || !publicId || !matchdayId) return;
  try {
    window.localStorage.setItem(storageKey(publicId, matchdayId), JSON.stringify(lineup));
  } catch {
    /* el torneo sigue en esta pantalla aunque el navegador no guarde */
  }
}

export function clearNightLineup(publicId: string, matchdayId: string): void {
  if (typeof window === 'undefined' || !publicId || !matchdayId) return;
  try {
    window.localStorage.removeItem(storageKey(publicId, matchdayId));
  } catch {
    /* nada que borrar */
  }
}
