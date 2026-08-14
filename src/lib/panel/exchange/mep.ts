/**
 * Cotización MEP (ARS por 1 USD) — server-side only.
 *
 * Fuentes (en orden):
 * 1) Dolarito oficial si hay DOLARITO_AUTH_CLIENT
 *    GET {DOLARITO_API_BASE}/frontend/quotations  (configurable)
 * 2) Fallback público JSON: https://dolarapi.com/v1/dolares/bolsa
 *    (dólar bolsa ≈ MEP de mercado; estable, sin scraping)
 *
 * Compra vs venta:
 *   Si la fuente trae ambos, usamos VENTA (sell).
 *   Motivo: referencia de cobro = ARS necesarios por 1 USD al tipo
 *   de conversión hacia el mercado (lo que suele mostrarse al cotizar).
 *   No usamos blue / oficial / tarjeta / promedio inventado.
 */

export type MepQuote = {
  value: number;
  updatedAt: string;
  source: string;
  fetchedAt: string;
};

export type MepResult =
  | { ok: true; quote: MepQuote; fromCache: boolean }
  | { ok: false; error: string };

const TTL_MS = 10 * 60 * 1000; // 10 minutos

type CacheEntry = {
  quote: MepQuote;
  expiresAt: number;
};

let memoryCache: CacheEntry | null = null;

export function clearMepCacheForTests() {
  memoryCache = null;
}

export function mepAgeMinutes(quote: MepQuote, now = Date.now()): number {
  const t = Date.parse(quote.fetchedAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 60_000));
}

export function pickMepSellValue(input: {
  buy?: number | null;
  sell?: number | null;
  value?: number | null;
}): number | null {
  const sell = toPositive(input.sell);
  if (sell != null) return sell;
  const value = toPositive(input.value);
  if (value != null) return value;
  return toPositive(input.buy);
}

function toPositive(n: unknown): number | null {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || Number.isNaN(v) || !(v > 0) || !Number.isFinite(1 / v)) {
    return null;
  }
  return v;
}

/** Equivalente exacto (2 decimales) para mostrar USD × MEP. */
export function expectedArsExact(referenceUsd: number, mep: number): number {
  if (!(referenceUsd >= 0) || !(mep > 0)) return 0;
  return Math.round(referenceUsd * mep * 100) / 100;
}

/** Monto ARS sugerido en pesos enteros (redondeo). */
export function suggestedReceivedArs(referenceUsd: number, mep: number): number {
  if (!(referenceUsd >= 0) || !(mep > 0)) return 0;
  return Math.round(referenceUsd * mep);
}

export async function getMepQuote(options?: {
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<MepResult> {
  const now = Date.now();
  if (!options?.forceRefresh && memoryCache && memoryCache.expiresAt > now) {
    return { ok: true, quote: memoryCache.quote, fromCache: true };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const fetched = await fetchMepFromSources(fetchImpl);
  if (!fetched.ok) {
    return fetched;
  }

  memoryCache = {
    quote: fetched.quote,
    expiresAt: now + TTL_MS,
  };
  return { ok: true, quote: fetched.quote, fromCache: false };
}

async function fetchMepFromSources(
  fetchImpl: typeof fetch,
): Promise<{ ok: true; quote: MepQuote } | { ok: false; error: string }> {
  const dolarito = await tryDolarito(fetchImpl);
  if (dolarito.ok) return dolarito;

  const bolsa = await tryDolarapiBolsa(fetchImpl);
  if (bolsa.ok) return bolsa;

  return {
    ok: false,
    error: dolarito.error || bolsa.error || 'No se pudo obtener el MEP',
  };
}

async function tryDolarito(
  fetchImpl: typeof fetch,
): Promise<{ ok: true; quote: MepQuote } | { ok: false; error: string }> {
  const auth = (typeof process !== 'undefined' ? process.env.DOLARITO_AUTH_CLIENT : '')?.trim();
  if (!auth) {
    return { ok: false, error: 'DOLARITO_AUTH_CLIENT no configurado' };
  }

  const base = (
    (typeof process !== 'undefined' ? process.env.DOLARITO_API_BASE : '') ||
    'https://api.dolarito.ar/api'
  ).replace(/\/$/, '');
  const rawPath =
    (typeof process !== 'undefined' ? process.env.DOLARITO_MEP_PATH : '') ||
    '/frontend/quotations';
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  try {
    const res = await fetchImpl(`${base}${path}`, {
      headers: {
        Accept: 'application/json',
        'auth-client': auth,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Dolarito HTTP ${res.status}` };
    }
    const data = (await res.json()) as unknown;
    const parsed = parseDolaritoMep(data);
    if (!parsed) {
      return { ok: false, error: 'Dolarito: no se encontró cotización MEP/venta' };
    }
    return {
      ok: true,
      quote: {
        value: parsed.value,
        updatedAt: parsed.updatedAt,
        source: 'dolarito',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error Dolarito',
    };
  }
}

/**
 * Extrae MEP de payloads flexibles de Dolarito.
 * Prefiere nodos llamados mep/bolsa y el campo sell/venta.
 */
export function parseDolaritoMep(
  data: unknown,
): { value: number; updatedAt: string } | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;

  const candidates: unknown[] = [
    root.mep,
    root.bolsa,
    root.MEP,
    (root.quotations as Record<string, unknown> | undefined)?.mep,
    (root.dolar as Record<string, unknown> | undefined)?.mep,
    (root.financieros as Record<string, unknown> | undefined)?.mep,
  ];

  for (const node of candidates) {
    if (!node || typeof node !== 'object') continue;
    const o = node as Record<string, unknown>;
    const value = pickMepSellValue({
      buy: (o.buy ?? o.compra ?? o.purchase) as number | null,
      sell: (o.sell ?? o.venta ?? o.sale) as number | null,
      value: (o.value ?? o.price ?? o.avg) as number | null,
    });
    if (value == null) continue;
    const ts = o.timestamp ?? o.fechaActualizacion ?? o.updatedAt;
    const updatedAt =
      typeof ts === 'number'
        ? new Date(ts > 1e12 ? ts : ts * 1000).toISOString()
        : typeof ts === 'string' && ts
          ? ts
          : new Date().toISOString();
    return { value, updatedAt };
  }

  return null;
}

async function tryDolarapiBolsa(
  fetchImpl: typeof fetch,
): Promise<{ ok: true; quote: MepQuote } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl('https://dolarapi.com/v1/dolares/bolsa', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { ok: false, error: `dolarapi HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      compra?: number;
      venta?: number;
      fechaActualizacion?: string;
    };
    const value = pickMepSellValue({ buy: data.compra, sell: data.venta });
    if (value == null) {
      return { ok: false, error: 'dolarapi: venta inválida' };
    }
    return {
      ok: true,
      quote: {
        value,
        updatedAt: data.fechaActualizacion || new Date().toISOString(),
        source: 'dolarapi-bolsa',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error dolarapi',
    };
  }
}
