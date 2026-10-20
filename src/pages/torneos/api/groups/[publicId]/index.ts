export const prerender = false;

import type { APIRoute } from 'astro';
import {
  requireTournamentAdminApi,
  requireTournamentsDataAccess,
  tournamentJson,
  writeStatus,
} from '@/lib/tournaments/api';
import {
  deleteGroup,
  getCredentialsByGroupId,
  getGroupByPublicId,
  renameGroup,
} from '@/lib/tournaments/repositories/groups';
import { isTournamentAdminForGroup } from '@/lib/tournaments/session';
import { TOURNAMENT_ADMIN_COOKIE } from '@/lib/tournaments/secrets';
import { normalizeGroupName, TOURNAMENT_LIMITS } from '@/lib/tournaments/validate';

export const GET: APIRoute = async ({ params, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  const result = await getGroupByPublicId(access.supabase, publicId);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  const isAdmin = isTournamentAdminForGroup(
    cookies,
    result.data.group.id,
    result.data.credentialVersion,
  );

  return tournamentJson({
    ok: true,
    group: result.data.group,
    isAdmin,
    hasActiveAdmin: result.data.hasActiveAdmin,
  });
};

async function loadAdminGroup(params: { publicId?: string }, cookies: Parameters<APIRoute>[0]['cookies']) {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return { ok: false as const, response: tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400) };
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return { ok: false as const, response: tournamentJson({ ok: false, error: access.message }, 503) };
  }

  const groupResult = await getGroupByPublicId(access.supabase, publicId);
  if (!groupResult.ok) {
    return {
      ok: false as const,
      response: tournamentJson({ ok: false, error: groupResult.error }, writeStatus(groupResult.code)),
    };
  }

  const creds = await getCredentialsByGroupId(access.supabase, groupResult.data.group.id);
  if (!creds.ok) {
    return {
      ok: false as const,
      response: tournamentJson({ ok: false, error: creds.error }, writeStatus(creds.code)),
    };
  }

  const admin = requireTournamentAdminApi(cookies, groupResult.data.group.id, creds.data.version);
  if (!admin.ok) {
    return { ok: false as const, response: tournamentJson({ ok: false, error: admin.message }, 401) };
  }

  return { ok: true as const, access, group: groupResult.data.group };
}

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const loaded = await loadAdminGroup(params, cookies);
  if (!loaded.ok) return loaded.response;

  let name = '';
  try {
    const body = (await request.json()) as { name?: unknown };
    if (typeof body.name === 'string') name = normalizeGroupName(body.name);
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (name.length < TOURNAMENT_LIMITS.groupNameMin) {
    return tournamentJson({ ok: false, error: 'El nombre del grupo es demasiado corto.' }, 400);
  }
  if (name.length > TOURNAMENT_LIMITS.groupNameMax) {
    return tournamentJson({ ok: false, error: 'El nombre del grupo es demasiado largo.' }, 400);
  }

  const result = await renameGroup(loaded.access.supabase, loaded.group.id, name);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  return tournamentJson({ ok: true, name: result.data.name });
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const loaded = await loadAdminGroup(params, cookies);
  if (!loaded.ok) return loaded.response;

  let confirmName = '';
  try {
    const body = (await request.json()) as { confirmName?: unknown };
    if (typeof body.confirmName === 'string') confirmName = normalizeGroupName(body.confirmName);
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (confirmName !== normalizeGroupName(loaded.group.name)) {
    return tournamentJson({ ok: false, error: 'Escribí el nombre del grupo para confirmar.' }, 400);
  }

  const result = await deleteGroup(loaded.access.supabase, loaded.group.id);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  cookies.delete(TOURNAMENT_ADMIN_COOKIE, { path: '/torneos' });
  return tournamentJson({ ok: true });
};
