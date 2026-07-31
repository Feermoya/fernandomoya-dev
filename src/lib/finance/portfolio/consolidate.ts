import { getEntryTicker } from '@/lib/finance/entryTicker';
import type { FinanceEntry } from '@/lib/finance/types';
import type {
  ConsolidatedPosition,
  FinancePortfolioHolding,
} from '@/lib/finance/portfolio/types';

type Bucket = {
  ticker: string;
  quantityFromHoldings: number;
  quantityFromEntries: number;
  hasEntryUnits: boolean;
  hasHoldings: boolean;
  hasEntries: boolean;
  investedAmountByCurrency: Record<string, number>;
  weightedCostByCurrency: Record<string, { qty: number; cost: number }>;
  displayName?: string;
  limitations: string[];
};

/**
 * Consolida entries de inversión + cartera inicial por ticker.
 * No inventa cantidades si solo hay monto sin estimatedUnits.
 * No mezcla ARS y USD en un único promedio.
 */
export function buildConsolidatedPortfolio(
  entries: FinanceEntry[],
  portfolioHoldings: FinancePortfolioHolding[] = [],
): ConsolidatedPosition[] {
  const buckets = new Map<string, Bucket>();

  const ensure = (ticker: string): Bucket => {
    let b = buckets.get(ticker);
    if (!b) {
      b = {
        ticker,
        quantityFromHoldings: 0,
        quantityFromEntries: 0,
        hasEntryUnits: false,
        hasHoldings: false,
        hasEntries: false,
        investedAmountByCurrency: {},
        weightedCostByCurrency: {},
        limitations: [],
      };
      buckets.set(ticker, b);
    }
    return b;
  };

  for (const holding of portfolioHoldings) {
    const b = ensure(holding.ticker);
    b.hasHoldings = true;
    b.quantityFromHoldings += holding.quantity;
    if (holding.displayName && !b.displayName) b.displayName = holding.displayName;

    const cur = holding.currency.toUpperCase();
    const invested = holding.quantity * holding.averagePurchasePrice;
    b.investedAmountByCurrency[cur] = (b.investedAmountByCurrency[cur] ?? 0) + invested;

    const w = b.weightedCostByCurrency[cur] ?? { qty: 0, cost: 0 };
    w.qty += holding.quantity;
    w.cost += invested;
    b.weightedCostByCurrency[cur] = w;
  }

  for (const entry of entries) {
    if (entry.type !== 'investment' || !(entry.amount > 0)) continue;
    const ticker = getEntryTicker(entry);
    if (!ticker) continue;
    const b = ensure(ticker);
    b.hasEntries = true;

    const cur = (entry.buyCurrency ?? 'ARS').toUpperCase();
    b.investedAmountByCurrency[cur] = (b.investedAmountByCurrency[cur] ?? 0) + entry.amount;

    if (
      typeof entry.estimatedUnits === 'number' &&
      entry.estimatedUnits > 0 &&
      typeof entry.buyPrice === 'number' &&
      entry.buyPrice > 0
    ) {
      b.hasEntryUnits = true;
      b.quantityFromEntries += entry.estimatedUnits;
      const w = b.weightedCostByCurrency[cur] ?? { qty: 0, cost: 0 };
      w.qty += entry.estimatedUnits;
      w.cost += entry.estimatedUnits * entry.buyPrice;
      b.weightedCostByCurrency[cur] = w;
    } else {
      b.limitations.push('Hay movimientos sin cantidad estimada; no se inventan unidades.');
    }
  }

  const positions: ConsolidatedPosition[] = [];

  for (const b of buckets.values()) {
    const currencies = Object.keys(b.investedAmountByCurrency);
    const rawQty = b.quantityFromHoldings + (b.hasEntryUnits ? b.quantityFromEntries : 0);
    const quantity = rawQty > 0 ? rawQty : undefined;

    let averagePurchasePrice: number | undefined;
    let currency: string | undefined;
    let limitation: string | undefined;

    if (currencies.length === 1) {
      currency = currencies[0];
      const w = b.weightedCostByCurrency[currency];
      if (w && w.qty > 0) {
        averagePurchasePrice = w.cost / w.qty;
      }
    } else if (currencies.length > 1) {
      limitation =
        'Hay montos en distintas monedas; no se calcula un único precio promedio.';
    }

    if (b.limitations.length > 0 && !b.hasHoldings && !b.hasEntryUnits) {
      limitation = b.limitations[0];
    } else if (b.limitations.length > 0 && limitation) {
      limitation = `${limitation} ${b.limitations[0]}`;
    } else if (b.limitations.length > 0 && !quantity) {
      limitation = b.limitations[0];
    }

    const qty =
      quantity && quantity > 0
        ? quantity
        : b.quantityFromHoldings > 0
          ? b.quantityFromHoldings
          : undefined;

    positions.push({
      ticker: b.ticker,
      quantity: qty,
      investedAmountByCurrency: { ...b.investedAmountByCurrency },
      averagePurchasePrice,
      currency,
      displayName: b.displayName,
      sources: {
        entries: b.hasEntries,
        historicalHoldings: b.hasHoldings,
      },
      limitation,
    });
  }

  return positions.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/** Tickers a seguir en alertas: entries + holdings. */
export function getTrackedTickersFromPortfolio(
  entries: FinanceEntry[],
  holdings: FinancePortfolioHolding[] = [],
): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.type !== 'investment') continue;
    const t = getEntryTicker(e);
    if (t) set.add(t);
  }
  for (const h of holdings) {
    if (h.ticker) set.add(h.ticker.toUpperCase());
  }
  return [...set].sort();
}
