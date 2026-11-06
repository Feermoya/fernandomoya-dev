/**
 * Cotizaciones y catálogo Spot de Binance, sin credenciales.
 * Las cotizaciones USDT se muestran como referencia USD; nunca se usan
 * para convertir automáticamente un gasto ARS.
 */
import type { FinancePrice } from './financePrices';

const BASE = 'https://data-api.binance.vision';
const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana',
  XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', LINK: 'Chainlink',
  AVAX: 'Avalanche', TRX: 'TRON', DOT: 'Polkadot', LTC: 'Litecoin',
  PEPE: 'Pepe', SHIB: 'Shiba Inu', SUI: 'Sui', TON: 'Toncoin',
  UNI: 'Uniswap', ATOM: 'Cosmos', AAVE: 'Aave', NEAR: 'NEAR Protocol',
  ARB: 'Arbitrum', OP: 'Optimism', BCH: 'Bitcoin Cash', USDC: 'USD Coin',
};
const POPULAR = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'SUI', 'PEPE', 'LINK'];
type BinancePair = { symbol?: string; baseAsset?: string; quoteAsset?: string; status?: string; isSpotTradingAllowed?: boolean };
let catalogCache: { expires: number; symbols: string[] } | null = null;
let inflight: Promise<string[]> | null = null;

async function loadSpotCatalog(): Promise<string[]> {
  if (catalogCache && catalogCache.expires > Date.now()) return catalogCache.symbols;
  if (!inflight) {
    inflight = (async () => {
      const response = await fetch(`${BASE}/api/v3/exchangeInfo?permissions=SPOT`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);
      const data = (await response.json()) as { symbols?: BinancePair[] };
      const symbols = [...new Set((data.symbols ?? [])
        .filter((item) => item.quoteAsset === 'USDT' && item.status === 'TRADING'
          && item.isSpotTradingAllowed !== false && /^[A-Z0-9]{2,20}$/.test(item.baseAsset ?? ''))
        .map((item) => item.baseAsset as string))];
      if (!symbols.length) throw new Error('Catálogo de Binance sin mercados');
      catalogCache = { symbols, expires: Date.now() + 30 * 60 * 1000 };
      return symbols;
    })().finally(() => { inflight = null; });
  }
  return inflight;
}

export async function searchBinanceCrypto(query: string, limit = 8): Promise<{ symbol: string; name: string }[]> {
  const q = query.trim().toUpperCase();
  if (q.length > 35) return [];
  let symbols: string[];
  try {
    symbols = await loadSpotCatalog();
  } catch {
    // La búsqueda sigue disponible para las monedas comunes si Binance falla.
    symbols = POPULAR;
  }
  const filtered = symbols.filter((symbol) =>
    !q || symbol.includes(q) || (COIN_NAMES[symbol] ?? '').toUpperCase().includes(q));
  filtered.sort((a, b) => {
    const score = (s: string) => (s === q ? -100 : s.startsWith(q) ? -40 : 0)
      + (POPULAR.includes(s) ? POPULAR.indexOf(s) - 20 : 0);
    return score(a) - score(b) || a.localeCompare(b);
  });
  return filtered.slice(0, Math.max(1, Math.min(12, limit))).map((symbol) => ({
    symbol, name: COIN_NAMES[symbol] ?? symbol,
  }));
}

export async function fetchBinanceCryptoPrice(ticker: string, fetchedAt: string): Promise<FinancePrice | null> {
  const base = ticker.trim().toUpperCase().replace(/-USD$/, '');
  if (!/^[A-Z0-9]{2,20}$/.test(base) || base === 'USDT') return null;
  const pair = `${base}USDT`;
  try {
    const response = await fetch(`${BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(pair)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { symbol?: string; price?: string };
    const price = Number(data.price);
    if (data.symbol !== pair || !Number.isFinite(price) || price <= 0) return null;
    return {
      ticker, price, currency: 'USD', exchange: 'Binance Spot (USDT)',
      source: 'binance', fetchedAt,
      url: `https://www.binance.com/en/trade/${base}_USDT`,
    };
  } catch {
    return null;
  }
}
