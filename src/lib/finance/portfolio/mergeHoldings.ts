import { weightedAveragePrice } from '@/lib/finance/portfolio/validateHolding';
import type {
  FinancePortfolioHolding,
  PortfolioDuplicateStrategy,
} from '@/lib/finance/portfolio/types';

export type MergeHoldingsResult = {
  holdings: FinancePortfolioHolding[];
  combined: number;
  replaced: number;
  ignored: number;
  added: number;
};

/**
 * Aplica incoming sobre existing según estrategia de duplicados (mismo ticker + moneda).
 */
export function mergePortfolioHoldings(params: {
  existing: FinancePortfolioHolding[];
  incoming: FinancePortfolioHolding[];
  strategy: PortfolioDuplicateStrategy;
  /** Estrategias por clave `TICKER:CURRENCY` (override del global). */
  perKeyStrategy?: Record<string, PortfolioDuplicateStrategy>;
  nowIso?: string;
}): MergeHoldingsResult {
  const now = params.nowIso ?? new Date().toISOString();
  const map = new Map<string, FinancePortfolioHolding>();
  for (const h of params.existing) {
    map.set(holdingKey(h), { ...h });
  }

  let combined = 0;
  let replaced = 0;
  let ignored = 0;
  let added = 0;

  for (const incoming of params.incoming) {
    const key = holdingKey(incoming);
    const strategy = params.perKeyStrategy?.[key] ?? params.strategy;
    const prev = map.get(key);

    if (!prev) {
      map.set(key, { ...incoming, updatedAt: now });
      added += 1;
      continue;
    }

    if (strategy === 'ignore') {
      ignored += 1;
      continue;
    }

    if (strategy === 'replace') {
      map.set(key, {
        ...incoming,
        id: prev.id,
        createdAt: prev.createdAt,
        updatedAt: now,
      });
      replaced += 1;
      continue;
    }

    // combine
    const quantity = prev.quantity + incoming.quantity;
    const averagePurchasePrice = weightedAveragePrice(
      prev.quantity,
      prev.averagePurchasePrice,
      incoming.quantity,
      incoming.averagePurchasePrice,
    );
    map.set(key, {
      ...prev,
      quantity,
      averagePurchasePrice,
      displayName: incoming.displayName ?? prev.displayName,
      broker: incoming.broker ?? prev.broker,
      purchaseDate: incoming.purchaseDate ?? prev.purchaseDate,
      market: incoming.market ?? prev.market,
      notes: incoming.notes ?? prev.notes,
      source: incoming.source,
      updatedAt: now,
    });
    combined += 1;
  }

  return {
    holdings: [...map.values()].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    combined,
    replaced,
    ignored,
    added,
  };
}

export function holdingKey(h: Pick<FinancePortfolioHolding, 'ticker' | 'currency'>): string {
  return `${h.ticker.toUpperCase()}:${h.currency.toUpperCase()}`;
}

export function findHoldingByTickerCurrency(
  holdings: FinancePortfolioHolding[],
  ticker: string,
  currency: string,
): FinancePortfolioHolding | undefined {
  const key = `${ticker.toUpperCase()}:${currency.toUpperCase()}`;
  return holdings.find((h) => holdingKey(h) === key);
}
