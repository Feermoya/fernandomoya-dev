import { describe, expect, it } from 'vitest';
import type { Charge, Service } from '@/lib/panel/types';
import { freezeChargeReference } from '@/lib/panel/payments';

describe('one_time charge', () => {
  it('period null y due_date explícita', () => {
    const service: Pick<
      Service,
      'id' | 'billing_type' | 'reference_amount' | 'reference_currency' | 'billing_mode' | 'due_day'
    > = {
      id: 'svc-stickers',
      billing_type: 'one_time',
      reference_amount: 80,
      reference_currency: 'USD',
      billing_mode: null,
      due_day: null,
    };

    const frozen = freezeChargeReference(service);
    const charge: Pick<Charge, 'service_id' | 'period' | 'reference_amount' | 'reference_currency' | 'due_date'> =
      {
        service_id: service.id,
        period: null,
        ...frozen,
        due_date: '2026-08-15',
      };

    expect(charge.period).toBeNull();
    expect(charge.reference_amount).toBe(80);
    expect(service.billing_mode).toBeNull();
    expect(service.due_day).toBeNull();
  });
});
