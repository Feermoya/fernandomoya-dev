export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { getGroupByPublicId } from '@/lib/tournaments/repositories/groups';
import { isTournamentAdminForGroup } from '@/lib/tournaments/session';

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
