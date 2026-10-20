export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import {
  getCredentialsByGroupId,
  getGroupByPublicId,
  rotateAdminSecret,
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

  let recoveryKey = '';
  try {
    const body = (await request.json()) as { recoveryKey?: unknown };
    if (typeof body.recoveryKey === 'string') recoveryKey = body.recoveryKey.trim();
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (!recoveryKey) {
    return tournamentJson({ ok: false, error: 'Falta la clave de recuperación.' }, 400);
  }

  const groupResult = await getGroupByPublicId(access.supabase, publicId);
  if (!groupResult.ok) {
    return tournamentJson({ ok: false, error: groupResult.error }, writeStatus(groupResult.code));
  }

  const creds = await getCredentialsByGroupId(access.supabase, groupResult.data.group.id);
  if (!creds.ok) {
    return tournamentJson({ ok: false, error: creds.error }, writeStatus(creds.code));
  }

  if (!verifySecret(recoveryKey, creds.data.recovery_hash)) {
    return tournamentJson({ ok: false, error: 'Clave de recuperación inválida.' }, 401);
  }

  const rotated = await rotateAdminSecret(access.supabase, groupResult.data.group.id, {
    rotateRecovery: false,
  });
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
    message:
      'Nuevo secreto de organizador generado. La clave de recuperación sigue siendo la misma.',
  });
};
