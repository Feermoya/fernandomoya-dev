/**
 * Motor liviano de eliminatorias para LA FECHA.
 * No persiste resultados: se integra con la fecha y los partidos existentes.
 * Un participante puede ser un jugador o una pareja/equipo estable.
 */
export type BracketEntrant = { id: string; label: string; playerIds: string[] };
export type BracketGame = {
  id: string;
  round: number;
  slot: number;
  home: BracketEntrant | null;
  away: BracketEntrant | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  bye: boolean;
};
export type BracketState = { entrants: BracketEntrant[]; rounds: BracketGame[][]; championId: string | null };
export type BracketFormat = 'knockout' | 'round-robin';
export type LeagueFixture = { round: number; home: BracketEntrant; away: BracketEntrant };

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value));
}

function validateEntrants(entrants: BracketEntrant[]): void {
  if (entrants.length < 2 || entrants.length > 32) throw new Error('Se necesitan entre 2 y 32 equipos.');
  if (new Set(entrants.map((e) => e.id)).size !== entrants.length) throw new Error('Hay equipos repetidos.');
  if (entrants.some((e) => !e.id || !e.label || !e.playerIds.length)) throw new Error('Hay equipos incompletos.');
}

/** Llave por cabezas de serie: primero contra último, segundo contra penúltimo, etc. */
export function createKnockout(entrants: BracketEntrant[]): BracketState {
  validateEntrants(entrants);
  const size = nextPowerOfTwo(entrants.length);
  const byes = size - entrants.length;
  const seeded = [...entrants];
  const first: BracketGame[] = [];
  for (let i = 0; i < size / 2; i++) {
    const home = seeded[i] ?? null;
    const away = i < byes ? null : seeded[size - 1 - (i - byes)] ?? null;
    first.push({
      id: `r0-g${i}`, round: 0, slot: i, home, away,
      homeScore: null, awayScore: null, winnerId: away ? null : home?.id ?? null,
      bye: !away,
    });
  }
  const rounds = [first];
  let count = first.length;
  for (let round = 1; count > 1; round++) {
    count /= 2;
    rounds.push(Array.from({ length: count }, (_, slot) => ({
      id: `r${round}-g${slot}`, round, slot, home: null, away: null,
      homeScore: null, awayScore: null, winnerId: null, bye: false,
    })));
  }
  return propagate({ entrants: seeded, rounds, championId: null });
}

function propagate(state: BracketState): BracketState {
  const rounds = state.rounds.map((round) => round.map((game) => ({ ...game })));
  for (let r = 1; r < rounds.length; r++) {
    for (let i = 0; i < rounds[r]!.length; i++) {
      const homeSource = rounds[r - 1]![i * 2]!;
      const awaySource = rounds[r - 1]![i * 2 + 1]!;
      const home = state.entrants.find((e) => e.id === homeSource.winnerId) ?? null;
      const away = state.entrants.find((e) => e.id === awaySource.winnerId) ?? null;
      const target = rounds[r]![i]!;
      target.home = home;
      target.away = away;
      if (!home || !away) {
        target.winnerId = null;
        target.homeScore = null;
        target.awayScore = null;
      }
    }
  }
  const final = rounds.at(-1)?.[0];
  return { ...state, rounds, championId: final?.winnerId ?? null };
}

/** Un empate requiere desempate antes de avanzar; no se inventa un ganador. */
export function recordKnockoutResult(state: BracketState, gameId: string, homeScore: number, awayScore: number): BracketState {
  if (![homeScore, awayScore].every((n) => Number.isInteger(n) && n >= 0 && n <= 99)) throw new Error('Marcador inválido.');
  if (homeScore === awayScore) throw new Error('Definí el desempate antes de avanzar.');
  const rounds = state.rounds.map((round) => round.map((game) => ({ ...game })));
  const game = rounds.flat().find((item) => item.id === gameId);
  if (!game || !game.home || !game.away || game.winnerId) throw new Error('Cruce no disponible.');
  game.homeScore = homeScore;
  game.awayScore = awayScore;
  game.winnerId = homeScore > awayScore ? game.home.id : game.away.id;
  return propagate({ ...state, rounds });
}

/** Fixture todos contra todos, con descanso automático cuando hay cantidad impar. */
export function createRoundRobin(entrants: BracketEntrant[]): LeagueFixture[] {
  validateEntrants(entrants);
  const teams: (BracketEntrant | null)[] = [...entrants];
  if (teams.length % 2) teams.push(null);
  const fixtures: LeagueFixture[] = [];
  for (let round = 0; round < teams.length - 1; round++) {
    for (let i = 0; i < teams.length / 2; i++) {
      const a = teams[i];
      const b = teams[teams.length - 1 - i];
      if (a && b) fixtures.push({ round: round + 1, home: round % 2 ? b : a, away: round % 2 ? a : b });
    }
    teams.splice(1, 0, teams.pop()!);
  }
  return fixtures;
}
