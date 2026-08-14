import type { Currency } from '@/lib/panel/types';

export type PaymentAmountRow = {
  amount_received: number;
  currency_received: string;
};

export type CollectedTotals = {
  totalCollectedARS: number;
  totalCollectedUSD: number;
};

/**
 * Suma payments por moneda sin convertir.
 * Solo ARS y USD; ignora montos no finitos / ≤ 0.
 */
export function sumCollectedByCurrency(payments: PaymentAmountRow[]): CollectedTotals {
  let totalCollectedARS = 0;
  let totalCollectedUSD = 0;

  for (const p of payments) {
    const amount = Number(p.amount_received);
    if (!Number.isFinite(amount) || !(amount > 0)) continue;
    const currency = String(p.currency_received).toUpperCase() as Currency;
    if (currency === 'ARS') totalCollectedARS += amount;
    else if (currency === 'USD') totalCollectedUSD += amount;
  }

  return { totalCollectedARS, totalCollectedUSD };
}
