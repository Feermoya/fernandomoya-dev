/**
 * Vistas puras de posiciones históricas (filtro / orden / resumen).
 * No muta persistencia ni reglas de precios.
 */

import type { FinancePricesMap } from '@/lib/finance/financePrices';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

export type PortfolioViewFilter = 'all' | 'gain' | 'loss' | 'no_price';

export type PortfolioViewSort =
  | 'loss'
  | 'gain'
  | 'value'
  | 'ticker'
  | 'recent';

export type PortfolioHoldingView = {
  holding: FinancePortfolioHolding;
  marketValue: number | null;
  deltaPct: number | null;
  hasPrice: boolean;
  status: 'gain' | 'loss' | 'flat' | 'no_price';
};

export type PortfolioCurrencyTotals = {
  currency: string;
  marketValue: number;
  costBasis: number;
  deltaPct: number | null;
  gainCount: number;
  lossCount: number;
  noPriceCount: number;
  count: number;
};

export type PortfolioSummary = {
  count: number;
  byCurrency: PortfolioCurrencyTotals[];
  gainCount: number;
  lossCount: number;
  noPriceCount: number;
};

function rowView(
  holding: FinancePortfolioHolding,
  prices: FinancePricesMap,
): PortfolioHoldingView {
  const price = prices[holding.ticker];
  const current = price && price.price > 0 ? price.price : null;
  const sameFx =
    current != null &&
    price?.currency &&
    price.currency.toUpperCase() === holding.currency.toUpperCase();
  const hasPrice = Boolean(sameFx && current != null);
  const marketValue = hasPrice && current != null ? current * holding.quantity : null;
  const deltaPct =
    hasPrice && current != null
      ? ((current - holding.averagePurchasePrice) / holding.averagePurchasePrice) * 100
      : null;

  let status: PortfolioHoldingView['status'] = 'no_price';
  if (deltaPct != null) {
    if (deltaPct > 0.05) status = 'gain';
    else if (deltaPct < -0.05) status = 'loss';
    else status = 'flat';
  }

  return { holding, marketValue, deltaPct, hasPrice, status };
}

export function buildPortfolioHoldingViews(
  holdings: FinancePortfolioHolding[],
  prices: FinancePricesMap,
): PortfolioHoldingView[] {
  return holdings.map((h) => rowView(h, prices));
}

export function summarizePortfolioViews(views: PortfolioHoldingView[]): PortfolioSummary {
  const byCur = new Map<
    string,
    {
      marketValue: number;
      costBasis: number;
      gainCount: number;
      lossCount: number;
      noPriceCount: number;
      count: number;
      priced: boolean;
    }
  >();

  let gainCount = 0;
  let lossCount = 0;
  let noPriceCount = 0;

  for (const v of views) {
    const cur = v.holding.currency.toUpperCase();
    const bucket =
      byCur.get(cur) ??
      {
        marketValue: 0,
        costBasis: 0,
        gainCount: 0,
        lossCount: 0,
        noPriceCount: 0,
        count: 0,
        priced: false,
      };
    bucket.count += 1;
    bucket.costBasis += v.holding.quantity * v.holding.averagePurchasePrice;
    if (v.status === 'gain') {
      bucket.gainCount += 1;
      gainCount += 1;
    } else if (v.status === 'loss') {
      bucket.lossCount += 1;
      lossCount += 1;
    } else if (v.status === 'no_price') {
      bucket.noPriceCount += 1;
      noPriceCount += 1;
    }
    if (v.marketValue != null) {
      bucket.marketValue += v.marketValue;
      bucket.priced = true;
    }
    byCur.set(cur, bucket);
  }

  const byCurrency: PortfolioCurrencyTotals[] = [...byCur.entries()].map(([currency, b]) => ({
    currency,
    marketValue: b.marketValue,
    costBasis: b.costBasis,
    deltaPct:
      b.priced && b.costBasis > 0
        ? ((b.marketValue - b.costBasis) / b.costBasis) * 100
        : null,
    gainCount: b.gainCount,
    lossCount: b.lossCount,
    noPriceCount: b.noPriceCount,
    count: b.count,
  }));

  return {
    count: views.length,
    byCurrency,
    gainCount,
    lossCount,
    noPriceCount,
  };
}

export function filterPortfolioViews(
  views: PortfolioHoldingView[],
  filter: PortfolioViewFilter,
  query: string,
): PortfolioHoldingView[] {
  const q = query.trim().toLowerCase();
  return views.filter((v) => {
    if (filter === 'gain' && v.status !== 'gain') return false;
    if (filter === 'loss' && v.status !== 'loss') return false;
    if (filter === 'no_price' && v.status !== 'no_price') return false;
    if (!q) return true;
    const h = v.holding;
    return (
      h.ticker.toLowerCase().includes(q) ||
      (h.displayName ?? '').toLowerCase().includes(q) ||
      (h.broker ?? '').toLowerCase().includes(q)
    );
  });
}

export function sortPortfolioViews(
  views: PortfolioHoldingView[],
  sort: PortfolioViewSort,
): PortfolioHoldingView[] {
  const next = [...views];
  next.sort((a, b) => {
    switch (sort) {
      case 'loss': {
        const da = a.deltaPct ?? 0;
        const db = b.deltaPct ?? 0;
        if (a.status === 'no_price' && b.status !== 'no_price') return 1;
        if (b.status === 'no_price' && a.status !== 'no_price') return -1;
        return da - db;
      }
      case 'gain': {
        const da = a.deltaPct ?? Number.NEGATIVE_INFINITY;
        const db = b.deltaPct ?? Number.NEGATIVE_INFINITY;
        return db - da;
      }
      case 'value': {
        const va = a.marketValue ?? -1;
        const vb = b.marketValue ?? -1;
        return vb - va;
      }
      case 'ticker':
        return a.holding.ticker.localeCompare(b.holding.ticker);
      case 'recent':
        return b.holding.updatedAt.localeCompare(a.holding.updatedAt);
      default:
        return 0;
    }
  });
  return next;
}

/** Prioridad de alertas para resumen UI (no cambia fingerprints). */
export function sortMarketAlertsForDisplay<
  T extends { kind: string; changePercent?: number; severity: string },
>(alerts: T[]): T[] {
  const rank = (a: T): number => {
    if (a.kind === 'loss-since-buy') return 0;
    if (a.kind === 'daily-drop') return 1;
    if (a.kind === 'daily-rise') return 2;
    if (a.kind === 'gain-since-buy') return 3;
    return 4;
  };
  return [...alerts].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const ca = Math.abs(a.changePercent ?? 0);
    const cb = Math.abs(b.changePercent ?? 0);
    return cb - ca;
  });
}
