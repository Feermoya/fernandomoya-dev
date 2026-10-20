import type { MatchParticipant } from '@/lib/tournaments/types';

function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export type DrawResult = {
  participants: MatchParticipant[];
  resting: string[];
  mode: 'solo' | 'pairs';
};

/**
 * Sortea un partido. Con 2 jugadores → 1v1.
 * Con 4+ → 2v2 con 4 jugadores; el resto descansa.
 * Con 3 → no forma 2v2 completo (devuelve error vía null resting message handled by caller).
 */
export function drawMatch(
  playerIds: string[],
  preferredMode?: 'solo' | 'pairs',
  rng: () => number = Math.random,
): DrawResult | { error: string } {
  const unique = [...new Set(playerIds)];
  if (unique.length < 2) {
    return { error: 'Necesitás al menos 2 jugadores.' };
  }

  const mode: 'solo' | 'pairs' =
    preferredMode ?? (unique.length >= 4 ? 'pairs' : 'solo');

  if (mode === 'solo') {
    const picked = shuffle(unique, rng).slice(0, 2);
    const resting = unique.filter((id) => !picked.includes(id));
    return {
      mode: 'solo',
      resting,
      participants: [
        { playerId: picked[0]!, side: 'home', slot: 0 },
        { playerId: picked[1]!, side: 'away', slot: 0 },
      ],
    };
  }

  if (unique.length < 4) {
    return { error: 'Para 2 vs 2 necesitás al menos 4 jugadores.' };
  }

  const shuffled = shuffle(unique, rng);
  const playing = shuffled.slice(0, 4);
  const resting = shuffled.slice(4);
  // Emparejar: 0+1 home, 2+3 away (después de shuffle)
  return {
    mode: 'pairs',
    resting,
    participants: [
      { playerId: playing[0]!, side: 'home', slot: 0 },
      { playerId: playing[1]!, side: 'home', slot: 1 },
      { playerId: playing[2]!, side: 'away', slot: 0 },
      { playerId: playing[3]!, side: 'away', slot: 1 },
    ],
  };
}
