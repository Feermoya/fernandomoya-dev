import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepoResult } from '@/lib/tournaments/repositories/groups';
import type { TournamentAward } from '@/lib/tournaments/types';

type Row = {
  id: string;
  matchday_id: string;
  award_type: string;
  player_id: string | null;
  player_b_id: string | null;
  note: string | null;
};

function mapRow(row: Row): TournamentAward {
  return {
    id: row.id,
    matchdayId: row.matchday_id,
    awardType: row.award_type,
    playerId: row.player_id,
    playerBId: row.player_b_id,
    note: row.note,
  };
}

export async function listAwardsForMatchdays(
  supabase: SupabaseClient,
  matchdayIds: string[],
): Promise<RepoResult<TournamentAward[]>> {
  if (matchdayIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('tournament_awards')
    .select('id, matchday_id, award_type, player_id, player_b_id, note')
    .in('matchday_id', matchdayIds);

  if (error) {
    console.error('[tournaments] list awards', error.message);
    return { ok: false, error: 'No se pudieron cargar los premios.', code: 'server' };
  }
  return { ok: true, data: ((data ?? []) as Row[]).map(mapRow) };
}

export type AwardInput = {
  awardType: string;
  playerId?: string | null;
  playerBId?: string | null;
  note?: string | null;
};

/**
 * Reemplaza premios manuales de una fecha (mvp, best_goal, best_pair, custom*).
 * Los automáticos se calculan en runtime, no se persisten acá.
 */
export async function upsertManualAwards(
  supabase: SupabaseClient,
  matchdayId: string,
  awards: AwardInput[],
): Promise<RepoResult<TournamentAward[]>> {
  const manualTypes = new Set(['mvp', 'best_goal', 'best_pair']);
  const customs = awards.filter(
    (a) => a.awardType.startsWith('custom') || manualTypes.has(a.awardType),
  );

  // Solo persistimos premios manuales; los automáticos se calculan en runtime.
  await supabase.from('tournament_awards').delete().eq('matchday_id', matchdayId);

  if (customs.length === 0) {
    return { ok: true, data: [] };
  }

  const rows = customs.map((a) => ({
    matchday_id: matchdayId,
    award_type: a.awardType.slice(0, 48),
    player_id: a.playerId ?? null,
    player_b_id: a.playerBId ?? null,
    note: a.note ? a.note.slice(0, 280) : null,
  }));

  const { data, error } = await supabase
    .from('tournament_awards')
    .insert(rows)
    .select('id, matchday_id, award_type, player_id, player_b_id, note');

  if (error) {
    console.error('[tournaments] upsert awards', error.message);
    return { ok: false, error: 'No se pudieron guardar los premios.', code: 'server' };
  }
  return { ok: true, data: ((data ?? []) as Row[]).map(mapRow) };
}
