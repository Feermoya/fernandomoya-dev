export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { requireAdminByPublicId } from '@/lib/tournaments/authGate';
import { createMatchday, updateMatchdayStatus } from '@/lib/tournaments/repositories/matchdays';
import type { MatchdayStatus } from '@/lib/tournaments/types';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  const gate = await requireAdminByPublicId(access.supabase, cookies, publicId);
  if (!gate.ok) {
    return tournamentJson({ ok: false, error: gate.error }, gate.status);
  }

  let name: string | undefined;
  try {
    const body = (await request.json()) as { name?: unknown };
    if (typeof body.name === 'string') name = body.name;
  } catch {
    /* optional body */
  }

  const result = await createMatchday(gate.supabase, gate.group.id, name);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, matchday: result.data });
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  const gate = await requireAdminByPublicId(access.supabase, cookies, publicId);
  if (!gate.ok) {
    return tournamentJson({ ok: false, error: gate.error }, gate.status);
  }

  let body: { matchdayId?: string; status?: MatchdayStatus };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (!body.matchdayId || !body.status) {
    return tournamentJson({ ok: false, error: 'Faltan matchdayId o status.' }, 400);
  }
  if (!['prepared', 'live', 'finished'].includes(body.status)) {
    return tournamentJson({ ok: false, error: 'Estado inválido.' }, 400);
  }

  const result = await updateMatchdayStatus(
    gate.supabase,
    body.matchdayId,
    gate.group.id,
    body.status,
  );
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, matchday: result.data });
};
