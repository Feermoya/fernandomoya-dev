import type { Currency, MrrBreakdown, Service } from '@/lib/panel/types';
import { parseIsoDateParts, toPeriodStart, type IsoDate } from '@/lib/panel/dates';

export type ServiceForMrr = Pick<
  Service,
  'active' | 'billing_type' | 'reference_amount' | 'reference_currency' | 'ended_at'
>;

/**
 * MRR = suma de reference_amount de servicios recurring activos,
 * separados por moneda. one_time no cuenta.
 * No convierte ARS↔USD.
 */
export function calculateMrr(services: ServiceForMrr[], asOf: IsoDate = todayIso()): MrrBreakdown {
  let usd = 0;
  let ars = 0;

  for (const s of services) {
    if (s.billing_type !== 'recurring') continue;
    if (!s.active) continue;
    if (s.ended_at && s.ended_at < asOf) continue;

    if (s.reference_currency === 'USD') usd += Number(s.reference_amount);
    else if (s.reference_currency === 'ARS') ars += Number(s.reference_amount);
  }

  return { usd, ars };
}

export type PaymentForCollected = {
  paid_at: string;
  amount_received: number;
  currency_received: Currency;
};

/** Cobrado en un mes calendario (según paid_at), por moneda recibida. */
export function calculateCollectedInMonth(
  payments: PaymentForCollected[],
  month: IsoDate,
): MrrBreakdown {
  const start = toPeriodStart(month);
  const { year, month: m } = parseIsoDateParts(start);
  const nextMonth =
    m === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(m + 1).padStart(2, '0')}-01`;

  let usd = 0;
  let ars = 0;

  for (const p of payments) {
    if (p.paid_at < start || p.paid_at >= nextMonth) continue;
    if (p.currency_received === 'USD') usd += Number(p.amount_received);
    else if (p.currency_received === 'ARS') ars += Number(p.amount_received);
  }

  return { usd, ars };
}

function todayIso(): IsoDate {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
