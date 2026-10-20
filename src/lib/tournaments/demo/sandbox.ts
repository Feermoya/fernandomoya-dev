/**
 * TEMPORAL. Banco de prueba en memoria para /torneos/probar.
 * No escribe en Supabase. Borrar este archivo cuando termine la prueba.
 */
import type { TournamentClientApi } from '@/lib/tournaments/clientApi';
import { computeAchievements } from '@/lib/tournaments/achievements';
import {
  computeRankingsBundle,
  validateMatchParticipants,
  validateMatchResult,
} from '@/lib/tournaments/rankings/compute';
import type {
  GroupState,
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentAward,
  TournamentGroup,
  TournamentMatch,
  TournamentMatchday,
  TournamentPlayer,
} from '@/lib/tournaments/types';
import { normalizeGroupName, normalizePlayerName, TOURNAMENT_LIMITS } from '@/lib/tournaments/validate';

export const DEMO_PLAYERS = ['Fer', 'Ale', 'Fabri', 'Mati', 'Rodri', 'Franco'] as const;

const GROUP_ID = 'demo-group';

type Store = {
  name: string;
  players: TournamentPlayer[];
  matchdays: TournamentMatchday[];
  matches: TournamentMatch[];
  awards: TournamentAward[];
  seq: number;
};

function blankStore(): Store {
  const now = new Date().toISOString();
  return {
    name: 'Los de siempre',
    seq: 1,
    players: DEMO_PLAYERS.map((displayName, index) => ({
      id: `demo-p-${index}`,
      displayName,
      active: true,
      sortOrder: index,
    })),
    matchdays: [
      {
        id: 'demo-fecha-1',
        groupId: GROUP_ID,
        name: 'Fecha 1',
        status: 'live',
        sequenceNumber: 1,
        startedAt: now,
        finishedAt: null,
        createdAt: now,
      },
    ],
    matches: [],
    awards: [],
  };
}

let store = blankStore();

export function resetDemoStore(): void {
  store = blankStore();
}

function nextId(prefix: string): string {
  store.seq += 1;
  return `demo-${prefix}-${store.seq}`;
}

function snapshot(): GroupState {
  const activeMatchday =
    store.matchdays.find((day) => day.status === 'live' || day.status === 'prepared') ??
    store.matchdays[0] ??
    null;
  const activeMatches = activeMatchday
    ? store.matches.filter((match) => match.matchdayId === activeMatchday.id)
    : [];
  const matchday = computeRankingsBundle(activeMatches, store.players);
  const allTime = computeRankingsBundle(store.matches, store.players);
  const group: TournamentGroup = {
    id: GROUP_ID,
    publicId: 'demo-local',
    name: store.name,
    createdAt: store.matchdays[0]?.createdAt ?? new Date().toISOString(),
    players: store.players.slice().sort((a, b) => a.sortOrder - b.sortOrder),
  };

  return {
    group,
    isAdmin: true,
    matchdays: store.matchdays.slice().sort((a, b) => b.sequenceNumber - a.sequenceNumber),
    activeMatchday,
    matches: store.matches.slice(),
    awards: store.awards.slice(),
    rankings: { matchday, allTime },
    achievements: computeAchievements({ matchday, allTime, players: store.players }),
  };
}

function fail(message: string): never {
  throw new Error(message);
}

type MatchBody = {
  matchdayId?: string;
  mode?: MatchMode;
  participants?: MatchParticipant[];
  scoreHome?: number | null;
  scoreAway?: number | null;
  simplifiedOutcome?: SimplifiedOutcome | null;
  action?: 'undo';
};

