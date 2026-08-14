/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_FINANCE_SUPABASE_URL?: string;
  readonly PUBLIC_FINANCE_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  /** Server-only: clave de acceso al panel. */
  readonly PANEL_ACCESS_SECRET?: string;
  /** Server-only opcional: secreto para firmar la cookie de sesión. */
  readonly PANEL_SESSION_SECRET?: string;
  /** Server-only: URL del proyecto Supabase (panel). */
  readonly SUPABASE_URL?: string;
  /** Server-only: service_role. Nunca PUBLIC_. Nunca al browser. */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
