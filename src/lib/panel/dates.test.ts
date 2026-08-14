import { describe, expect, it } from 'vitest';
import {
  calculateDueDate,
  clampDueDay,
  daysInMonth,
  toPeriodStart,
} from '@/lib/panel/dates';

describe('toPeriodStart', () => {
  it('normaliza al día 1 del mes', () => {
    expect(toPeriodStart('2026-08-14')).toBe('2026-08-01');
  });
});

describe('due_day 31 / febrero', () => {
  it('febrero 2026 → 28', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(clampDueDay(2026, 2, 31)).toBe(28);
    expect(calculateDueDate('2026-02-01', 'current_month', 31)).toBe('2026-02-28');
  });
});

describe('current_month', () => {
  it('Avellaneda agosto due 10 → 2026-08-10', () => {
    expect(calculateDueDate('2026-08-01', 'current_month', 10)).toBe('2026-08-10');
  });
});

describe('previous_month', () => {
  it('Poletino servicio agosto → vence 2026-09-10', () => {
    expect(calculateDueDate('2026-08-01', 'previous_month', 10)).toBe('2026-09-10');
  });

  it('diciembre → enero', () => {
    expect(calculateDueDate('2026-12-01', 'previous_month', 10)).toBe('2027-01-10');
  });
});

describe('due_day 24 (Sanación)', () => {
  it('agosto → 2026-08-24', () => {
    expect(calculateDueDate('2026-08-01', 'current_month', 24)).toBe('2026-08-24');
  });
});
