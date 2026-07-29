/**
 * Modos de carga de una inversión: por monto ARS o por nominales (unidades).
 * Carpeta: `src/lib/finance/entry/` — lógica de dominio de alta de entries.
 */

export type EntryInputMode = 'amount' | 'units';

export const ENTRY_INPUT_MODE_LABELS: Record<EntryInputMode, string> = {
  amount: 'Monto',
  units: 'Nominales',
};

/** Chips rápidos de nominales (acciones / CEDEARs). */
export const QUICK_UNIT_OPTIONS = [1, 5, 10, 50, 100] as const;

export function parsePositiveNumber(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Monto ARS a partir de nominales × precio. */
export function amountFromUnits(units: number, unitPrice: number): number {
  if (!(units > 0) || !(unitPrice > 0)) return 0;
  return Math.round(units * unitPrice);
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
