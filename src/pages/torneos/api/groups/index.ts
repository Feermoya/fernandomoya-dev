export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { createGroupWithPlayers } from '@/lib/tournaments/repositories/groups';
import { validateCreateGroupInput } from '@/lib/tournaments/validate';
import {
  createAdminSessionToken,
  TOURNAMENT_ADMIN_COOKIE,
  tournamentAdminCookieOptions,
} from '@/lib/tournaments/secrets';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  const validated = validateCreateGroupInput(
    (payload ?? {}) as { name?: unknown; players?: unknown },
  );
  if (!validated.ok) {
    return tournamentJson({ ok: false, error: validated.error }, 400);
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;

  const result = await createGroupWithPlayers(access.supabase, {
    name: validated.name,
    players: validated.players,
    clientIp,
  });

  if (!result.ok) {
    return tournamentJson(
      { ok: false, error: result.error },
      writeStatus(result.code),
    );
  }

  const origin = new URL(request.url).origin;
  const viewUrl = `${origin}/torneos/g/${result.data.group.publicId}`;

  // Sesión admin inmediata tras crear
  const token = createAdminSessionToken(result.data.group.id, result.data.credentialVersion);
  cookies.set(
    TOURNAMENT_ADMIN_COOKIE,
    token,
    tournamentAdminCookieOptions(import.meta.env.PROD),
  );

  return tournamentJson({
    ok: true,
    group: result.data.group,
    adminSecret: result.data.adminSecret,
    recoveryKey: result.data.recoveryKey,
    viewUrl,
    adminClaimHint: 'Guardá el secreto y la clave de recuperación. No se vuelven a mostrar.',
  });
};
