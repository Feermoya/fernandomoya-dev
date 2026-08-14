import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente admin del panel (service_role).
 * SOLO importar desde código server (middleware, endpoints `prerender=false`, scripts).
 * Nunca desde islas React del browser.
 */

function readEnv(name: string): string {
  // Misma estrategia que auth.ts: process.env (prod) → import.meta.env (Vite) + sync.
  const fromProcess =
    typeof process !== 'undefined' ? (process.env[name] ?? '').trim() : '';
  if (fromProcess) return fromProcess;

  const fromImport = String(
    (import.meta.env as Record<string, string | undefined>)[name] ?? '',
  ).trim();
  if (fromImport && typeof process !== 'undefined') {
    process.env[name] = fromImport;
  }
  return fromImport;
}

export function getPanelSupabaseUrl(): string {
  // Preferir SUPABASE_URL (server-only). Fallback al proyecto Foco si falta.
  const url =
    readEnv('SUPABASE_URL') ||
    readEnv('PUBLIC_FINANCE_SUPABASE_URL');
  return url.replace(/\/$/, '');
}

export function getPanelServiceRoleKey(): string {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function isPanelSupabaseAdminConfigured(): boolean {
  return Boolean(getPanelSupabaseUrl() && getPanelServiceRoleKey());
}

let cached: SupabaseClient | null = null;

/**
 * Supabase con service_role: bypasea RLS.
 * Las tablas clients/charges/payments están cerradas a anon.
 * Quien llama debe haber validado antes la sesión del panel (PIN + cookie).
 */
export function createPanelSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createPanelSupabaseAdmin no puede usarse en el browser');
  }

  const url = getPanelSupabaseUrl();
  const key = getPanelServiceRoleKey();
  if (!url || !key) {
    throw new Error('Panel data access is not configured');
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
