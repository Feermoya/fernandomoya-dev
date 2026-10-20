export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import {
  getCredentialsByGroupId,
  getGroupByPublicId,
} from '@/lib/tournaments/repositories/groups';
import {
  createAdminSessionToken,
  TOURNAMENT_ADMIN_COOKIE,
  tournamentAdminCookieOptions,
  verifySecret,
} from '@/lib/tournaments/secrets';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  let adminSecret = '';
  try {
    const body = (await request.json()) as { adminSecret?: unknown };
    if (typeof body.adminSecret === 'string') adminSecret = body.adminSecret.trim();
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (!adminSecret) {
    return tournamentJson({ ok: false, error: 'Falta el secreto de organizador.' }, 400);
  }

  const groupResult = await getGroupByPublicId(access.supabase, publicId);
  if (!groupResult.ok) {
    return tournamentJson({ ok: false, error: groupResult.error }, writeStatus(groupResult.code));
  }

  const creds = await getCredentialsByGroupId(access.supabase, groupResult.data.group.id);
  if (!creds.ok) {
    return tournamentJson({ ok: false, error: creds.error }, writeStatus(creds.code));
  }

  if (!verifySecret(adminSecret, creds.data.secret_hash)) {
    return tournamentJson({ ok: false, error: 'Secreto de organizador inválido.' }, 401);
  }

  const token = createAdminSessionToken(groupResult.data.group.id, creds.data.version);
  cookies.set(
    TOURNAMENT_ADMIN_COOKIE,
    token,
    tournamentAdminCookieOptions(import.meta.env.PROD),
  );

  return tournamentJson({ ok: true, isAdmin: true });
};
