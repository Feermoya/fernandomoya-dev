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
  rotateAdminSecret,
} from '@/lib/tournaments/repositories/groups';
import {
  createAdminSessionToken,
  TOURNAMENT_ADMIN_COOKIE,
  tournamentAdminCookieOptions,
} from '@/lib/tournaments/secrets';

export const POST: APIRoute = async ({ params, cookies }) => {
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

  const rotated = await rotateAdminSecret(access.supabase, groupResult.data.group.id);
  if (!rotated.ok) {
    return tournamentJson({ ok: false, error: rotated.error }, writeStatus(rotated.code));
  }

  const token = createAdminSessionToken(groupResult.data.group.id, rotated.data.version);
  cookies.set(
    TOURNAMENT_ADMIN_COOKIE,
    token,
    tournamentAdminCookieOptions(import.meta.env.PROD),
  );

  return tournamentJson({
    ok: true,
    adminSecret: rotated.data.adminSecret,
    message: 'Acceso anterior revocado. Guardá el nuevo secreto de organizador.',
  });
};
