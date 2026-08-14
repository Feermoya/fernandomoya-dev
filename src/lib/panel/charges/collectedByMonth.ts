import { monthLabelFromPeriod } from '@/lib/panel/view-types';

export type PaymentForCollectedSeries = {
  paid_at: string;
  amount_received: number;
  currency_received: string;
};

export type CollectedSeriesPoint = {
  month: string; // YYYY-MM
  label: string;
  collectedArs: number;
};

export type CollectedDeltaInfo = {
  pct: number;
  direction: 'up' | 'down' | 'flat';
  previousLabel: string;
};

/**
 * Agrupa payments ARS reales por mes de paid_at.
 * No inventa meses vacíos; solo meses con al menos un pago.
 */
export function buildCollectedArsByMonth(
  payments: PaymentForCollectedSeries[],
): CollectedSeriesPoint[] {
  const byMonth = new Map<string, number>();

  for (const p of payments) {
    if (p.currency_received !== 'ARS') continue;
    const amount = Number(p.amount_received);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const month = String(p.paid_at).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, collectedArs]) => ({
      month,
      label: monthLabelFromPeriod(month),
      collectedArs,
    }));
}

/** Delta % entre los dos últimos puntos: (curr - prev) / prev * 100. */
export function computeCollectedDelta(
  series: CollectedSeriesPoint[],
): CollectedDeltaInfo | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!(prev.collectedArs > 0)) return null;
  const pct = ((last.collectedArs - prev.collectedArs) / prev.collectedArs) * 100;
  const direction = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, direction, previousLabel: prev.label.toLowerCase() };
}

export function formatCollectedDeltaBadge(delta: CollectedDeltaInfo): string {
  const rounded = Math.round(delta.pct * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  const pct = `${sign}${rounded.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
  return `${pct} vs ${delta.previousLabel}`;
}
