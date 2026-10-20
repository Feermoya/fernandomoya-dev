export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { loadGroupState } from '@/lib/tournaments/repositories/state';

export const GET: APIRoute = async ({ params, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) {
    return tournamentJson({ ok: false, error: 'Falta el identificador del grupo.' }, 400);
  }

  const access = requireTournamentsDataAccess();
  if (!access.ok) {
    return tournamentJson({ ok: false, error: access.message }, 503);
  }

  const result = await loadGroupState(access.supabase, publicId, cookies);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }

  return tournamentJson({ ok: true, state: result.data });
};