export function createDemoApi(): TournamentClientApi {
  return {
    async state() {
      return { ok: true, state: snapshot() };
    },
    async createMatchday(name) {
      if (store.matchdays.some((day) => day.status === 'live' || day.status === 'prepared')) {
        fail('Ya hay una fecha abierta. Finalizala o usala.');
      }
      const sequence = Math.max(0, ...store.matchdays.map((day) => day.sequenceNumber)) + 1;
      const now = new Date().toISOString();
      store.matchdays.push({
        id: nextId('fecha'),
        groupId: GROUP_ID,
        name: (name?.trim() || `Fecha ${sequence}`).slice(0, 64),
        status: 'live',
        sequenceNumber: sequence,
        startedAt: now,
        finishedAt: null,
        createdAt: now,
      });
      return { ok: true };
    },
    async patchMatchday(matchdayId, status) {
      const day = store.matchdays.find((item) => item.id === matchdayId);
      if (!day) fail('Fecha no encontrada.');
      if (status !== 'live' && status !== 'prepared' && status !== 'finished') {
        fail('Estado de fecha inválido.');
      }
      day.status = status;
      day.finishedAt = status === 'finished' ? new Date().toISOString() : null;
      return { ok: true };
    },
    async createMatch(payload) {
      const body = payload as MatchBody;
      if (body.action === 'undo') {
        if (!body.matchdayId) fail('Falta la fecha.');
        const day = store.matchdays.find((item) => item.id === body.matchdayId);
        if (!day) fail('Fecha no encontrada.');
        if (day.status === 'finished') fail('Reabrí la fecha para deshacer partidos.');
        const list = store.matches.filter((match) => match.matchdayId === day.id);
        const last = list.reduce<TournamentMatch | null>(
          (best, match) => (!best || match.sortOrder > best.sortOrder ? match : best),
          null,
        );
        if (!last) fail('No hay un partido para deshacer.');
        store.matches = store.matches.filter((match) => match.id !== last.id);
        return { ok: true, deletedId: last.id };
      }

      if (!body.matchdayId || !body.mode || !Array.isArray(body.participants)) {
        fail('Datos de partido incompletos.');
      }
      const day = store.matchdays.find((item) => item.id === body.matchdayId);
      if (!day) fail('Fecha no encontrada.');
      if (day.status === 'finished') {
        fail('La fecha está finalizada. Reabrila para cargar partidos.');
      }
      const people = validateMatchParticipants(body.mode, body.participants);
      if (people) fail(people);
      const score = validateMatchResult({
        scoreHome: body.scoreHome,
        scoreAway: body.scoreAway,
        simplifiedOutcome: body.simplifiedOutcome,
      });
      if (score) fail(score);
      const known = new Set(store.players.filter((player) => player.active).map((player) => player.id));
      if (body.participants.some((participant) => !known.has(participant.playerId))) {
        fail('Hay un jugador que no está en el plantel.');
      }
      const sortOrder = store.matches.reduce((max, match) => Math.max(max, match.sortOrder), 0) + 1;
      store.matches.push({
        id: nextId('partido'),
        matchdayId: day.id,
        mode: body.mode,
        sortOrder,
        scoreHome: body.scoreHome ?? null,
        scoreAway: body.scoreAway ?? null,
        simplifiedOutcome: body.simplifiedOutcome ?? null,
        participants: body.participants.map((participant) => ({ ...participant })),
        createdAt: new Date().toISOString(),
      });
      return { ok: true };
    },
    async undoMatch(matchdayId) {
      return createDemoApi().createMatch({ action: 'undo', matchdayId });
    },
    async updateMatch() {
      return { ok: true };
    },
    async saveAwards(matchdayId, awards) {
      const day = store.matchdays.find((item) => item.id === matchdayId);
      if (!day) fail('Fecha no encontrada.');
      const incoming = Array.isArray(awards) ? awards : [];
      store.awards = store.awards.filter((award) => award.matchdayId !== matchdayId);
      for (const award of incoming) {
        if (!award || typeof award !== 'object') continue;
        const row = award as {
          awardType?: string;
          playerId?: string | null;
          playerBId?: string | null;
          note?: string | null;
        };
        if (!row.awardType) continue;
        store.awards.push({
          id: nextId('premio'),
          matchdayId,
          awardType: row.awardType,
          playerId: row.playerId ?? null,
          playerBId: row.playerBId ?? null,
          note: row.note ?? null,
        });
      }
      return { ok: true };
    },
    async renameGroup(name) {
      const next = normalizeGroupName(name);
      if (next.length < TOURNAMENT_LIMITS.groupNameMin) fail('El nombre del grupo es demasiado corto.');
      if (next.length > TOURNAMENT_LIMITS.groupNameMax) fail('El nombre del grupo es demasiado largo.');
      store.name = next;
      return { ok: true, name: next };
    },
    async updatePlayers(payload) {
      const played = new Set(
        store.matches.flatMap((match) => match.participants.map((participant) => participant.playerId)),
      );
      for (const id of payload.removals) {
        if (played.has(id)) {
          fail('Ese jugador ya tiene partidos. Podés sacarlo del plantel, no borrarlo.');
        }
        store.players = store.players.filter((player) => player.id !== id);
      }
      for (const update of payload.updates) {
        const player = store.players.find((item) => item.id === update.id);
        if (!player) continue;
        const displayName = normalizePlayerName(update.displayName);
        if (!displayName) fail('El nombre del jugador no puede quedar vacío.');
        player.displayName = displayName;
        player.active = update.active;
      }
      for (const raw of payload.additions) {
        const displayName = normalizePlayerName(raw);
        if (!displayName) continue;
        store.players.push({
          id: nextId('jugador'),
          displayName,
          active: true,
          sortOrder: store.players.length,
        });
      }
      const seen = new Set<string>();
      for (const player of store.players) {
        const key = player.displayName.toLocaleLowerCase('es');
        if (seen.has(key)) fail(`Hay dos jugadores llamados "${player.displayName}".`);
        seen.add(key);
      }
      const active = store.players.filter((player) => player.active).length;
      if (active < TOURNAMENT_LIMITS.minPlayers) {
        fail('Dejá al menos dos jugadores en el plantel, o eliminá el grupo.');
      }
      if (active > TOURNAMENT_LIMITS.maxPlayers) {
        fail(`Máximo ${TOURNAMENT_LIMITS.maxPlayers} jugadores por grupo.`);
      }
      return { ok: true };
    },
    async deleteGroup(confirmName) {
      if (normalizeGroupName(confirmName) !== normalizeGroupName(store.name)) {
        fail('Escribí el nombre del grupo para confirmar.');
      }
      resetDemoStore();
      return { ok: true };
    },
  };
}
