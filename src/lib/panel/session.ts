import type { AstroCookies } from 'astro';
import {
  PANEL_PATHS,
  PANEL_SESSION_COOKIE,
  verifyPanelSessionToken,
} from '@/lib/panel/auth';
import {
  createPanelSupabaseAdmin,
  isPanelSupabaseAdminConfigured,
} from '@/lib/panel/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PanelSessionOk = {
  ok: true;
  supabase: SupabaseClient;
};

export type PanelSessionFail = {
  ok: false;
  reason: 'unauthenticated' | 'supabase_config';
  message: string;
};

export type PanelSessionResult = PanelSessionOk | PanelSessionFail;

/**
 * Valida cookie del panel + cliente admin configurado.
 * Middleware ya redirige sin sesión; esto es defensa en profundidad antes de leer datos.
 */
export function requirePanelDataAccess(cookies: AstroCookies): PanelSessionResult {
  const token = cookies.get(PANEL_SESSION_COOKIE)?.value;
  if (!verifyPanelSessionToken(token)) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'Sesión inválida',
    };
  }

  if (!isPanelSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: 'supabase_config',
      message: 'No se pudo conectar con los datos. Probá de nuevo más tarde.',
    };
  }

  try {
    return { ok: true, supabase: createPanelSupabaseAdmin() };
  } catch (err) {
    console.error('[panel] supabase admin init failed', err instanceof Error ? err.message : 'unknown');
    return {
      ok: false,
      reason: 'supabase_config',
      message: 'No se pudo inicializar el acceso a datos. Probá de nuevo más tarde.',
    };
  }
}

export function panelLoginRedirectUrl(): string {
  return PANEL_PATHS.login;
}
