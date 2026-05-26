/** Tickers de cripto consultados en Yahoo Finance (USD). */

export const CRYPTO_TICKERS = new Set([
  'BTC',
  'ETH',
  'SOL',
  'ADA',
  'XRP',
  'DOGE',
  'DOT',
  'AVAX',
  'MATIC',
  'LINK',
  'UNI',
  'LTC',
  'BNB',
  'SHIB',
  'TRX',
  'XLM',
  'ATOM',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'BCH',
  'ETC',
  'FIL',
  'ICP',
  'HBAR',
  'VET',
  'ALGO',
  'AAVE',
  'MKR',
  'CRO',
  'USDT',
  'USDC',
]);

export function isCryptoTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (t.endsWith('-USD')) return true;
  return CRYPTO_TICKERS.has(t);
}

export function toYahooCryptoSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (t.includes('-')) return t;
  return `${t}-USD`;
}

export function buildYahooFinanceQuoteUrl(ticker: string): string {
  const sym = toYahooCryptoSymbol(ticker);
  return `https://es.finance.yahoo.com/quote/${encodeURIComponent(sym)}/`;
}
