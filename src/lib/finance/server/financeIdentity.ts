import { financeStateIdFromAppMetadata } from '@/lib/finance/accountAccess';

/**
 * Identidad de Foco en el servidor.
 * La clave service_role no sale de este módulo. El id del libro sale de
 * app_metadata (o de finance_profiles), nunca del body ni del query del navegador.
 */

export type FinanceIdentity = {
  userId: string;
  email: string;
  stateId: string;
};

export type FinanceAccessFailure = {
  ok: false;
  status: 401 | 403 | 503 | 502;
  error: string;
  code: 'unauthorized' | 'profile_missing' | 'supabase_not_configured' | 'auth_unavailable';
};

export type FinanceAccessSuccess = { ok: true; identity: FinanceIdentity };

type HeaderBag = Record<string, string | string[] | undefined> | undefined;

export function readRequestHeader(headers: HeaderBag, name: string): string {
  if (!headers) return '';
  const lower = name.toLowerCase();
  const raw = headers[lower] ?? headers[name];
  if (Array.isArray(raw)) return raw[0] ?? '';
  return typeof raw === 'string' ? raw : '';
}

export function readBearerToken(authorization: string | undefined): string {
  if (!authorization) return '';
  const match = authorization.match(/^Bearer\s+(\S+)/i);
  return match?.[1]?.trim() ?? '';
}

function readServerEnv(name: string): string {
  if (typeof window !== 'undefined') return '';
  const fromProcess = (process.env[name] ?? '').trim();
  if (fromProcess) return fromProcess;
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const fromImport = String(viteEnv?.[name] ?? '').trim();
  if (fromImport) process.env[name] = fromImport;
  return fromImport;
}

export function financeServiceConfig(): { url: string; key: string } | null {
  if (typeof window !== 'undefined') return null;
  const url = (
    readServerEnv('SUPABASE_URL') ||
    readServerEnv('PUBLIC_FINANCE_SUPABASE_URL') ||
    readServerEnv('FINANCE_SUPABASE_URL')
  ).replace(/\/$/, '');
  const key =
    readServerEnv('SUPABASE_SERVICE_ROLE_KEY') || readServerEnv('FINANCE_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return { url, key };
}

export function serviceRoleHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    ...extra,
  };
}

export async function resolveFinanceIdentity(
  authorizationHeader: string | undefined,
): Promise<FinanceAccessSuccess | FinanceAccessFailure> {
  const token = readBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: 'Tenés que iniciar sesión.', code: 'unauthorized' };
  }

  const config = financeServiceConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      error: 'Supabase no está configurado en el servidor.',
      code: 'supabase_not_configured',
    };
  }

  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (userResponse.status === 401 || userResponse.status === 403) {
    return { ok: false, status: 401, error: 'La sesión no es válida.', code: 'unauthorized' };
  }
  if (!userResponse.ok) {
    return {
      ok: false,
      status: 502,
      error: 'No se pudo verificar la sesión.',
      code: 'auth_unavailable',
    };
  }

  const user = (await userResponse.json()) as {
    id?: string;
    email?: string;
    app_metadata?: unknown;
  };
  if (!user.id || typeof user.id !== 'string') {
    return { ok: false, status: 401, error: 'La sesión no es válida.', code: 'unauthorized' };
  }

  const linkedStateId = financeStateIdFromAppMetadata(user.app_metadata);
  if (linkedStateId) {
    return {
      ok: true,
      identity: { userId: user.id, email: user.email || '', stateId: linkedStateId },
    };
  }

  const profileUrl =
    `${config.url}/rest/v1/finance_profiles?user_id=eq.${encodeURIComponent(user.id)}` +
    '&select=state_id,email&limit=1';
  const profileResponse = await fetch(profileUrl, {
    method: 'GET',
    headers: serviceRoleHeaders(config.key),
    cache: 'no-store',
  });
  if (!profileResponse.ok) {
    return {
      ok: false,
      status: 502,
      error: 'No se pudo consultar la cuenta.',
      code: 'auth_unavailable',
    };
  }

  const profiles = (await profileResponse.json()) as { state_id?: string; email?: string }[];
  const stateId = profiles?.[0]?.state_id?.trim();
  if (!stateId) {
    return {
      ok: false,
      status: 403,
      error: 'Esta cuenta todavía no tiene un libro vinculado.',
      code: 'profile_missing',
    };
  }

  return {
    ok: true,
    identity: {
      userId: user.id,
      email: profiles[0]?.email || user.email || '',
      stateId,
    },
  };
}
