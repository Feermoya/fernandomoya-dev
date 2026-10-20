import type { AstroCookies } from 'astro';
import {
  createTournamentsSupabaseAdmin,
  isTournamentsSupabaseConfigured,
} from '@/lib/tournaments/supabase/admin';
import {
  requireTournamentAdmin,
  type TournamentAdminOk,
} from '@/lib/tournaments/session';
import type { SupabaseClient } from '@supabase/supabase-js';

export function tournamentJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export type TournamentDataAccess =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; reason: 'supabase_config'; message: string };

export function requireTournamentsDataAccess(): TournamentDataAccess {
  if (!isTournamentsSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'supabase_config',
      message:
        'Torneos no está configurado. Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (las del panel).',
    };
  }
  try {
    return { ok: true, supabase: createTournamentsSupabaseAdmin() };
  } catch (err) {
    console.error(
      '[tournaments] supabase admin init failed',
      err instanceof Error ? err.message : 'unknown',
    );
    return {
      ok: false,
      reason: 'supabase_config',
      message: 'No se pudo conectar con los datos. Probá de nuevo más tarde.',
    };
  }
}

export function requireTournamentAdminApi(
  cookies: AstroCookies,
  groupId: string,
  credentialVersion: number,
): TournamentAdminOk | { ok: false; reason: 'unauthenticated'; message: string } {
  return requireTournamentAdmin(cookies, groupId, credentialVersion);
}

export function writeStatus(code?: string): number {
  if (code === 'not_found') return 404;
  if (code === 'validation') return 400;
  if (code === 'unauthorized') return 401;
  if (code === 'forbidden') return 403;
  if (code === 'rate_limited') return 429;
  if (code === 'conflict') return 409;
  return 500;
}
