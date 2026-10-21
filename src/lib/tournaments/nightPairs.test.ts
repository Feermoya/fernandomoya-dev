import { describe, expect, it } from 'vitest';
import {
  drawNightPairs,
  fixtureKey,
  inferNightLineup,
  matchFixtureKey,
  roundRobin,
  sanitizeLineup,
} from '@/lib/tournaments/nightPairs';
import type { TournamentMatch } from '@/lib/tournaments/types';

function match(
  home: [string, string],
  away: [string, string],
): TournamentMatch {
  return {
    id: `${home.join('')}${away.join('')}`,
    matchdayId: 'd',
    mode: 'pairs',
    sortOrder: 1,
    scoreHome: 1,
    scoreAway: 0,
    simplifiedOutcome: null,
    createdAt: '',
    participants: [
      { playerId: home[0], side: 'home', slot: 0 },
      { playerId: home[1], side: 'home', slot: 1 },
      { playerId: away[0], side: 'away', slot: 0 },
      { playerId: away[1], side: 'away', slot: 1 },
    ],
  };
}

describe('drawNightPairs', () => {
  it('con 6 jugadores arma 3 parejas y nadie descansa', () => {
    const result = drawNightPairs(['Fer', 'Ale', 'Fabri', 'Mati', 'Rodri', 'Franco'], () => 0.4);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.pairs).toHaveLength(3);
    expect(result.resting).toHaveLength(0);
    const ids = result.pairs.flatMap((pair) => pair.playerIds);
    expect(new Set(ids).size).toBe(6);
  });

  it('con 5 jugadores deja uno descansando', () => {
    const result = drawNightPairs(['a', 'b', 'c', 'd', 'e'], () => 0.2);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.pairs).toHaveLength(2);
    expect(result.resting).toHaveLength(1);
  });
});

describe('roundRobin', () => {
  it('con 3 parejas propone 3 cruces', () => {
    const drawn = drawNightPairs(['a', 'b', 'c', 'd', 'e', 'f'], () => 0.3);
    if ('error' in drawn) throw new Error(drawn.error);
    const fixtures = roundRobin(drawn.pairs);
    expect(fixtures).toHaveLength(3);
    const keys = fixtures.map(([a, b]) => fixtureKey(a.key, b.key));
    expect(new Set(keys).size).toBe(3);
  });
});

describe('inferNightLineup', () => {
  it('recupera parejas fijas de los partidos', () => {
    const lineup = inferNightLineup(
      [match(['a', 'b'], ['c', 'd']), match(['a', 'b'], ['e', 'f'])],
      ['a', 'b', 'c', 'd', 'e', 'f'],
    );
    expect(lineup?.pairs).toHaveLength(3);
  });

  it('no arma torneo si alguien cambió de compañero', () => {
    const lineup = inferNightLineup(
      [match(['a', 'b'], ['c', 'd']), match(['a', 'c'], ['b', 'd'])],
      ['a', 'b', 'c', 'd'],
    );
    expect(lineup).toBeNull();
  });

  it('marca el cruce sin importar el lado', () => {
    const first = match(['b', 'a'], ['d', 'c']);
    const second = match(['c', 'd'], ['a', 'b']);
    expect(matchFixtureKey(first)).toBe(matchFixtureKey(second));
  });
});

describe('sanitizeLineup', () => {
  it('descarta una pareja si falta un jugador', () => {
    const lineup = sanitizeLineup(
      {
        pairs: [
          { key: 'a|b', playerIds: ['a', 'b'] },
          { key: 'c|d', playerIds: ['c', 'd'] },
          { key: 'e|f', playerIds: ['e', 'f'] },
        ],
        resting: [],
      },
      ['a', 'b', 'c', 'd'],
    );
    expect(lineup?.pairs).toHaveLength(2);
  });
});
