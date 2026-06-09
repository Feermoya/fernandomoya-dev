import { buildYahooFinanceQuoteUrl, toYahooCryptoSymbol } from './tickerPricing';

export { buildYahooFinanceQuoteUrl };

const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export function buildYahooChartUrl(ticker: string): string {
  const sym = toYahooCryptoSymbol(ticker);
  return `${YAHOO_CHART_BASE}/${encodeURIComponent(sym)}?interval=1d&range=1d`;
}

type YahooChartMeta = {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketPreviousClose?: number;
  currency?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
    error?: { description?: string };
  };
};

export type YahooChartQuote = {
  price: number;
  currency: string;
  changeValue?: number;
  changePercent?: number;
  changePeriod?: '1D' | 'UNKNOWN';
};

function computeDailyChange(
  price: number,
  previousClose: number | undefined,
): Pick<YahooChartQuote, 'changeValue' | 'changePercent' | 'changePeriod'> {
  if (typeof previousClose !== 'number' || !Number.isFinite(previousClose) || previousClose <= 0) {
    return {};
  }
  const changeValue = price - previousClose;
  const changePercent = (changeValue / previousClose) * 100;
  return { changeValue, changePercent, changePeriod: '1D' };
}

export function parseYahooChartPrice(payload: unknown): YahooChartQuote | null {
  const data = payload as YahooChartResponse;
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  const currency = typeof meta?.currency === 'string' && meta.currency ? meta.currency : 'USD';
  const previousClose =
    meta?.previousClose ?? meta?.chartPreviousClose ?? meta?.regularMarketPreviousClose;
  return {
    price,
    currency,
    ...computeDailyChange(price, previousClose),
  };
}

const LOGO_BLOCKLIST =
  /finance\/favicon|finance_v2_|favicon\.png|analytics-logo|yahoo-finance-logo/i;

export function normalizeSecureHttpsUrl(raw: string, base = 'https://www.google.com'): string | null {
  const decoded = raw
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/g, '&')
    .trim();

  if (!decoded || decoded.startsWith('data:') || decoded.startsWith('javascript:')) return null;

  let url = decoded;
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = `${base.replace(/\/$/, '')}${url}`;
  if (!url.startsWith('https://')) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Best-effort: Yahoo HTML suele bloquearse server-side; puede devolver null. */
export function parseYahooFinanceLogoUrl(html: string): string | null {
  const yimg = html.match(/https:\/\/s\.yimg\.com\/[^"'\\s]+\.(?:png|jpg|webp|svg)(?:\?[^"'\\s]*)?/i);
  if (yimg?.[0]) {
    const url = normalizeSecureHttpsUrl(yimg[0], 'https://es.finance.yahoo.com');
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }

  const imgs = [...html.matchAll(/<img[^>]+src="(https:\/\/[^"]+)"/gi)];
  for (const match of imgs) {
    const url = normalizeSecureHttpsUrl(match[1], 'https://es.finance.yahoo.com');
    if (url && !LOGO_BLOCKLIST.test(url) && /crypto|coin|logo|symbol/i.test(url)) return url;
  }

  return null;
}
