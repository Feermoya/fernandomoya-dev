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

export async function fetchFinancePrices(tickers: string[]): Promise<FetchFinancePricesResult> {
  const normalized = normalizeTickers(tickers);
  if (normalized.length === 0) {
    return { ok: true, prices: {}, fetchedAt: new Date().toISOString() };
  }

  const qs = encodeURIComponent(normalized.join(','));
  const url = `/api/finance-prices?tickers=${qs}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = (await res.json()) as FetchFinancePricesResult;

    if (!res.ok) {
      return {
        ok: false,
        prices: data.prices ?? {},
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        error: data.error ?? `HTTP ${res.status}`,
      };
    }

    return {
      ok: Boolean(data.ok),
      prices: data.prices ?? {},
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
      error: data.error,
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
