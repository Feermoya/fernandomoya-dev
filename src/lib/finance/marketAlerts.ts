import { getEntryTicker } from '@/lib/finance/entryTicker';
import type { FinancePricesMap } from '@/lib/finance/financePrices';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import type { FinanceEntry } from '@/lib/finance/types';

export type MarketAlertSeverity = 'opportunity' | 'positive' | 'warning' | 'neutral';

export type MarketAlertKind =
  | 'daily-drop'
  | 'daily-rise'
  | 'loss-since-buy'
  | 'gain-since-buy'
  | 'neutral';

export type MarketAlert = {
  id: string;
  ticker: string;
  title: string;
  detail: string;
  severity: MarketAlertSeverity;
  kind: MarketAlertKind;
  currentPrice?: number;
  currentCurrency?: string;
  buyPrice?: number;
  buyCurrency?: string;
  changePercent?: number;
  source?: string;
};

/** Huella anti-spam para WhatsApp / cron. */
export function marketAlertFingerprint(alert: Pick<MarketAlert, 'kind' | 'ticker'>): string {
  return `${alert.kind}:${alert.ticker.toUpperCase()}`;
}

const SEVERITY_RANK: Record<MarketAlertSeverity, number> = {
  opportunity: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

const DEFAULT_MIN_DAILY_DROP = 3;
const DEFAULT_MIN_GAIN_SINCE_BUY = 8;
const DEFAULT_MIN_LOSS_SINCE_BUY = 5;

export function getTrackedTickersFromEntries(entries: FinanceEntry[]): string[] {
  return getTrackedTickersFromPortfolio(entries, []);
}

export function getLastBuyEntryForTicker(
  entries: FinanceEntry[],
  ticker: string,
): FinanceEntry | undefined {
  const norm = ticker.toUpperCase();
  let best: FinanceEntry | undefined;

  for (const entry of entries) {
    if (entry.type !== 'investment') continue;
    if (getEntryTicker(entry) !== norm) continue;
    if (!best || entry.createdAt > best.createdAt) best = entry;
  }

  return best;
}

/** Referencia de compra: última entry con precio, o holding histórico (misma moneda que cotización). */
export function getBuyReferenceForTicker(params: {
  entries: FinanceEntry[];
  holdings?: FinancePortfolioHolding[];
  ticker: string;
  currentCurrency?: string;
}): { buyPrice: number; buyCurrency: string } | null {
  const { entries, holdings = [], ticker, currentCurrency } = params;
  const lastBuy = getLastBuyEntryForTicker(entries, ticker);
  if (
    lastBuy &&
    typeof lastBuy.buyPrice === 'number' &&
    lastBuy.buyPrice > 0 &&
    currenciesMatch(lastBuy.buyCurrency, currentCurrency)
  ) {
    return {
      buyPrice: lastBuy.buyPrice,
      buyCurrency: (lastBuy.buyCurrency ?? 'ARS').toUpperCase(),
    };
  }

  const norm = ticker.toUpperCase();
  const matching = holdings.filter((h) => h.ticker.toUpperCase() === norm);
  if (matching.length === 0) return null;

  if (currentCurrency) {
    const sameFx = matching.filter((h) =>
      currenciesMatch(h.currency, currentCurrency),
    );
    if (sameFx.length === 0) return null;
    let qty = 0;
    let cost = 0;
    for (const h of sameFx) {
      qty += h.quantity;
      cost += h.quantity * h.averagePurchasePrice;
    }
    if (!(qty > 0)) return null;
    return {
      buyPrice: cost / qty,
      buyCurrency: currentCurrency.toUpperCase(),
    };
  }

  const currencies = [...new Set(matching.map((h) => h.currency.toUpperCase()))];
  if (currencies.length !== 1) return null;
  let qty = 0;
  let cost = 0;
  for (const h of matching) {
    qty += h.quantity;
    cost += h.quantity * h.averagePurchasePrice;
  }
  if (!(qty > 0)) return null;
  return { buyPrice: cost / qty, buyCurrency: currencies[0] };
}

function currenciesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.toUpperCase() === b.toUpperCase();
}

