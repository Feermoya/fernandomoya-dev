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
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  const updates = Array.isArray(body.updates) ? body.updates : [];
  const additionsRaw = Array.isArray(body.additions) ? body.additions : [];
  const additions = additionsRaw
    .filter((n): n is string => typeof n === 'string')
    .map(normalizePlayerName)
    .filter(Boolean);

  for (const name of additions) {
    if (name.length > TOURNAMENT_LIMITS.playerNameMax) {
      return tournamentJson(
        { ok: false, error: `El nombre "${name}" es demasiado largo.` },
        400,
      );
    }
  }

  const activeCount = groupResult.data.group.players.filter((p) => p.active).length;
  if (activeCount + additions.length > TOURNAMENT_LIMITS.maxPlayers) {
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
  );

  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  return tournamentJson({ ok: true, players: result.data });
};
