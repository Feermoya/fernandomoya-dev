import { describe, expect, it } from 'vitest';
import {
  computeCollectedDelta,
  formatCollectedDeltaBadge,
  buildCollectedArsByMonth,
} from '@/lib/panel/charges/collectedByMonth';
import {
  computeMrrDelta,
  formatDeltaBadge,
} from '@/components/panel/CollectedMonthChart';
import { HISTORY_PAYMENTS_2026, collectedByMonthArs } from '@/lib/panel/history/history2026';

describe('Cobrado por mes · serie real', () => {
  it('agrupa fixtures 2026 ene→ago con totales esperados', () => {
    const byMonth = buildCollectedArsByMonth(
      HISTORY_PAYMENTS_2026.map((r) => ({
        paid_at: `${r.paymentMonth.slice(0, 7)}-10`,
        amount_received: r.amountReceivedArs,
        currency_received: 'ARS',
      })),
    );

    expect(Object.fromEntries(byMonth.map((p) => [p.month, p.collectedArs]))).toEqual(
      collectedByMonthArs(),
    );
    expect(byMonth.map((p) => p.label)).toEqual([
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
    ]);
    expect(byMonth.find((p) => p.month === '2026-08')?.collectedArs).toBe(315610);
  });

  it('delta julio → agosto ≈ -16,2% (ago corregido sin Avellaneda/HEMA)', () => {
    const series = buildCollectedArsByMonth(
      HISTORY_PAYMENTS_2026.map((r) => ({
        paid_at: `${r.paymentMonth.slice(0, 7)}-10`,
        amount_received: r.amountReceivedArs,
        currency_received: 'ARS',
      })),
    );
    const delta = computeCollectedDelta(series);
    expect(delta).not.toBeNull();
    expect(delta!.pct).toBeCloseTo(((315610 - 376409) / 376409) * 100, 5);
    expect(delta!.direction).toBe('down');
    expect(formatCollectedDeltaBadge(delta!)).toMatch(/-16[,.]2% vs jul/);
  });

  it('ignora USD y montos inválidos', () => {
    expect(
      buildCollectedArsByMonth([
        { paid_at: '2026-08-10', amount_received: 100, currency_received: 'USD' },
        { paid_at: '2026-08-10', amount_received: NaN, currency_received: 'ARS' },
        { paid_at: '2026-08-10', amount_received: 50, currency_received: 'ARS' },
      ]),
    ).toEqual([{ month: '2026-08', label: 'Ago', collectedArs: 50 }]);
  });
});

describe('aliases chart delta', () => {
  it('computeMrrDelta delega a collected', () => {
    const series = [
      { month: '2026-07', label: 'Jul', collectedArs: 376409 },
      { month: '2026-08', label: 'Ago', collectedArs: 315610 },
    ];
    const d = computeMrrDelta(series);
    expect(formatDeltaBadge(d!)).toMatch(/-16[,.]2% vs jul/);
  });
});
