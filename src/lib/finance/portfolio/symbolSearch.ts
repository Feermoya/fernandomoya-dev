import type { FinanceSymbolSearchResult } from '@/lib/finance/portfolio/types';

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
  exchDisp?: string;
  currency?: string;
};

type YahooSearchResponse = {
  quotes?: YahooSearchQuote[];
};

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (compatible; FocoFinanciero/1.0; +https://www.fermoyadev.com.ar)',
};

function mapQuote(q: YahooSearchQuote): FinanceSymbolSearchResult | null {
  const symbol = (q.symbol ?? '').trim().toUpperCase();
  if (!symbol) return null;
  const name = (q.longname || q.shortname || symbol).trim();
  return {
    symbol,
    name,
    exchange: q.exchDisp || q.exchange,
    type: q.typeDisp || q.quoteType,
    currency: q.currency,
    market: q.exchange,
  };
}

/**
 * Búsqueda de símbolos vía endpoint no oficial de Yahoo Finance (sin API key).
 * Limitaciones: rate-limit, sin SLA, cobertura variable para BCBA.
 */
export async function searchFinanceSymbols(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<{ ok: boolean; results: FinanceSymbolSearchResult[]; error?: string }> {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, results: [] };
  }

  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 8);
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q', q);
  url.searchParams.set('quotesCount', String(limit));
  url.searchParams.set('newsCount', '0');
  url.searchParams.set('listsCount', '0');
  url.searchParams.set('enableFuzzyQuery', 'false');

  try {
    const res = await fetch(url.toString(), {
      headers: FETCH_HEADERS,
      signal: opts?.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      return {
        ok: false,
        results: [],
        error: res.status === 429 ? 'Demasiadas consultas. Probá en unos segundos.' : `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as YahooSearchResponse;
    const results: FinanceSymbolSearchResult[] = [];
    const seen = new Set<string>();
    for (const quote of data.quotes ?? []) {
      const mapped = mapQuote(quote);
      if (!mapped || seen.has(mapped.symbol)) continue;
      seen.add(mapped.symbol);
      results.push(mapped);
      if (results.length >= limit) break;
    }
    return { ok: true, results };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, results: [], error: 'aborted' };
    }
    return {
      ok: false,
      results: [],
      error: e instanceof Error ? e.message : 'Error de búsqueda',
    };
  }
}
