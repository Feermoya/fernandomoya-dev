import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepoResult } from '@/lib/tournaments/repositories/groups';
import type { MatchdayStatus, TournamentMatchday } from '@/lib/tournaments/types';

type Row = {
  id: string;
  group_id: string;
  name: string;
  status: MatchdayStatus;
  sequence_number: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

function mapRow(row: Row): TournamentMatchday {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    status: row.status,
    sequenceNumber: row.sequence_number,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

export async function listMatchdays(
  supabase: SupabaseClient,
  groupId: string,
): Promise<RepoResult<TournamentMatchday[]>> {
  const { data, error } = await supabase
    .from('tournament_matchdays')
    .select(
      'id, group_id, name, status, sequence_number, started_at, finished_at, created_at',
    )
    .eq('group_id', groupId)
    .order('sequence_number', { ascending: false });

  if (error) {
    console.error('[tournaments] list matchdays', error.message);
    return { ok: false, error: 'No se pudieron cargar las fechas.', code: 'server' };
  }
  return { ok: true, data: (data as Row[]).map(mapRow) };
}

export async function createMatchday(
  supabase: SupabaseClient,
  groupId: string,
  name?: string,
): Promise<RepoResult<TournamentMatchday>> {
  const { data: existing } = await supabase
    .from('tournament_matchdays')
    .select('id, status, sequence_number')
    .eq('group_id', groupId)
    .in('status', ['prepared', 'live']);

  if (existing && existing.length > 0) {
    return {
      ok: false,
      error: 'Ya hay una fecha abierta. Finalizala o usala.',
      code: 'conflict',
    };
  }

  const { data: last } = await supabase
    .from('tournament_matchdays')
    .select('sequence_number')
    .eq('group_id', groupId)
    .order('sequence_number', { ascending: false })
    .limit(1);

  const sequence = ((last?.[0] as { sequence_number?: number } | undefined)?.sequence_number ?? 0) + 1;
  const finalName = (name?.trim() || `Fecha ${sequence}`).slice(0, 64);

  const { data, error } = await supabase
    .from('tournament_matchdays')
    .insert({
      group_id: groupId,
      name: finalName,
      status: 'live',
      sequence_number: sequence,
      started_at: new Date().toISOString(),
    })
    .select(
      'id, group_id, name, status, sequence_number, started_at, finished_at, created_at',
    )
    .single();

  if (error || !data) {
    console.error('[tournaments] create matchday', error?.message);
    return { ok: false, error: 'No se pudo crear la fecha.', code: 'server' };
  }
  return { ok: true, data: mapRow(data as Row) };
}

export async function updateMatchdayStatus(
  supabase: SupabaseClient,
  matchdayId: string,
  groupId: string,
  status: MatchdayStatus,
): Promise<RepoResult<TournamentMatchday>> {
  const patch: Record<string, unknown> = { status };
  if (status === 'finished') {
    patch.finished_at = new Date().toISOString();
  }
  if (status === 'live' || status === 'prepared') {
    patch.finished_at = null;
  }

  const { data, error } = await supabase
    .from('tournament_matchdays')
    .update(patch)
    .eq('id', matchdayId)
    .eq('group_id', groupId)
    .select(
      'id, group_id, name, status, sequence_number, started_at, finished_at, created_at',
    )
    .maybeSingle();

  if (error) {
    console.error('[tournaments] update matchday', error.message);
    return { ok: false, error: 'No se pudo actualizar la fecha.', code: 'server' };
  }
  if (!data) {
    return { ok: false, error: 'Fecha no encontrada.', code: 'not_found' };
  }
  return { ok: true, data: mapRow(data as Row) };
}

export async function getMatchday(
  supabase: SupabaseClient,
  matchdayId: string,
  groupId: string,
): Promise<RepoResult<TournamentMatchday>> {
  const { data, error } = await supabase
    .from('tournament_matchdays')
    .select(
      'id, group_id, name, status, sequence_number, started_at, finished_at, created_at',
    )
    .eq('id', matchdayId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No se pudo cargar la fecha.', code: 'server' };
  }
  if (!data) {
    return { ok: false, error: 'Fecha no encontrada.', code: 'not_found' };
  }
  return { ok: true, data: mapRow(data as Row) };
}
