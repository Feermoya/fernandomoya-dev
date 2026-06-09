export type FinancePriceSource = 'google-finance' | 'yahoo-finance' | 'fallback' | 'missing';

export type FinancePrice = {
  ticker: string;
  exchange: string;
  price: number;
  currency?: string;
  source: FinancePriceSource;
  fetchedAt: string;
  url: string;
  logoUrl?: string;
  error?: string;
  /** Cambio absoluto diario si la fuente lo permite. */
  changeValue?: number;
  /** Cambio porcentual diario si la fuente lo permite. Ej: -3.12 */
  changePercent?: number;
  /** Texto o timeframe de referencia, ej. 1D. */
  changePeriod?: '1D' | 'UNKNOWN';
};

export type FinancePricesMap = Record<string, FinancePrice>;

export type FetchFinancePricesResult = {
  ok: boolean;
  prices: FinancePricesMap;
  fetchedAt: string;
  error?: string;
};

function normalizeTickers(tickers: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tickers) {
    const t = raw.trim().toUpperCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}

function toErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
  }
  return fallback;
}

export async function fetchFinancePrices(tickers: string[]): Promise<FetchFinancePricesResult> {
  const normalized = normalizeTickers(tickers);
  if (normalized.length === 0) {
    return { ok: true, prices: {}, fetchedAt: new Date().toISOString() };
  }

  const qs = encodeURIComponent(normalized.join(','));
  const url = `/api/finance-prices?tickers=${qs}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data: FetchFinancePricesResult & { code?: string; message?: string } = {
      ok: false,
      prices: {},
      fetchedAt: new Date().toISOString(),
    };

    try {
      data = (await res.json()) as typeof data;
    } catch {
      return {
        ok: false,
        prices: {},
        fetchedAt: new Date().toISOString(),
        error: res.ok ? 'Respuesta inválida del servidor' : `HTTP ${res.status}`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        prices: data.prices ?? {},
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        error: toErrorMessage(data.error ?? data.message ?? data, `HTTP ${res.status}`),
      };
    }

    return {
      ok: Boolean(data.ok),
      prices: data.prices ?? {},
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
      error: data.error ? toErrorMessage(data.error, 'No se pudieron leer precios') : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de red';
    return { ok: false, prices: {}, fetchedAt: new Date().toISOString(), error: msg };
  }
}

export function formatPricesFetchedTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatFinancePrice(value: number, currency = 'ARS'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}
