/**
 * Modos de carga de una inversión: por monto o por nominales (unidades).
 */

export type EntryInputMode = 'amount' | 'units';

export type EntryAmountCurrency = 'ARS' | 'USD';

export const ENTRY_INPUT_MODE_LABELS: Record<EntryInputMode, string> = {
  amount: 'Monto',
  units: 'Nominales',
};

export const QUICK_AMOUNT_OPTIONS_USD = [50, 100, 200, 500] as const;

/** Chips rápidos de nominales (acciones / CEDEARs). */
export const QUICK_UNIT_OPTIONS = [1, 5, 10, 50, 100] as const;

export function parsePositiveNumber(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Monto a partir de nominales × precio. */
export function amountFromUnits(
  units: number,
  unitPrice: number,
  currency: EntryAmountCurrency = 'ARS',
): number {
  if (!(units > 0) || !(unitPrice > 0)) return 0;
  const raw = units * unitPrice;
  if (currency === 'USD') return Math.round(raw * 100) / 100;
  return Math.round(raw);
}

/** Nominales estimados a partir de monto ÷ precio (3 decimales). */
export function unitsFromAmount(amount: number, unitPrice: number): number {
  if (!(amount > 0) || !(unitPrice > 0)) return 0;
  return Math.round((amount / unitPrice) * 1000) / 1000;
}

export function formatUnits(units: number): string {
  if (!Number.isFinite(units)) return '—';
  return units.toLocaleString('es-AR', {
    maximumFractionDigits: units % 1 === 0 ? 0 : 3,
  });
}

export function normalizeAmountCurrency(raw: unknown): EntryAmountCurrency {
  return String(raw ?? 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS';
}
