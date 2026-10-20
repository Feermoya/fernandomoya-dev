export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { requireAdminByPublicId } from '@/lib/tournaments/authGate';
import { upsertManualAwards, type AwardInput } from '@/lib/tournaments/repositories/awards';
import { getMatchday } from '@/lib/tournaments/repositories/matchdays';

export const PUT: APIRoute = async ({ params, request, cookies }) => {
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

  let body: { matchdayId?: string; awards?: AwardInput[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (!body.matchdayId || !Array.isArray(body.awards)) {
    return tournamentJson({ ok: false, error: 'Datos incompletos.' }, 400);
  }

  const md = await getMatchday(gate.supabase, body.matchdayId, gate.group.id);
  if (!md.ok) {
    return tournamentJson({ ok: false, error: md.error }, writeStatus(md.code));
  }

  const result = await upsertManualAwards(gate.supabase, body.matchdayId, body.awards);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, awards: result.data });
};
