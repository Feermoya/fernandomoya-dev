import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoApi, DEMO_PLAYERS, resetDemoStore } from '@/lib/tournaments/demo/sandbox';

describe('sandbox de prueba', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('arranca con el plantel de siempre y una fecha en juego', async () => {
    const { state } = await createDemoApi().state();
    expect(state.isAdmin).toBe(true);
    expect(state.group.players.map((player) => player.displayName)).toEqual([...DEMO_PLAYERS]);
    expect(state.activeMatchday?.status).toBe('live');
    expect(state.matches).toHaveLength(0);
  });

  it('guarda un 2 vs 2 y suma 3 puntos al ganador', async () => {
    const api = createDemoApi();
    const { state } = await api.state();
    const [fer, ale, fabri, mati] = state.group.players;
    await api.createMatch({
      matchdayId: state.activeMatchday!.id,
      mode: 'pairs',
      participants: [
        { playerId: fer!.id, side: 'home', slot: 0 },
        { playerId: ale!.id, side: 'home', slot: 1 },
        { playerId: fabri!.id, side: 'away', slot: 0 },
        { playerId: mati!.id, side: 'away', slot: 1 },
      ],
      scoreHome: 3,
      scoreAway: 1,
      simplifiedOutcome: null,
    });
    const next = await api.state();
    expect(next.state.matches).toHaveLength(1);
    expect(next.state.rankings.matchday.pairs[0]?.label).toBe('Fer + Ale');
    expect(next.state.rankings.matchday.pairs[0]?.points).toBe(3);
  });
});
