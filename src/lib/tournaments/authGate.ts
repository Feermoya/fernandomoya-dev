import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCredentialsByGroupId,
  getGroupByPublicId,
} from '@/lib/tournaments/repositories/groups';
import { requireTournamentAdmin } from '@/lib/tournaments/session';
import type { TournamentGroup } from '@/lib/tournaments/types';

export type AdminGateOk = {
  ok: true;
  supabase: SupabaseClient;
  group: TournamentGroup;
  credentialVersion: number;
};

export type AdminGateFail = {
  ok: false;
  status: number;
  error: string;
};

export async function requireAdminByPublicId(
  supabase: SupabaseClient,
  cookies: AstroCookies,
  publicId: string,
): Promise<AdminGateOk | AdminGateFail> {
  const groupResult = await getGroupByPublicId(supabase, publicId);
  if (!groupResult.ok) {
    return {
      ok: false,
      status: groupResult.code === 'not_found' ? 404 : 500,
      error: groupResult.error,
    };
  }

  const creds = await getCredentialsByGroupId(supabase, groupResult.data.group.id);
  if (!creds.ok) {
    return {
      ok: false,
      status: creds.code === 'not_found' ? 404 : 500,
      error: creds.error,
    };
  }

  const admin = requireTournamentAdmin(
    cookies,
    groupResult.data.group.id,
    creds.data.version,
  );
  if (!admin.ok) {
    return { ok: false, status: 401, error: admin.message };
  }

  return {
    ok: true,
    supabase,
    group: groupResult.data.group,
    credentialVersion: creds.data.version,
  };
}
