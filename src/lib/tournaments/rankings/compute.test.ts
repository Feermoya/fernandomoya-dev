import { describe, expect, it } from 'vitest';
import {
  computePairRankings,
  computePairsPlayerRankings,
  computeSoloRankings,
  resolveOutcome,
  validateMatchParticipants,
  validateMatchResult,
} from '@/lib/tournaments/rankings/compute';
import { pairKey } from '@/lib/tournaments/pairs';
import type { TournamentMatch, TournamentPlayer } from '@/lib/tournaments/types';
import { undefeatedPairs } from '@/lib/tournaments/achievements';

const players: TournamentPlayer[] = [
  { id: 'a', displayName: 'Messi', active: true, sortOrder: 0 },
  { id: 'b', displayName: 'Nico', active: true, sortOrder: 1 },
  { id: 'c', displayName: 'Juan', active: true, sortOrder: 2 },
  { id: 'd', displayName: 'Fede', active: true, sortOrder: 3 },
  { id: 'e', displayName: 'Ana', active: true, sortOrder: 4 },
];

function match(
  partial: Partial<TournamentMatch> & Pick<TournamentMatch, 'id' | 'mode' | 'participants'>,
): TournamentMatch {
  return {
    matchdayId: 'md1',
    sortOrder: 0,
    scoreHome: null,
    scoreAway: null,
    simplifiedOutcome: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('resolveOutcome', () => {
  it('usa marcador exacto', () => {
    expect(
      resolveOutcome(
        match({
          id: '1',
          mode: 'solo',
          participants: [],
          scoreHome: 3,
          scoreAway: 2,
        }),
      ),
    ).toBe('home');
  });

  it('usa resultado simplificado', () => {
    expect(
      resolveOutcome(
        match({
          id: '1',
          mode: 'solo',
          participants: [],
          simplifiedOutcome: 'away',
        }),
      ),
    ).toBe('away');
  });
});

describe('rankings', () => {
  it('ranking 1v1 acumula puntos', () => {
    const matches = [
      match({
        id: '1',
        mode: 'solo',
        sortOrder: 1,
        scoreHome: 3,
        scoreAway: 1,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'away', slot: 0 },
        ],
      }),
      match({
        id: '2',
        mode: 'solo',
        sortOrder: 2,
        simplifiedOutcome: 'draw',
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'c', side: 'away', slot: 0 },
        ],
      }),
    ];
    const solo = computeSoloRankings(matches, players);
    expect(solo[0]?.key).toBe('a');
    expect(solo[0]?.points).toBe(4);
    expect(solo[0]?.goalDiff).toBe(2);
    // Partido simplificado no inventa GD extra
    expect(solo[0]?.scoredMatches).toBe(1);
  });

  it('ranking de parejas agrupa sin importar el orden', () => {
    const matches = [
      match({
        id: '1',
        mode: 'pairs',
        sortOrder: 1,
        scoreHome: 3,
        scoreAway: 2,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'home', slot: 1 },
          { playerId: 'c', side: 'away', slot: 0 },
          { playerId: 'd', side: 'away', slot: 1 },
        ],
      }),
      match({
        id: '2',
        mode: 'pairs',
        sortOrder: 2,
        scoreHome: 1,
        scoreAway: 0,
        participants: [
          { playerId: 'b', side: 'home', slot: 0 },
          { playerId: 'a', side: 'home', slot: 1 },
          { playerId: 'e', side: 'away', slot: 0 },
          { playerId: 'c', side: 'away', slot: 1 },
        ],
      }),
    ];
    const pairs = computePairRankings(matches, players);
    const key = pairKey('a', 'b');
    const row = pairs.find((p) => p.key === key);
    expect(row?.wins).toBe(2);
    expect(row?.played).toBe(2);
  });

  it('ranking 2v2 jugador es independiente de pareja', () => {
    const matches = [
      match({
        id: '1',
        mode: 'pairs',
        sortOrder: 1,
        scoreHome: 2,
        scoreAway: 0,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'home', slot: 1 },
          { playerId: 'c', side: 'away', slot: 0 },
          { playerId: 'd', side: 'away', slot: 1 },
        ],
      }),
      match({
        id: '2',
        mode: 'pairs',
        sortOrder: 2,
        scoreHome: 0,
        scoreAway: 1,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'c', side: 'home', slot: 1 },
          { playerId: 'b', side: 'away', slot: 0 },
          { playerId: 'd', side: 'away', slot: 1 },
        ],
      }),
    ];
    const rows = computePairsPlayerRankings(matches, players);
    expect(rows.find((r) => r.key === 'a')?.wins).toBe(1);
    expect(rows.find((r) => r.key === 'a')?.losses).toBe(1);
    expect(rows.find((r) => r.key === 'b')?.wins).toBe(2);
  });

  it('no mezcla 1v1 y 2v2 en el mismo ranking', () => {
    const matches = [
      match({
        id: '1',
        mode: 'solo',
        sortOrder: 1,
        scoreHome: 5,
        scoreAway: 0,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'away', slot: 0 },
        ],
      }),
      match({
        id: '2',
        mode: 'pairs',
        sortOrder: 2,
        scoreHome: 1,
        scoreAway: 0,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'c', side: 'home', slot: 1 },
          { playerId: 'b', side: 'away', slot: 0 },
          { playerId: 'd', side: 'away', slot: 1 },
        ],
      }),
    ];
    expect(computeSoloRankings(matches, players)).toHaveLength(2);
    expect(computePairRankings(matches, players)).toHaveLength(2);
  });

  it('editar resultado cambia posiciones (simulado recalculando)', () => {
    const base = [
      match({
        id: '1',
        mode: 'solo',
        sortOrder: 1,
        scoreHome: 1,
        scoreAway: 0,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'away', slot: 0 },
        ],
      }),
    ];
    expect(computeSoloRankings(base, players)[0]?.key).toBe('a');
    const edited = [
      match({
        id: '1',
        mode: 'solo',
        sortOrder: 1,
        scoreHome: 0,
        scoreAway: 2,
        participants: [
          { playerId: 'a', side: 'home', slot: 0 },
          { playerId: 'b', side: 'away', slot: 0 },
        ],
      }),
    ];
    expect(computeSoloRankings(edited, players)[0]?.key).toBe('b');
  });
});

describe('undefeated', () => {
  it('exige mínimo de partidos', () => {
    const pairs = computePairRankings(
      [
        match({
          id: '1',
          mode: 'pairs',
          sortOrder: 1,
          scoreHome: 1,
          scoreAway: 0,
          participants: [
            { playerId: 'a', side: 'home', slot: 0 },
            { playerId: 'b', side: 'home', slot: 1 },
            { playerId: 'c', side: 'away', slot: 0 },
            { playerId: 'd', side: 'away', slot: 1 },
          ],
        }),
      ],
      players,
    );
    expect(undefeatedPairs(pairs, 3)).toHaveLength(0);
    expect(undefeatedPairs(pairs, 1)).toHaveLength(1);
  });
});

describe('validation', () => {
  it('rechaza participantes repetidos', () => {
    expect(
      validateMatchParticipants('solo', [
        { playerId: 'a', side: 'home', slot: 0 },
        { playerId: 'a', side: 'away', slot: 0 },
      ]),
    ).toBeTruthy();
  });

  it('no permite marcador y simple juntos', () => {
    expect(
      validateMatchResult({ scoreHome: 1, scoreAway: 0, simplifiedOutcome: 'home' }),
    ).toBeTruthy();
  });
});
