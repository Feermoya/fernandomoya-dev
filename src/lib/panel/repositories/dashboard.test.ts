import { describe, expect, it } from 'vitest';
import {
  appendCurrentMrrPoint,
  buildHistoricalMrrUsdSeries,
} from '@/lib/panel/repositories/dashboard';

describe('buildHistoricalMrrUsdSeries', () => {
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
