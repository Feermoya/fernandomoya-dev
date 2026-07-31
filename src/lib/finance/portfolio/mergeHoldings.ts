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
  /** Solo en replace_broker: posiciones del broker que salieron. */
  removedBroker?: number;
};

export function normalizeBrokerName(broker?: string): string {
  return (broker ?? '').trim().toLowerCase();
}

/** Holdings gestionados por el Excel Balanz (incluye imports viejos sin broker). */
export function isBalanzManagedHolding(h: FinancePortfolioHolding): boolean {
  const b = normalizeBrokerName(h.broker);
  if (b === 'balanz') return true;
  if (h.source === 'csv' && !b) return true;
  return false;
}

/**
 * Reemplaza toda la cartera Balanz por el Excel importado.
 * Conserva posiciones manuales de otros brokers / sin marca Balanz.
 */
export function replaceBrokerPortfolioHoldings(params: {
  existing: FinancePortfolioHolding[];
  incoming: FinancePortfolioHolding[];
  broker?: string;
  nowIso?: string;
}): MergeHoldingsResult {
  const now = params.nowIso ?? new Date().toISOString();
  const brokerLabel = params.broker?.trim() || 'Balanz';
  const brokerNorm = normalizeBrokerName(brokerLabel) || 'balanz';

  const kept = params.existing.filter((h) => {
    if (brokerNorm === 'balanz') return !isBalanzManagedHolding(h);
    return normalizeBrokerName(h.broker) !== brokerNorm;
  });
  const removedBroker = params.existing.length - kept.length;

  const map = new Map<string, FinancePortfolioHolding>();
  for (const h of kept) map.set(holdingKey(h), { ...h });

  let added = 0;
  let replaced = 0;

  for (const raw of params.incoming) {
    const incoming: FinancePortfolioHolding = {
      ...raw,
      broker: raw.broker?.trim() || brokerLabel,
      updatedAt: now,
    };
    const key = holdingKey(incoming);
    const prev = map.get(key);
    if (prev) {
      map.set(key, {
        ...incoming,
        id: prev.id,
        createdAt: prev.createdAt,
        updatedAt: now,
      });
      replaced += 1;
    } else {
      map.set(key, incoming);
      added += 1;
    }
  }

  return {
    holdings: [...map.values()].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    combined: 0,
    replaced,
    ignored: 0,
    added,
    removedBroker,
  };
}

/**
 * Aplica incoming sobre existing según estrategia de duplicados (mismo ticker + moneda).
 */
export function mergePortfolioHoldings(params: {
  existing: FinancePortfolioHolding[];
  incoming: FinancePortfolioHolding[];
  strategy: PortfolioDuplicateStrategy;
  /** Estrategias por clave `TICKER:CURRENCY` (override del global). */
  perKeyStrategy?: Record<string, PortfolioDuplicateStrategy>;
  broker?: string;
  nowIso?: string;
}): MergeHoldingsResult {
  if (params.strategy === 'replace_broker') {
    return replaceBrokerPortfolioHoldings({
      existing: params.existing,
      incoming: params.incoming,
      broker: params.broker ?? 'Balanz',
      nowIso: params.nowIso,
    });
  }

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
