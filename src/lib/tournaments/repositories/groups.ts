import type { SupabaseClient } from '@supabase/supabase-js';
import { createPublicId, createRecoveryKey, createSecretToken } from '@/lib/tournaments/ids';
import { hashSecret, hashIp } from '@/lib/tournaments/secrets';
import { TOURNAMENT_LIMITS } from '@/lib/tournaments/validate';
import type { TournamentGroup, TournamentPlayer } from '@/lib/tournaments/types';

type GroupRow = {
  id: string;
  public_id: string;
  name: string;
  created_at: string;
};

type PlayerRow = {
  id: string;
  display_name: string;
  active: boolean;
  sort_order: number;
};

type CredentialRow = {
  group_id: string;
  secret_hash: string;
  recovery_hash: string;
  version: number;
  revoked_at: string | null;
};

function mapPlayers(rows: PlayerRow[]): TournamentPlayer[] {
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      id: p.id,
      displayName: p.display_name,
      active: p.active,
      sortOrder: p.sort_order,
    }));
}

export function mapGroup(row: GroupRow, players: PlayerRow[]): TournamentGroup {
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    createdAt: row.created_at,
    players: mapPlayers(players),
  };
}

export type RepoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export async function countRecentCreatesByIpHash(
  supabase: SupabaseClient,
  ipHash: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('tournament_groups')
    .select('id', { count: 'exact', head: true })
    .eq('created_ip_hash', ipHash)
    .gte('created_at', sinceIso);

  if (error) {
    console.error('[tournaments] rate limit count failed', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function createGroupWithPlayers(
  supabase: SupabaseClient,
  input: {
    name: string;
    players: string[];
    clientIp?: string | null;
  },
): Promise<
  RepoResult<{
    group: TournamentGroup;
    adminSecret: string;
    recoveryKey: string;
    credentialVersion: number;
  }>
> {
  const ipHash = input.clientIp ? hashIp(input.clientIp) : null;

  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await countRecentCreatesByIpHash(supabase, ipHash, since);
    if (recent >= TOURNAMENT_LIMITS.createsPerIpPerHour) {
      return {
        ok: false,
        error: 'Demasiados grupos creados desde esta red. Probá más tarde.',
        code: 'rate_limited',
      };
    }
  }

  const publicId = createPublicId();
  const adminSecret = createSecretToken();
  const recoveryKey = createRecoveryKey();
  const secretHash = hashSecret(adminSecret);
  const recoveryHash = hashSecret(recoveryKey);

  const { data: groupRow, error: groupError } = await supabase
    .from('tournament_groups')
    .insert({
      public_id: publicId,
      name: input.name,
      created_ip_hash: ipHash,
    })
    .select('id, public_id, name, created_at')
    .single();

  if (groupError || !groupRow) {
    console.error('[tournaments] create group failed', groupError?.message);
    return { ok: false, error: 'No se pudo crear el grupo.', code: 'server' };
  }

  const playerRows = input.players.map((display_name, index) => ({
    group_id: groupRow.id,
    display_name,
    sort_order: index,
    active: true,
  }));

  const { data: insertedPlayers, error: playersError } = await supabase
    .from('tournament_players')
    .insert(playerRows)
    .select('id, display_name, active, sort_order');

  if (playersError || !insertedPlayers) {
    await supabase.from('tournament_groups').delete().eq('id', groupRow.id);
    console.error('[tournaments] create players failed', playersError?.message);
    return { ok: false, error: 'No se pudieron guardar los jugadores.', code: 'server' };
  }

  const { error: credError } = await supabase.from('tournament_admin_credentials').insert({
    group_id: groupRow.id,
    secret_hash: secretHash,
    recovery_hash: recoveryHash,
    version: 1,
  });

  if (credError) {
    await supabase.from('tournament_groups').delete().eq('id', groupRow.id);
    console.error('[tournaments] create credentials failed', credError.message);
    return { ok: false, error: 'No se pudieron crear las credenciales.', code: 'server' };
  }

  return {
    ok: true,
    data: {
      group: mapGroup(groupRow as GroupRow, insertedPlayers as PlayerRow[]),
      adminSecret,
      recoveryKey,
      credentialVersion: 1,
    },
  };
}

export async function getGroupByPublicId(
  supabase: SupabaseClient,
  publicId: string,
): Promise<
  RepoResult<{
    group: TournamentGroup;
    credentialVersion: number;
    hasActiveAdmin: boolean;
  }>
> {
  const { data: groupRow, error: groupError } = await supabase
    .from('tournament_groups')
    .select('id, public_id, name, created_at')
    .eq('public_id', publicId)
    .maybeSingle();

  if (groupError) {
    console.error('[tournaments] get group failed', groupError.message);
    return { ok: false, error: 'No se pudo cargar el grupo.', code: 'server' };
  }
  if (!groupRow) {
    return { ok: false, error: 'Grupo no encontrado.', code: 'not_found' };
  }

  const { data: players, error: playersError } = await supabase
    .from('tournament_players')
    .select('id, display_name, active, sort_order')
    .eq('group_id', groupRow.id)
    .order('sort_order', { ascending: true });

  if (playersError) {
    console.error('[tournaments] get players failed', playersError.message);
    return { ok: false, error: 'No se pudieron cargar los jugadores.', code: 'server' };
  }

  const { data: cred, error: credError } = await supabase
    .from('tournament_admin_credentials')
    .select('group_id, secret_hash, recovery_hash, version, revoked_at')
    .eq('group_id', groupRow.id)
    .maybeSingle();

  if (credError) {
    console.error('[tournaments] get credentials failed', credError.message);
    return { ok: false, error: 'No se pudo verificar el acceso.', code: 'server' };
  }

  return {
    ok: true,
    data: {
      group: mapGroup(groupRow as GroupRow, (players ?? []) as PlayerRow[]),
      credentialVersion: (cred as CredentialRow | null)?.version ?? 0,
      hasActiveAdmin: Boolean(cred && !(cred as CredentialRow).revoked_at),
    },
  };
}

export async function getCredentialsByGroupId(
  supabase: SupabaseClient,
  groupId: string,
): Promise<RepoResult<CredentialRow>> {
  const { data, error } = await supabase
    .from('tournament_admin_credentials')
    .select('group_id, secret_hash, recovery_hash, version, revoked_at')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) {
    console.error('[tournaments] get credentials failed', error.message);
    return { ok: false, error: 'No se pudo verificar el acceso.', code: 'server' };
  }
  if (!data) {
    return { ok: false, error: 'Credenciales no encontradas.', code: 'not_found' };
  }
  return { ok: true, data: data as CredentialRow };
}

export async function rotateAdminSecret(
  supabase: SupabaseClient,
  groupId: string,
  opts: { rotateRecovery?: boolean } = {},
): Promise<
  RepoResult<{ adminSecret: string; recoveryKey?: string; version: number }>
> {
  const adminSecret = createSecretToken();
  const patch: Record<string, unknown> = {
    secret_hash: hashSecret(adminSecret),
    revoked_at: null,
  };

  let recoveryKey: string | undefined;
  if (opts.rotateRecovery) {
    recoveryKey = createRecoveryKey();
    patch.recovery_hash = hashSecret(recoveryKey);
  }

  const current = await getCredentialsByGroupId(supabase, groupId);
  if (!current.ok) return current;

  const nextVersion = current.data.version + 1;
  patch.version = nextVersion;

  const { error } = await supabase
    .from('tournament_admin_credentials')
    .update(patch)
    .eq('group_id', groupId);

  if (error) {
    console.error('[tournaments] rotate admin failed', error.message);
    return { ok: false, error: 'No se pudo rotar el acceso.', code: 'server' };
  }

  return {
    ok: true,
    data: { adminSecret, recoveryKey, version: nextVersion },
  };
}

export async function renameGroup(
  supabase: SupabaseClient,
  groupId: string,
  name: string,
): Promise<RepoResult<{ name: string }>> {
  const { error } = await supabase.from('tournament_groups').update({ name }).eq('id', groupId);
  if (error) {
    console.error('[tournaments] rename group failed', error.message);
    return { ok: false, error: 'No se pudo renombrar el grupo.', code: 'server' };
  }
  return { ok: true, data: { name } };
}

export async function deleteGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<RepoResult<{ deleted: true }>> {
  const { data: days, error: daysError } = await supabase
    .from('tournament_matchdays')
    .select('id')
    .eq('group_id', groupId);

  if (daysError) {
    console.error('[tournaments] list matchdays for delete failed', daysError.message);
    return { ok: false, error: 'No se pudo eliminar el grupo.', code: 'server' };
  }

  const dayIds = (days ?? []).map((day) => day.id as string);
  if (dayIds.length > 0) {
    const { error: matchesError } = await supabase
      .from('tournament_matches')
      .delete()
      .in('matchday_id', dayIds);
    if (matchesError) {
      console.error('[tournaments] delete matches failed', matchesError.message);
      return { ok: false, error: 'No se pudo eliminar el grupo.', code: 'server' };
    }
  }

  const { error } = await supabase.from('tournament_groups').delete().eq('id', groupId);
  if (error) {
    console.error('[tournaments] delete group failed', error.message);
    return { ok: false, error: 'No se pudo eliminar el grupo.', code: 'server' };
  }

  return { ok: true, data: { deleted: true } };
}

export async function updatePlayers(
  supabase: SupabaseClient,
  groupId: string,
  updates: Array<{
    id?: string;
    displayName?: string;
    active?: boolean;
    sortOrder?: number;
  }>,
  additions: string[],
  removals: string[] = [],
): Promise<RepoResult<TournamentPlayer[]>> {
  for (const id of removals) {
    const { count, error: countError } = await supabase
      .from('tournament_match_participants')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', id);

    if (countError) {
      console.error('[tournaments] player match count failed', countError.message);
      return { ok: false, error: 'No se pudo quitar un jugador.', code: 'server' };
    }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: 'Ese jugador ya tiene partidos. Podés sacarlo del plantel, no borrarlo.',
        code: 'conflict',
      };
    }

    const { error } = await supabase
      .from('tournament_players')
      .delete()
      .eq('id', id)
      .eq('group_id', groupId);

    if (error) {
      console.error('[tournaments] delete player failed', error.message);
      return { ok: false, error: 'No se pudo quitar un jugador.', code: 'server' };
    }
  }

  for (const u of updates) {
    if (!u.id) continue;
    const patch: Record<string, unknown> = {};
    if (typeof u.displayName === 'string') patch.display_name = u.displayName.trim();
    if (typeof u.active === 'boolean') patch.active = u.active;
    if (typeof u.sortOrder === 'number') patch.sort_order = u.sortOrder;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase
      .from('tournament_players')
      .update(patch)
      .eq('id', u.id)
      .eq('group_id', groupId);

    if (error) {
      console.error('[tournaments] update player failed', error.message);
      return { ok: false, error: 'No se pudo actualizar un jugador.', code: 'server' };
    }
  }

  if (additions.length > 0) {
    const { data: existing } = await supabase
      .from('tournament_players')
      .select('sort_order')
      .eq('group_id', groupId)
      .order('sort_order', { ascending: false })
      .limit(1);

    let nextOrder = ((existing?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;
    const rows = additions.map((display_name) => ({
      group_id: groupId,
      display_name,
      sort_order: nextOrder++,
      active: true,
    }));

    const { error } = await supabase.from('tournament_players').insert(rows);
    if (error) {
      console.error('[tournaments] add players failed', error.message);
      return { ok: false, error: 'No se pudieron agregar jugadores.', code: 'server' };
    }
  }

  const { data: players, error: listError } = await supabase
    .from('tournament_players')
    .select('id, display_name, active, sort_order')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true });

  if (listError || !players) {
    return { ok: false, error: 'No se pudo listar jugadores.', code: 'server' };
  }

  return { ok: true, data: mapPlayers(players as PlayerRow[]) };
}
