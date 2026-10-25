import { describe, expect, it } from 'vitest';
import { createKnockout, createRoundRobin, recordKnockoutResult, type BracketEntrant } from './bracket';

const entrants = (count: number): BracketEntrant[] =>
  Array.from({ length: count }, (_, index) => ({ id: String(index), label: `Equipo ${index + 1}`, playerIds: [String(index)] }));

describe('cruces de torneo', () => {
  it('todos contra todos con diez equipos: 45 encuentros en nueve rondas', () => {
    const games = createRoundRobin(entrants(10));
    expect(games).toHaveLength(45);
    expect(new Set(games.map((game) => game.round)).size).toBe(9);
    expect(new Set(games.map((game) => [game.home.id, game.away.id].sort().join(':'))).size).toBe(45);
  });
  it('todos contra todos con cinco equipos: descansos sin partidos falsos', () => {
    const games = createRoundRobin(entrants(5));
    expect(games).toHaveLength(10);
    expect(new Set(games.map((game) => game.round)).size).toBe(5);
  });
  it('eliminación directa con diez equipos: seis descansos y ocho cruces iniciales', () => {
    const bracket = createKnockout(entrants(10));
    expect(bracket.rounds[0]).toHaveLength(8);
    expect(bracket.rounds[0].filter((game) => game.bye)).toHaveLength(6);
    expect(bracket.rounds[0].filter((game) => game.home && game.away)).toHaveLength(2);
  });
  it('semifinales y final: los ganadores avanzan y aparece el campeón', () => {
    let bracket = createKnockout(entrants(4));
    bracket = recordKnockoutResult(bracket, 'r0-g0', 3, 1);
    bracket = recordKnockoutResult(bracket, 'r0-g1', 2, 0);
    expect(bracket.rounds[1][0].home?.id).toBe('0');
    expect(bracket.rounds[1][0].away?.id).toBe('1');
    bracket = recordKnockoutResult(bracket, 'r1-g0', 2, 1);
    expect(bracket.championId).toBe('0');
  });
  it('no permite empates en una eliminación directa', () => {
    expect(() => recordKnockoutResult(createKnockout(entrants(2)), 'r0-g0', 1, 1)).toThrow();
  });
});
