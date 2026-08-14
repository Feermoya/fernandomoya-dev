import { describe, expect, it } from 'vitest';
import {
  buildRecurringChargeForOperationalMonth,
  planRecurringChargesForOperationalMonth,
  resolveServicePeriodForOperationalMonth,
  shouldGenerateRecurringCharge,
  type ServiceForChargeGeneration,
} from '@/lib/panel/charges/planRecurring';

function baseService(
  overrides: Partial<ServiceForChargeGeneration> = {},
): ServiceForChargeGeneration {
  return {
    id: 'svc-1',
    active: true,
    billing_type: 'recurring',
    billing_mode: 'previous_month',
    due_day: 10,
    reference_amount: 45,
    reference_currency: 'USD',
    start_date: '2026-01-01',
    ended_at: null,
    ...overrides,
  };
}

describe('resolveServicePeriodForOperationalMonth', () => {
  it('previous_month: agosto → período julio', () => {
    expect(resolveServicePeriodForOperationalMonth('2026-08-14', 'previous_month')).toBe(
      '2026-07-01',
    );
  });

  it('previous_month: enero → período diciembre año anterior', () => {
    expect(resolveServicePeriodForOperationalMonth('2027-01-05', 'previous_month')).toBe(
      '2026-12-01',
    );
  });

  it('current_month: agosto → período agosto', () => {
    expect(resolveServicePeriodForOperationalMonth('2026-08-14', 'current_month')).toBe(
      '2026-08-01',
    );
  });
});

describe('buildRecurringChargeForOperationalMonth · previous_month', () => {
  it('agosto genera period julio y due en agosto', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({ due_day: 10, reference_amount: 45 }),
      '2026-08-14',
    );
    expect(charge).toEqual({
      service_id: 'svc-1',
      period: '2026-07-01',
      reference_amount: 45,
      reference_currency: 'USD',
      due_date: '2026-08-10',
    });
  });

  it('due_day 24 (Sanación)', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({ due_day: 24, reference_amount: 38 }),
      '2026-08-14',
    );
    expect(charge?.due_date).toBe('2026-08-24');
    expect(charge?.period).toBe('2026-07-01');
  });

  it('due_day 31 se clampea al último día del mes de vencimiento', () => {
    // period julio → vence agosto; due_day 31 → 2026-08-31
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({ due_day: 31 }),
      '2026-08-14',
    );
    expect(charge?.due_date).toBe('2026-08-31');
  });

  it('due_day 31 en febrero (period ene, previous_month) → 28', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({ due_day: 31, start_date: '2025-01-01' }),
      '2026-02-10',
    );
    expect(charge?.period).toBe('2026-01-01');
    expect(charge?.due_date).toBe('2026-02-28');
  });
});

describe('start_date / ended_at / active / one_time', () => {
  it('no genera período anterior al inicio (Giuliana: start ago, op ago → no julio)', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({
        id: 'giuliana',
        start_date: '2026-08-01',
        reference_amount: 50,
      }),
      '2026-08-14',
    );
    expect(charge).toBeNull();
  });

  it('Giuliana en septiembre sí genera período agosto → due sept', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({
        id: 'giuliana',
        start_date: '2026-08-01',
        reference_amount: 50,
      }),
      '2026-09-01',
    );
    expect(charge).toEqual({
      service_id: 'giuliana',
      period: '2026-08-01',
      reference_amount: 50,
      reference_currency: 'USD',
      due_date: '2026-09-10',
    });
  });

  it('shouldGenerateRecurringCharge respeta start_date', () => {
    const service = baseService({ start_date: '2026-08-01' });
    expect(shouldGenerateRecurringCharge(service, '2026-07-01')).toBe(false);
    expect(shouldGenerateRecurringCharge(service, '2026-08-01')).toBe(true);
  });

  it('ended_at anterior al período → no genera', () => {
    const charge = buildRecurringChargeForOperationalMonth(
      baseService({ ended_at: '2026-06-30' }),
      '2026-08-14',
    );
    expect(charge).toBeNull();
  });

  it('inactive → no genera', () => {
    expect(
      buildRecurringChargeForOperationalMonth(baseService({ active: false }), '2026-08-14'),
    ).toBeNull();
  });

  it('one_time → ignorado', () => {
    expect(
      buildRecurringChargeForOperationalMonth(
        baseService({
          billing_type: 'one_time',
          billing_mode: null,
          due_day: null,
        }),
        '2026-08-14',
      ),
    ).toBeNull();
  });
});

describe('planRecurringChargesForOperationalMonth · idempotencia de planning', () => {
  it('planificar dos veces produce el mismo set (sin duplicar en memoria)', () => {
    const services = [
      baseService({ id: 'a', reference_amount: 20 }),
      baseService({ id: 'b', reference_amount: 45 }),
      baseService({ id: 'giuliana', start_date: '2026-08-01', reference_amount: 50 }),
    ];
    const first = planRecurringChargesForOperationalMonth(services, '2026-08-14');
    const second = planRecurringChargesForOperationalMonth(services, '2026-08-14');
    expect(first).toHaveLength(2);
    expect(second).toEqual(first);
    expect(first.map((c) => c.service_id).sort()).toEqual(['a', 'b']);
  });
});
