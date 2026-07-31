/**
 * Auth del monitor: comparación en tiempo constante del Bearer secret.
 */

export function getFinanceMonitorSecret(): string {
  return (
    process.env.FINANCE_MONITOR_SECRET?.trim() ||
    process.env.FINANCE_CRON_SECRET?.trim() ||
    ''
  );
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Evitar early-return por longitud exacta filtrando con comparación dummy
    let acc = 0;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      acc |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return acc === 0 && a.length === b.length;
  }
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) return '';
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? '';
}

export function authorizeFinanceMonitor(params: {
  authorizationHeader?: string;
  /** Invocación UI (mismo trust model que ?whatsapp=test). */
  uiSource?: boolean;
}): { ok: true; via: 'secret' | 'ui' } | { ok: false; status: number; error: string } {
  const secret = getFinanceMonitorSecret();
  const token = extractBearerToken(params.authorizationHeader);

  if (token && secret && timingSafeEqualString(token, secret)) {
    return { ok: true, via: 'secret' };
  }

  if (params.uiSource) {
    return { ok: true, via: 'ui' };
  }

  if (!secret) {
    return { ok: false, status: 503, error: 'Monitor secret not configured' };
  }
  if (!token) {
    return { ok: false, status: 401, error: 'Missing authorization' };
  }
  return { ok: false, status: 401, error: 'Invalid authorization' };
}
