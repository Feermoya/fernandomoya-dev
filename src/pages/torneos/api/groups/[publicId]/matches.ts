export const prerender = false;

import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson, writeStatus } from '@/lib/tournaments/api';
import { requireAdminByPublicId } from '@/lib/tournaments/authGate';
import { getMatchday } from '@/lib/tournaments/repositories/matchdays';
import {
  createMatch,
  deleteMatch,
  undoLastMatch,
  updateMatchResult,
} from '@/lib/tournaments/repositories/matches';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
} from '@/lib/tournaments/types';

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

  let body: {
    matchdayId?: string;
    mode?: MatchMode;
    participants?: MatchParticipant[];
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
    action?: 'undo';
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (body.action === 'undo') {
    if (!body.matchdayId) {
      return tournamentJson({ ok: false, error: 'Falta matchdayId.' }, 400);
    }
    const md = await getMatchday(gate.supabase, body.matchdayId, gate.group.id);
    if (!md.ok) {
      return tournamentJson({ ok: false, error: md.error }, writeStatus(md.code));
    }
    if (md.data.status === 'finished') {
      return tournamentJson(
        { ok: false, error: 'Reabrí la fecha para deshacer partidos.' },
        400,
      );
    }
    const undone = await undoLastMatch(gate.supabase, body.matchdayId);
    if (!undone.ok) {
      return tournamentJson({ ok: false, error: undone.error }, writeStatus(undone.code));
    }
    return tournamentJson({ ok: true, deletedId: undone.data.id });
  }

  if (!body.matchdayId || !body.mode || !Array.isArray(body.participants)) {
    return tournamentJson({ ok: false, error: 'Datos de partido incompletos.' }, 400);
  }

  const md = await getMatchday(gate.supabase, body.matchdayId, gate.group.id);
  if (!md.ok) {
    return tournamentJson({ ok: false, error: md.error }, writeStatus(md.code));
  }
  if (md.data.status === 'finished') {
    return tournamentJson(
      { ok: false, error: 'La fecha está finalizada. Reabrila para cargar partidos.' },
      400,
    );
  }

  const result = await createMatch(gate.supabase, {
    matchdayId: body.matchdayId,
    mode: body.mode,
    participants: body.participants,
    scoreHome: body.scoreHome,
    scoreAway: body.scoreAway,
    simplifiedOutcome: body.simplifiedOutcome,
  });

  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, match: result.data });
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

  let body: {
    matchId?: string;
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400);
  }

  if (!body.matchId) {
    return tournamentJson({ ok: false, error: 'Falta matchId.' }, 400);
  }

  const result = await updateMatchResult(gate.supabase, body.matchId, body);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, match: result.data });
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
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

  const url = new URL(request.url);
  const matchId = url.searchParams.get('matchId');
  if (!matchId) {
    return tournamentJson({ ok: false, error: 'Falta matchId.' }, 400);
  }

  const result = await deleteMatch(gate.supabase, matchId);
  if (!result.ok) {
    return tournamentJson({ ok: false, error: result.error }, writeStatus(result.code));
  }
  return tournamentJson({ ok: true, deletedId: result.data.id });
};
