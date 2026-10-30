import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente admin de torneos (service_role).
 * SOLO importar desde código server. Nunca desde islas React del browser.
 */

function readEnv(name: string): string {
  const fromProcess =
    typeof process !== 'undefined' ? (process.env[name] ?? '').trim() : '';
  if (fromProcess) return fromProcess;

  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const fromImport = String(viteEnv?.[name] ?? '').trim();
  if (fromImport && typeof process !== 'undefined') {
    process.env[name] = fromImport;
  }
  return fromImport;
}

/**
 * Mismo proyecto que el panel/Foco por defecto.
 * `TOURNAMENTS_*` solo si querés aislar; si no, reutiliza `SUPABASE_*`.
 */
export function getTournamentsSupabaseUrl(): string {
  const url =
    readEnv('TOURNAMENTS_SUPABASE_URL') ||
    readEnv('SUPABASE_URL') ||
    readEnv('PUBLIC_FINANCE_SUPABASE_URL');
  return url.replace(/\/$/, '');
}

export function getTournamentsServiceRoleKey(): string {
  return (
    readEnv('TOURNAMENTS_SUPABASE_SERVICE_ROLE_KEY') ||
    readEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

export function isTournamentsSupabaseConfigured(): boolean {
  return Boolean(getTournamentsSupabaseUrl() && getTournamentsServiceRoleKey());
}

let cached: SupabaseClient | null = null;

export function createTournamentsSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createTournamentsSupabaseAdmin no puede usarse en el browser');
  }

  const url = getTournamentsSupabaseUrl();
  const key = getTournamentsServiceRoleKey();
  if (!url || !key) {
    throw new Error('Tournaments data access is not configured');
  }

  if (cached) return cached;

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
