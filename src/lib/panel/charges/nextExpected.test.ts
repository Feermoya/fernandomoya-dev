import { describe, expect, it } from 'vitest';
import {
  getNextExpectedCharge,
  listNextExpectedCharges,
  type ExistingChargeForProjection,
  type ServiceForNextExpected,
} from '@/lib/panel/charges/nextExpected';

function baseService(
  overrides: Partial<ServiceForNextExpected> = {},
): ServiceForNextExpected {
  return {
    id: 'svc-poletino',
    client_id: 'cli-poletino',
    name: 'Web',
    client_name: 'Poletino',
    active: true,
    billing_type: 'recurring',
    billing_mode: 'previous_month',
    due_day: 10,
    reference_amount: 45,
    reference_currency: 'USD',
    start_date: '2026-04-01',
    ended_at: null,
    ...overrides,
  };
}

describe('getNextExpectedCharge', () => {
  it('proyección septiembre aunque no exista charge futuro (due_day 10)', () => {
    const existing: ExistingChargeForProjection[] = [
      {
        id: 'ch-jul',
        service_id: 'svc-poletino',
        period: '2026-07-01',
        due_date: '2026-08-10',
        hasPayment: true,
      },
    ];
    const next = getNextExpectedCharge(baseService(), existing, '2026-08-14');
    expect(next).toMatchObject({
      dueDate: '2026-09-10',
      period: '2026-08-01',
      referenceAmount: 45,
      chargeId: null,
    });
  });

  it('Sanación due_day 24 → 24/09', () => {
    const svc = baseService({
      id: 'svc-sanacion',
      client_name: 'Sanación',
      due_day: 24,
      reference_amount: 38,
      start_date: '2026-03-01',
    });
    const existing: ExistingChargeForProjection[] = [
      {
        id: 'ch',
        service_id: 'svc-sanacion',
        period: '2026-07-01',
        due_date: '2026-08-24',
        hasPayment: true,
      },
    ];
    expect(getNextExpectedCharge(svc, existing, '2026-08-14')?.dueDate).toBe('2026-09-24');
  });

  it('no proyecta servicios inactivos', () => {
    expect(
      getNextExpectedCharge(baseService({ active: false }), [], '2026-08-14'),
    ).toBeNull();
  });

  it('respeta ended_at', () => {
    const next = getNextExpectedCharge(
      baseService({ ended_at: '2026-07-31', active: true }),
      [
        {
          id: 'ch',
          service_id: 'svc-poletino',
          period: '2026-06-01',
          due_date: '2026-07-10',
          hasPayment: true,
        },
      ],
      '2026-08-14',
    );
    // period ago = 2026-08-01 > ended_at → no genera
    expect(next).toBeNull();
  });

  it('diciembre → enero (cambio de año)', () => {
    const existing: ExistingChargeForProjection[] = [
      {
        id: 'ch',
        service_id: 'svc-poletino',
        period: '2026-11-01',
        due_date: '2026-12-10',
        hasPayment: true,
      },
    ];
    const next = getNextExpectedCharge(baseService(), existing, '2026-12-15');
    expect(next?.dueDate).toBe('2027-01-10');
    expect(next?.period).toBe('2026-12-01');
  });

  it('usa charge unpaid futuro si ya existe', () => {
    const existing: ExistingChargeForProjection[] = [
      {
        id: 'ch-sep',
        service_id: 'svc-poletino',
        period: '2026-08-01',
        due_date: '2026-09-10',
        hasPayment: false,
      },
    ];
    const next = getNextExpectedCharge(baseService(), existing, '2026-08-14');
    expect(next?.chargeId).toBe('ch-sep');
    expect(next?.dueDate).toBe('2026-09-10');
  });
});

describe('listNextExpectedCharges', () => {
  it('ordena por fecha y omite inactivos', () => {
    const services = [
      baseService({
        id: 'svc-sanacion',
        client_name: 'Sanación',
        due_day: 24,
        reference_amount: 38,
      }),
      baseService({
        id: 'svc-giuliana',
        client_id: 'cli-g',
        client_name: 'Giuliana',
        reference_amount: 50,
        start_date: '2026-08-01',
      }),
      baseService({ active: false, id: 'svc-dead', client_name: 'X' }),
    ];
    const existing: ExistingChargeForProjection[] = [
      {
        id: '1',
        service_id: 'svc-sanacion',
        period: '2026-07-01',
        due_date: '2026-08-24',
        hasPayment: true,
      },
      {
        id: '2',
        service_id: 'svc-giuliana',
        period: null,
        due_date: '2026-08-10',
        hasPayment: true,
      },
    ];
    const list = listNextExpectedCharges(services, existing, '2026-08-14');
    expect(list.map((x) => x.clientName)).toEqual(['Giuliana', 'Sanación']);
    expect(list.map((x) => x.dueDate)).toEqual(['2026-09-10', '2026-09-24']);
  });
});
