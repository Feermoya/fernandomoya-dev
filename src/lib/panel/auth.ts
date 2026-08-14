import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const PANEL_PATHS = {
  root: '/panel',
  login: '/panel/login',
  loginAction: '/panel/auth/login',
  signout: '/panel/auth/signout',
} as const;

export const PANEL_SESSION_COOKIE = 'fm_panel_session';

export function isPanelPath(pathname: string): boolean {
  return pathname === '/panel' || pathname.startsWith('/panel/');
}

/** Rutas accesibles sin sesión. */
export function isPanelPublicAuthPath(pathname: string): boolean {
  return (
    pathname === PANEL_PATHS.login ||
    pathname === PANEL_PATHS.loginAction ||
    pathname === PANEL_PATHS.signout
  );
}

function readServerEnv(name: 'PANEL_ACCESS_SECRET' | 'PANEL_SESSION_SECRET'): string {
  const fromProcess = typeof process !== 'undefined' ? process.env[name]?.trim() : undefined;
  const fromImport = (import.meta.env as Record<string, string | undefined>)[name]?.trim();
  return (fromProcess || fromImport || '').trim();
}

export function getPanelAccessSecret(): string {
  return readServerEnv('PANEL_ACCESS_SECRET');
}

/** Firma de cookie; si no hay SESSION_SECRET, se deriva del access secret. */
export function getPanelSessionSecret(): string {
  const dedicated = readServerEnv('PANEL_SESSION_SECRET');
  if (dedicated) return dedicated;
  const access = getPanelAccessSecret();
  if (!access) return '';
  return createHash('sha256').update(`panel-session:${access}`).digest('hex');
}

export function isPanelAuthConfigured(): boolean {
  return Boolean(getPanelAccessSecret());
}

export function verifyPanelPin(candidate: string): boolean {
  const expected = getPanelAccessSecret();
  if (!expected || !candidate) return false;
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Token de sesión firmado (cookie de pestaña: sin maxAge). */
export function createPanelSessionToken(): string {
  const secret = getPanelSessionSecret();
  const payload = Buffer.from(JSON.stringify({ v: 1, iat: Date.now() }), 'utf8').toString(
    'base64url',
  );
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyPanelSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getPanelSessionSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  try {
    const raw = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      iat?: number;
    };
    if (raw.v !== 1 || typeof raw.iat !== 'number') return false;
    // Tope duro de 14 días por si la cookie de sesión no se limpia.
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    if (Date.now() - raw.iat > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}

export function panelSessionCookieOptions(secure: boolean) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    // Sin maxAge/expires → cookie de sesión (se corta al cerrar el browser).
  };
}
