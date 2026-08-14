import { describe, expect, it } from 'vitest';
import { computeMrrDelta, formatDeltaBadge } from '@/components/panel/MrrTrendChart';

describe('computeMrrDelta', () => {
  it('null sin historial suficiente', () => {
    expect(computeMrrDelta([])).toBeNull();
    expect(computeMrrDelta([{ month: '2026-07', label: 'Jul', mrrUsd: 233 }])).toBeNull();
  });

  it('calcula % entre últimos dos períodos', () => {
    const delta = computeMrrDelta([
      { month: '2026-06', label: 'Jun', mrrUsd: 200 },
      { month: '2026-07', label: 'Jul', mrrUsd: 233 },
    ]);
    expect(delta?.direction).toBe('up');
    expect(delta?.pct).toBeCloseTo(16.5, 1);
    expect(delta?.previousLabel).toBe('jun');
    expect(formatDeltaBadge(delta!)).toMatch(/\+16[,.]5% vs jun/);
  });

  it('null si previousMrr es 0', () => {
    expect(
      computeMrrDelta([
        { month: '2026-06', label: 'Jun', mrrUsd: 0 },
        { month: '2026-07', label: 'Jul', mrrUsd: 233 },
      ]),
    ).toBeNull();
  });
});
