import { getEntryTicker } from '@/lib/finance/entryTicker';
import type { FinanceEntry } from '@/lib/finance/types';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

export const BITCOIN_IBIT_TICKER = 'IBIT';

/**
 * Cantidad neta de IBIT desde holdings + compras − ventas.
 * No muta la cartera; solo lectura.
 */
export function getIbitNetQuantity(
  entries: FinanceEntry[],
  holdings: FinancePortfolioHolding[] = [],
): { quantity: number; investedArs: number; investedUsd: number; hasUnits: boolean } {
  let quantity = 0;
  let investedArs = 0;
  let investedUsd = 0;
  let hasUnits = false;

  for (const h of holdings) {
    if (h.ticker.toUpperCase() !== BITCOIN_IBIT_TICKER) continue;
    if (h.quantity > 0) {
      quantity += h.quantity;
      hasUnits = true;
    }
    const cost = h.quantity * h.averagePurchasePrice;
    if (h.currency === 'USD') investedUsd += cost;
    else investedArs += cost;
  }

  for (const entry of entries) {
    const ticker = getEntryTicker(entry);
    if (ticker !== BITCOIN_IBIT_TICKER) continue;

    if (entry.type === 'investment' && entry.amount > 0) {
      if (entry.amountCurrency === 'USD') investedUsd += entry.amount;
      else investedArs += entry.amount;

      if (typeof entry.estimatedUnits === 'number' && entry.estimatedUnits > 0) {
        quantity += entry.estimatedUnits;
        hasUnits = true;
      }
    }

    if (entry.type === 'investment_sale') {
      if (typeof entry.estimatedUnits === 'number' && entry.estimatedUnits > 0) {
        quantity -= entry.estimatedUnits;
        hasUnits = true;
      }
    }
  }

  return {
    quantity: Math.max(0, Math.round(quantity * 1000) / 1000),
    investedArs: Math.max(0, investedArs),
    investedUsd: Math.max(0, investedUsd),
    hasUnits,
  };
}
