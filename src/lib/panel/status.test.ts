import { describe, expect, it } from 'vitest';
import { calculateChargeStatus } from '@/lib/panel/status';

describe('calculateChargeStatus', () => {
  it('paid', () => {
    expect(
      calculateChargeStatus({ dueDate: '2026-08-24', hasPayment: true, today: '2026-08-30' }),
    ).toBe('paid');
  });

  it('upcoming (Sanación antes del 24)', () => {
    expect(
      calculateChargeStatus({ dueDate: '2026-08-24', hasPayment: false, today: '2026-08-23' }),
    ).toBe('upcoming');
  });

  it('due_today (Sanación el 24)', () => {
    expect(
      calculateChargeStatus({ dueDate: '2026-08-24', hasPayment: false, today: '2026-08-24' }),
    ).toBe('due_today');
  });

  it('overdue (Sanación desde el 25)', () => {
    expect(
      calculateChargeStatus({ dueDate: '2026-08-24', hasPayment: false, today: '2026-08-25' }),
    ).toBe('overdue');
  });
});