export function buildMarketAlerts(params: {
  entries: FinanceEntry[];
  prices: FinancePricesMap;
  holdings?: FinancePortfolioHolding[];
  minDailyDropPercent?: number;
  minGainSinceBuyPercent?: number;
  minLossSinceBuyPercent?: number;
}): MarketAlert[] {
  const {
    entries,
    prices,
    holdings = [],
    minDailyDropPercent = DEFAULT_MIN_DAILY_DROP,
    minGainSinceBuyPercent = DEFAULT_MIN_GAIN_SINCE_BUY,
    minLossSinceBuyPercent = DEFAULT_MIN_LOSS_SINCE_BUY,
  } = params;

  const tickers = getTrackedTickersFromPortfolio(entries, holdings);
  const alerts: MarketAlert[] = [];
  const seen = new Set<string>();

  const push = (alert: Omit<MarketAlert, 'id'>) => {
    const key = marketAlertFingerprint(alert);
    if (seen.has(key)) return;
    seen.add(key);
    alerts.push({ ...alert, id: key });
  };

  for (const ticker of tickers) {
    const priceRow = prices[ticker];
    const currentPrice = priceRow?.price;
    const currentCurrency = priceRow?.currency;
    const changePercent = priceRow?.changePercent;
    const source = priceRow?.source;

    if (typeof changePercent === 'number' && Number.isFinite(changePercent)) {
      if (changePercent <= -minDailyDropPercent) {
        push({
          ticker,
          kind: 'daily-drop',
          severity: 'opportunity',
          title: `${ticker} bajó ${Math.abs(changePercent).toFixed(1)}% hoy`,
          detail: 'Puede ser una oportunidad para revisar.',
          currentPrice,
          currentCurrency,
          changePercent,
          source,
        });
      } else if (changePercent >= minDailyDropPercent) {
        push({
          ticker,
          kind: 'daily-rise',
          severity: 'positive',
          title: `${ticker} subió ${changePercent.toFixed(1)}% hoy`,
          detail: 'Revisá si sigue alineado con tu estrategia.',
          currentPrice,
          currentCurrency,
          changePercent,
          source,
        });
      }
    }

    const buyRef = getBuyReferenceForTicker({
      entries,
      holdings,
      ticker,
      currentCurrency,
    });

    if (
      buyRef &&
      typeof currentPrice === 'number' &&
      currentPrice > 0
    ) {
      const { buyPrice, buyCurrency } = buyRef;
      const deltaFromBuy = ((currentPrice - buyPrice) / buyPrice) * 100;

      if (deltaFromBuy <= -minLossSinceBuyPercent) {
        push({
          ticker,
          kind: 'loss-since-buy',
          severity: 'opportunity',
          title: `${ticker} está ${Math.abs(deltaFromBuy).toFixed(1)}% abajo de tu compra`,
          detail: 'Podés revisar si querés promediar o esperar.',
          currentPrice,
          currentCurrency,
          buyPrice,
          buyCurrency,
          changePercent: deltaFromBuy,
          source,
        });
      } else if (deltaFromBuy >= minGainSinceBuyPercent) {
        push({
          ticker,
          kind: 'gain-since-buy',
          severity: 'positive',
          title: `${ticker} está ${deltaFromBuy.toFixed(1)}% arriba de tu compra`,
          detail: 'Buen avance desde tu precio registrado.',
          currentPrice,
          currentCurrency,
          buyPrice,
          buyCurrency,
          changePercent: deltaFromBuy,
          source,
        });
      }
    }
  }

  if (alerts.length === 0 && tickers.length > 0) {
    alerts.push({
      id: 'neutral:none',
      ticker: tickers[0],
      kind: 'neutral',
      severity: 'neutral',
      title: 'Sin movimientos fuertes',
      detail: 'No hay bajas o subas relevantes en tus activos seguidos.',
    });
  }

  return alerts
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 4);
}
