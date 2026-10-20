import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepoResult } from '@/lib/tournaments/repositories/groups';
import {
  validateMatchParticipants,
  validateMatchResult,
} from '@/lib/tournaments/rankings/compute';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentMatch,
} from '@/lib/tournaments/types';

type MatchRow = {
  id: string;
  matchday_id: string;
  mode: MatchMode;
  sort_order: number;
  score_home: number | null;
  score_away: number | null;
  simplified_outcome: SimplifiedOutcome | null;
  created_at: string;
};

type PartRow = {
  match_id: string;
  player_id: string;
  side: 'home' | 'away';
  slot: number;
};

function mapMatch(row: MatchRow, parts: PartRow[]): TournamentMatch {
  return {
    id: row.id,
    matchdayId: row.matchday_id,
    mode: row.mode,
    sortOrder: row.sort_order,
    scoreHome: row.score_home,
    scoreAway: row.score_away,
    simplifiedOutcome: row.simplified_outcome,
    createdAt: row.created_at,
    participants: parts
      .filter((p) => p.match_id === row.id)
      .map((p) => ({
        playerId: p.player_id,
        side: p.side,
        slot: (p.slot === 1 ? 1 : 0) as 0 | 1,
      })),
  };
}

export async function listMatchesForMatchdays(
  supabase: SupabaseClient,
  matchdayIds: string[],
): Promise<RepoResult<TournamentMatch[]>> {
  if (matchdayIds.length === 0) return { ok: true, data: [] };

  const { data: matchRows, error } = await supabase
    .from('tournament_matches')
    .select(
      'id, matchday_id, mode, sort_order, score_home, score_away, simplified_outcome, created_at',
    )
    .in('matchday_id', matchdayIds)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[tournaments] list matches', error.message);
    return { ok: false, error: 'No se pudieron cargar los partidos.', code: 'server' };
  }

  const rows = (matchRows ?? []) as MatchRow[];
  if (rows.length === 0) return { ok: true, data: [] };

  const { data: partRows, error: partError } = await supabase
    .from('tournament_match_participants')
    .select('match_id, player_id, side, slot')
    .in(
      'match_id',
      rows.map((r) => r.id),
    );

  if (partError) {
    console.error('[tournaments] list participants', partError.message);
    return { ok: false, error: 'No se pudieron cargar participantes.', code: 'server' };
  }

  return {
    ok: true,
    data: rows.map((r) => mapMatch(r, (partRows ?? []) as PartRow[])),
  };
}

export type CreateMatchInput = {
  matchdayId: string;
  mode: MatchMode;
  participants: MatchParticipant[];
  scoreHome?: number | null;
  scoreAway?: number | null;
  simplifiedOutcome?: SimplifiedOutcome | null;
};

export async function createMatch(
  supabase: SupabaseClient,
  input: CreateMatchInput,
): Promise<RepoResult<TournamentMatch>> {
  const partErr = validateMatchParticipants(input.mode, input.participants);
  if (partErr) return { ok: false, error: partErr, code: 'validation' };

  const resultErr = validateMatchResult({
    scoreHome: input.scoreHome,
    scoreAway: input.scoreAway,
    simplifiedOutcome: input.simplifiedOutcome,
  });
  if (resultErr) return { ok: false, error: resultErr, code: 'validation' };

  const hasScores = input.scoreHome != null && input.scoreAway != null;

  const { data: last } = await supabase
    .from('tournament_matches')
    .select('sort_order')
    .eq('matchday_id', input.matchdayId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder =
    ((last?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const { data: row, error } = await supabase
    .from('tournament_matches')
    .insert({
      matchday_id: input.matchdayId,
      mode: input.mode,
      sort_order: sortOrder,
      score_home: hasScores ? input.scoreHome : null,
      score_away: hasScores ? input.scoreAway : null,
      simplified_outcome: hasScores ? null : input.simplifiedOutcome,
    })
    .select(
      'id, matchday_id, mode, sort_order, score_home, score_away, simplified_outcome, created_at',
    )
    .single();

  if (error || !row) {
    console.error('[tournaments] create match', error?.message);
    return { ok: false, error: 'No se pudo guardar el partido.', code: 'server' };
  }

  const partInsert = input.participants.map((p) => ({
    match_id: (row as MatchRow).id,
    player_id: p.playerId,
    side: p.side,
    slot: p.slot,
  }));

  const { error: pErr } = await supabase
    .from('tournament_match_participants')
    .insert(partInsert);

  if (pErr) {
    await supabase.from('tournament_matches').delete().eq('id', (row as MatchRow).id);
    console.error('[tournaments] create participants', pErr.message);
    return { ok: false, error: 'No se pudieron guardar los jugadores.', code: 'server' };
  }

  return {
    ok: true,
    data: mapMatch(row as MatchRow, partInsert.map((p) => ({
      match_id: p.match_id,
      player_id: p.player_id,
      side: p.side,
      slot: p.slot,
    }))),
  };
}

export async function updateMatchResult(
  supabase: SupabaseClient,
  matchId: string,
  input: {
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
  },
): Promise<RepoResult<TournamentMatch>> {
  const resultErr = validateMatchResult(input);
  if (resultErr) return { ok: false, error: resultErr, code: 'validation' };

  const hasScores = input.scoreHome != null && input.scoreAway != null;
  const { data: row, error } = await supabase
    .from('tournament_matches')
    .update({
      score_home: hasScores ? input.scoreHome : null,
      score_away: hasScores ? input.scoreAway : null,
      simplified_outcome: hasScores ? null : input.simplifiedOutcome,
    })
    .eq('id', matchId)
    .select(
      'id, matchday_id, mode, sort_order, score_home, score_away, simplified_outcome, created_at',
    )
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No se pudo actualizar el partido.', code: 'server' };
  }
  if (!row) {
    return { ok: false, error: 'Partido no encontrado.', code: 'not_found' };
  }

  const { data: parts } = await supabase
    .from('tournament_match_participants')
    .select('match_id, player_id, side, slot')
    .eq('match_id', matchId);

  return { ok: true, data: mapMatch(row as MatchRow, (parts ?? []) as PartRow[]) };
}

export async function deleteMatch(
  supabase: SupabaseClient,
  matchId: string,
): Promise<RepoResult<{ id: string }>> {
  const { error } = await supabase.from('tournament_matches').delete().eq('id', matchId);
  if (error) {
    return { ok: false, error: 'No se pudo eliminar el partido.', code: 'server' };
  }
  return { ok: true, data: { id: matchId } };
}

export async function undoLastMatch(
  supabase: SupabaseClient,
  matchdayId: string,
): Promise<RepoResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('matchday_id', matchdayId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No se pudo deshacer.', code: 'server' };
  }
  if (!data) {
    return { ok: false, error: 'No hay partidos para deshacer.', code: 'not_found' };
  }
  return deleteMatch(supabase, (data as { id: string }).id);
}
