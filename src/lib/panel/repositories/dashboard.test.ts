import { describe, expect, it } from 'vitest';
import {
  appendCurrentMrrPoint,
  buildHistoricalMrrUsdSeries,
} from '@/lib/panel/repositories/dashboard';
import { buildCollectedArsByMonth, computeCollectedDelta } from '@/lib/panel/charges/collectedByMonth';
import { HISTORY_PAYMENTS_2026 } from '@/lib/panel/history/history2026';
import { calculateChargeStatus } from '@/lib/panel/status';

describe('buildHistoricalMrrUsdSeries (legacy)', () => {
  it('agrupa por period y no inventa meses', () => {
    const series = buildHistoricalMrrUsdSeries([
      { period: '2026-03-01', reference_amount: 120 },
      { period: '2026-03-01', reference_amount: 38 },
      { period: '2026-04-01', reference_amount: 158 },
    ]);

    expect(series).toEqual([
      { month: '2026-03', label: 'Mar', mrrUsd: 158 },
      { month: '2026-04', label: 'Abr', mrrUsd: 158 },
    ]);
  });

  it('devuelve vacío sin historial', () => {
    expect(buildHistoricalMrrUsdSeries([])).toEqual([]);
  });
});

describe('appendCurrentMrrPoint', () => {
  it('añade mes corriente sin inventar pasado', () => {
    const series = appendCurrentMrrPoint(
      [{ month: '2026-07', label: 'Jul', mrrUsd: 200 }],
      233,
      '2026-08-14',
    );
    expect(series).toEqual([
      { month: '2026-07', label: 'Jul', mrrUsd: 200 },
      { month: '2026-08', label: 'Ago', mrrUsd: 233 },
    ]);
  });

  it('actualiza el mes corriente si ya existía', () => {
    const series = appendCurrentMrrPoint(
      [{ month: '2026-08', label: 'Ago', mrrUsd: 180 }],
      233,
      '2026-08-14',
    );
    expect(series).toEqual([{ month: '2026-08', label: 'Ago', mrrUsd: 233 }]);
  });
});

describe('dashboard cobrado + overdue', () => {
  it('agosto 315610 y delta julio→agosto (ago corregido)', () => {
    const series = buildCollectedArsByMonth(
      HISTORY_PAYMENTS_2026.map((r) => ({
        paid_at: `${r.paymentMonth.slice(0, 7)}-10`,
        amount_received: r.amountReceivedArs,
        currency_received: 'ARS',
      })),
    );
    expect(series.find((p) => p.month === '2026-08')?.collectedArs).toBe(315610);
    const delta = computeCollectedDelta(series);
    expect(delta!.pct).toBeCloseTo(((315610 - 376409) / 376409) * 100, 5);
  });

  it('overdue = 2 cuando Avellaneda/HEMA agosto no tienen payment', () => {
    const today = '2026-08-14';
    const statuses = [
      calculateChargeStatus({ dueDate: '2026-08-10', hasPayment: true, today }),
      calculateChargeStatus({ dueDate: '2026-08-10', hasPayment: false, today }), // avellaneda
      calculateChargeStatus({ dueDate: '2026-08-10', hasPayment: false, today }), // hema
      calculateChargeStatus({ dueDate: '2026-08-24', hasPayment: true, today }),
    ];
    expect(statuses.filter((s) => s === 'overdue')).toHaveLength(2);
  });
});
