import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export const TOURNAMENT_ADMIN_COOKIE = 'fm_tg_admin';

const SCRYPT_KEYLEN = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function readServerEnv(name: string): string {
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

/** Secreto para firmar cookies; no se expone al cliente. */
export function getTournamentsSessionSecret(): string {
  const dedicated = readServerEnv('TOURNAMENTS_SESSION_SECRET');
  if (dedicated) return dedicated;
  // Misma resolución que supabase/admin (TOURNAMENTS_* → SUPABASE_*).
  const url =
    readServerEnv('TOURNAMENTS_SUPABASE_URL') ||
    readServerEnv('SUPABASE_URL') ||
    readServerEnv('PUBLIC_FINANCE_SUPABASE_URL');
  const key =
    readServerEnv('TOURNAMENTS_SUPABASE_SERVICE_ROLE_KEY') ||
    readServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return '';
  return createHash('sha256').update(`tg-session:${url}:${key.slice(0, 24)}`).digest('hex');
}

function packScryptHash(salt: Buffer, hash: Buffer): string {
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function parseScryptHash(stored: string): { salt: Buffer; hash: Buffer } | null {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !parts[1] || !parts[2]) {
    return null;
  }
  try {
    return {
      salt: Buffer.from(parts[1], 'base64url'),
      hash: Buffer.from(parts[2], 'base64url'),
    };
  } catch {
    return null;
  }
}

export function hashSecret(raw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(raw, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return packScryptHash(salt, hash);
}

export function verifySecret(raw: string, stored: string): boolean {
  if (!raw || !stored) return false;
  const parsed = parseScryptHash(stored);
  if (!parsed) return false;
  const candidate = scryptSync(raw, parsed.salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  if (candidate.length !== parsed.hash.length) return false;
  return timingSafeEqual(candidate, parsed.hash);
}

export type AdminCookiePayload = {
  v: 1;
  gid: string;
  ver: number;
  iat: number;
};

export function createAdminSessionToken(groupId: string, credentialVersion: number): string {
  const secret = getTournamentsSessionSecret();
  if (!secret) throw new Error('Tournaments session secret is not configured');
  const payload: AdminCookiePayload = {
    v: 1,
    gid: groupId,
    ver: credentialVersion,
    iat: Date.now(),
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string | undefined | null,
): AdminCookiePayload | null {
  if (!token) return null;
  const secret = getTournamentsSessionSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const raw = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminCookiePayload;
    if (raw.v !== 1 || typeof raw.gid !== 'string' || typeof raw.ver !== 'number') return null;
    if (typeof raw.iat !== 'number') return null;
    const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
    if (Date.now() - raw.iat > maxAgeMs) return null;
    return raw;
  } catch {
    return null;
  }
}

export function tournamentAdminCookieOptions(secure: boolean) {
  return {
    path: '/torneos',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: 90 * 24 * 60 * 60,
  };
}

/** Hash de IP para rate-limit (nunca guardar IP en claro). */
export function hashIp(ip: string): string {
  const pepper = getTournamentsSessionSecret() || 'tg-ip-fallback';
  return createHash('sha256').update(`tg-ip:${pepper}:${ip}`).digest('hex');
}
