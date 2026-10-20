export const prerender = false;

import type { APIRoute } from 'astro';
import {
  requireTournamentAdminApi,
  requireTournamentsDataAccess,
  tournamentJson,
  writeStatus,
} from '@/lib/tournaments/api';
import {
  getCredentialsByGroupId,
  getGroupByPublicId,
  updatePlayers,
} from '@/lib/tournaments/repositories/groups';
import {
  normalizePlayerName,
  TOURNAMENT_LIMITS,
} from '@/lib/tournaments/validate';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  const groupResult = await getGroupByPublicId(access.supabase, publicId);
  if (!groupResult.ok) {
    return tournamentJson({ ok: false, error: groupResult.error }, writeStatus(groupResult.code));
  }

  const creds = await getCredentialsByGroupId(access.supabase, groupResult.data.group.id);
  if (!creds.ok) {
    return tournamentJson({ ok: false, error: creds.error }, writeStatus(creds.code));
  }

  const admin = requireTournamentAdminApi(
    cookies,
    groupResult.data.group.id,
    creds.data.version,
  );
  if (!admin.ok) {
    return tournamentJson({ ok: false, error: admin.message }, 401);
  }

  let body: {
    updates?: Array<{
      id?: string;
      displayName?: string;
      active?: boolean;
      sortOrder?: number;
    }>;
    additions?: string[];
    removals?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  const updates = (Array.isArray(body.updates) ? body.updates : []).map((update) => {
    if (typeof update.displayName !== 'string') return update;
    return { ...update, displayName: normalizePlayerName(update.displayName) };
  });
  const additionsRaw = Array.isArray(body.additions) ? body.additions : [];
  const additions = additionsRaw
    .filter((n): n is string => typeof n === 'string')
    .map(normalizePlayerName)
    .filter(Boolean);
  const playerIds = new Set(groupResult.data.group.players.map((player) => player.id));
  const removals = (Array.isArray(body.removals) ? body.removals : []).filter(
    (id): id is string => typeof id === 'string' && playerIds.has(id),
  );

  for (const update of updates) {
    if (typeof update.displayName === 'string' && !update.displayName) {
      return tournamentJson({ ok: false, error: 'El nombre del jugador no puede quedar vacío.' }, 400);
    }
    if (
      typeof update.displayName === 'string' &&
      update.displayName.length > TOURNAMENT_LIMITS.playerNameMax
    ) {
      return tournamentJson(
        { ok: false, error: `El nombre "${update.displayName}" es demasiado largo.` },
        400,
      );
    }
  }

  for (const name of additions) {
    if (name.length > TOURNAMENT_LIMITS.playerNameMax) {
      return tournamentJson(
        { ok: false, error: `El nombre "${name}" es demasiado largo.` },
        400,
      );
    }
  }

  const removalSet = new Set(removals);
  const names = new Set<string>();
  let activeCount = 0;
  for (const player of groupResult.data.group.players) {
    if (removalSet.has(player.id)) continue;
    const update = updates.find((item) => item.id === player.id);
    const displayName =
      typeof update?.displayName === 'string' ? update.displayName : player.displayName;
    const active = typeof update?.active === 'boolean' ? update.active : player.active;
    const key = displayName.toLocaleLowerCase('es');
    if (names.has(key)) {
      return tournamentJson({ ok: false, error: `Hay dos jugadores llamados "${displayName}".` }, 400);
    }
    names.add(key);
    if (active) activeCount += 1;
  }
  for (const name of additions) {
    const key = name.toLocaleLowerCase('es');
    if (names.has(key)) {
      return tournamentJson({ ok: false, error: `Hay dos jugadores llamados "${name}".` }, 400);
    }
    names.add(key);
    activeCount += 1;
  }

  if (activeCount < TOURNAMENT_LIMITS.minPlayers) {
    return tournamentJson(
      { ok: false, error: 'Dejá al menos dos jugadores en el plantel, o eliminá el grupo.' },
      400,
    );
  }
  if (activeCount > TOURNAMENT_LIMITS.maxPlayers) {
    return tournamentJson(
      {
        ok: false,
        error: `Máximo ${TOURNAMENT_LIMITS.maxPlayers} jugadores por grupo.`,
      },
      400,
    );
  }

  const result = await updatePlayers(
    access.supabase,
    groupResult.data.group.id,
    updates,
    additions,
    removals,
  );

  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  return tournamentJson({ ok: true, players: result.data });
};
