import {
  buildGoogleFinanceUrl,
  normalizeFinanceTickers,
  parseGoogleFinanceLogoUrl,
  parseGoogleFinancePrice,
} from './googleFinanceParse';
import type { FinancePrice } from './financePrices';
import { isCryptoTicker, getCryptoLogoFallbackUrl } from './tickerPricing';
import {
  buildYahooChartUrl,
  buildYahooFinanceQuoteUrl,
  parseYahooChartPrice,
  parseYahooFinanceLogoUrl,
} from './yahooFinanceParse';

export type FinancePricesApiResponse = {
  ok: boolean;
  prices: Record<string, FinancePrice>;
  fetchedAt: string;
  error?: string;
};

const FETCH_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/json',
  'Accept-Language': 'es-AR,es;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (compatible; FocoFinanciero/1.0; +https://www.fermoyadev.com.ar)',
};

export const FINANCE_PRICES_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
  'Content-Type': 'application/json; charset=utf-8',
};

function missingPrice(
  ticker: string,
  exchange: string,
  url: string,
  fetchedAt: string,
  error: string,
  currency = 'ARS',
): FinancePrice {
  return {
    ticker,
    exchange,
    price: 0,
    currency,
    source: 'missing',
    fetchedAt,
    url,
    error,
  };
}

async function fetchGoogleBcbaPrice(ticker: string, fetchedAt: string): Promise<FinancePrice> {
  const url = buildGoogleFinanceUrl(ticker, 'BCBA');

  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!res.ok) {
      return missingPrice(ticker, 'BCBA', url, fetchedAt, `HTTP ${res.status}`);
    }

    const html = await res.text();
    const price = parseGoogleFinancePrice(html);
    const logoUrl = parseGoogleFinanceLogoUrl(html) ?? undefined;

    if (price === null || price <= 0) {
      return {
        ...missingPrice(ticker, 'BCBA', url, fetchedAt, 'No se pudo leer el precio'),
        logoUrl,
      };
    }

    return {
      ticker,
      exchange: 'BCBA',
      price,
      currency: 'ARS',
      source: 'google-finance',
      fetchedAt,
      url,
      logoUrl,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al consultar Google Finance';
    return missingPrice(ticker, 'BCBA', url, fetchedAt, msg);
  }
}

async function fetchYahooCryptoPrice(ticker: string, fetchedAt: string): Promise<FinancePrice> {
  const url = buildYahooFinanceQuoteUrl(ticker);
  const chartUrl = buildYahooChartUrl(ticker);

  try {
    const res = await fetch(chartUrl, {
      headers: {
        ...FETCH_HEADERS,
        Accept: 'application/json',
        Referer: url,
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return missingPrice(ticker, 'USD', url, fetchedAt, `HTTP ${res.status}`, 'USD');
    }

    const payload = (await res.json()) as unknown;
    const parsed = parseYahooChartPrice(payload);

    let logoUrl: string | undefined;
    try {
      const htmlRes = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        logoUrl = parseYahooFinanceLogoUrl(html) ?? undefined;
      }
    } catch {
      // Logo opcional: no afecta el precio.
    }

    logoUrl ??= getCryptoLogoFallbackUrl(ticker);

    if (!parsed) {
      return {
        ...missingPrice(ticker, 'USD', url, fetchedAt, 'No se pudo leer el precio', 'USD'),
        logoUrl,
      };
    }

    return {
      ticker,
      exchange: 'USD',
      price: parsed.price,
      currency: parsed.currency,
      source: 'yahoo-finance',
      fetchedAt,
      url,
      logoUrl,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al consultar Yahoo Finance';
    return missingPrice(ticker, 'USD', url, fetchedAt, msg, 'USD');
  }
}

async function fetchTickerPrice(ticker: string, fetchedAt: string): Promise<FinancePrice> {
  if (isCryptoTicker(ticker)) {
    return fetchYahooCryptoPrice(ticker, fetchedAt);
  }
  return fetchGoogleBcbaPrice(ticker, fetchedAt);
}

export async function buildFinancePricesResponse(rawTickers: string): Promise<FinancePricesApiResponse> {
  const tickers = normalizeFinanceTickers(rawTickers);
  const fetchedAt = new Date().toISOString();

  if (tickers.length === 0) {
    return {
      ok: false,
      prices: {},
      fetchedAt,
      error: 'Parámetro tickers vacío',
    };
  }

  const results = await Promise.all(tickers.map((ticker) => fetchTickerPrice(ticker, fetchedAt)));

  const prices: Record<string, FinancePrice> = {};
  for (const row of results) {
    prices[row.ticker] = row;
  }

  const found = results.filter((r) => r.price > 0 && r.source !== 'missing').length;

  return {
    ok: found > 0,
    prices,
    fetchedAt,
    error: found === 0 ? 'No se pudieron leer precios' : undefined,
  };
}
