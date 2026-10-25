export const prerender = false;
import type { APIRoute } from 'astro';
import { requireTournamentsDataAccess, tournamentJson } from '@/lib/tournaments/api';
import { requireAdminByPublicId } from '@/lib/tournaments/authGate';
import { getGroupByPublicId } from '@/lib/tournaments/repositories/groups';
import { getMatchday } from '@/lib/tournaments/repositories/matchdays';

export const GET: APIRoute = async ({ params, url }) => {
  const publicId = params.publicId?.trim();
  const matchdayId = url.searchParams.get('matchdayId');
  if (!publicId || !matchdayId) return tournamentJson({ ok: false, error: 'Faltan datos.' }, 400);
  const access = requireTournamentsDataAccess();
  if (!access.ok) return tournamentJson({ ok: false, error: access.message }, 503);
  const group = await getGroupByPublicId(access.supabase, publicId);
  if (!group.ok) return tournamentJson({ ok: false, error: 'Grupo no encontrado.' }, 404);
  const day = await getMatchday(access.supabase, matchdayId, group.data.group.id);
  if (!day.ok) return tournamentJson({ ok: false, error: 'Fecha no encontrada.' }, 404);
  const { data, error } = await access.supabase.from('tournament_plans').select('plan').eq('matchday_id', matchdayId).eq('group_id', group.data.group.id).maybeSingle();
  if (error) return tournamentJson({ ok: false, error: 'No se pudo consultar el cuadro. Revisá la migración.' }, 503);
  return tournamentJson({ ok: true, plan: data?.plan ?? null });
};
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const publicId = params.publicId?.trim();
  if (!publicId) return tournamentJson({ ok: false, error: 'Falta el grupo.' }, 400);
  const access = requireTournamentsDataAccess();
  if (!access.ok) return tournamentJson({ ok: false, error: access.message }, 503);
  const gate = await requireAdminByPublicId(access.supabase, cookies, publicId);
  if (!gate.ok) return tournamentJson({ ok: false, error: gate.error }, gate.status);
  let body: { matchdayId?: string; plan?: unknown };
  try { body = await request.json(); } catch { return tournamentJson({ ok: false, error: 'JSON inválido.' }, 400); }
  if (!body.matchdayId) return tournamentJson({ ok: false, error: 'Falta la fecha.' }, 400);
  const day = await getMatchday(gate.supabase, body.matchdayId, gate.group.id);
  if (!day.ok) return tournamentJson({ ok: false, error: 'Fecha no encontrada.' }, 404);
  if (day.data.status === 'finished') return tournamentJson({ ok: false, error: 'La fecha está cerrada.' }, 400);
  const plan = body.plan as { mode?: unknown; format?: unknown; entrants?: Array<{ id?: unknown; label?: unknown; playerIds?: unknown }> } | null;
  if (plan !== null && (
    !plan || !['solo','pairs'].includes(String(plan.mode)) ||
    !['round-robin','knockout','semifinal','groups'].includes(String(plan.format)) ||
    !Array.isArray(plan.entrants) || plan.entrants.length < 2 || plan.entrants.length > 32 ||
    plan.entrants.some((e) => typeof e.id !== 'string' || typeof e.label !== 'string' || !Array.isArray(e.playerIds) || e.playerIds.length !== (plan.mode === 'solo' ? 1 : 2) || e.playerIds.some((id) => typeof id !== 'string'))
  )) return tournamentJson({ ok: false, error: 'Cuadro inválido.' }, 400);
  if (plan === null) {
    const { error } = await gate.supabase.from('tournament_plans').delete().eq('matchday_id', body.matchdayId).eq('group_id', gate.group.id);
    return error ? tournamentJson({ ok: false, error: 'No se pudo borrar.' }, 500) : tournamentJson({ ok: true });
  }
  const { error } = await gate.supabase.from('tournament_plans').upsert({ matchday_id: body.matchdayId, group_id: gate.group.id, plan, updated_at: new Date().toISOString() }, { onConflict: 'matchday_id' });
  return error ? tournamentJson({ ok: false, error: 'No se pudo guardar el cuadro. Revisá la migración.' }, 503) : tournamentJson({ ok: true });
};
