import { describe, expect, it } from 'vitest';
import { calculateCollectedInMonth, calculateMrr } from '@/lib/panel/mrr';
import { freezeChargeReference, normalizePaymentAmounts } from '@/lib/panel/payments';

describe('payment USD → ARS (MEP al pagar)', () => {
  it('Poletino 45 USD @ 1520 → 68400 ARS', () => {
    const p = normalizePaymentAmounts({
      referenceAmount: 45,
      referenceCurrency: 'USD',
      amountReceived: 68400,
      currencyReceived: 'ARS',
      exchangeRate: 1520,
    });
    expect(p.exchange_rate).toBe(1520);
    expect(p.amount_received).toBe(68400);
    expect(p.reference_currency).toBe('USD');
    expect(p.currency_received).toBe('ARS');
  });

  it('exige exchange_rate si monedas difieren', () => {
    expect(() =>
      normalizePaymentAmounts({
        referenceAmount: 45,
        referenceCurrency: 'USD',
        amountReceived: 68400,
        currencyReceived: 'ARS',
      }),
    ).toThrow(/exchange_rate/);
  });
});

describe('payment ARS → ARS', () => {
  it('sin exchange_rate', () => {
    const p = normalizePaymentAmounts({
      referenceAmount: 30000,
      referenceCurrency: 'ARS',
      amountReceived: 30000,
      currencyReceived: 'ARS',
    });
    expect(p.exchange_rate).toBeNull();
    expect(p.amount_received).toBe(30000);
  });
});

describe('histórico de tarifa en charge', () => {
  it('freeze no cambia si luego muta el servicio', () => {
    const service = { reference_amount: 45, reference_currency: 'USD' as const };
    const frozen = freezeChargeReference(service);
    service.reference_amount = 50;
    expect(frozen.reference_amount).toBe(45);
    expect(service.reference_amount).toBe(50);
  });
});

describe('MRR', () => {
  const services = [
    {
      active: true,
      billing_type: 'recurring' as const,
      reference_amount: 45,
      reference_currency: 'USD' as const,
      ended_at: null,
    },
    {
      active: true,
      billing_type: 'recurring' as const,
      reference_amount: 50,
      reference_currency: 'USD' as const,
      ended_at: null,
    },
    {
      active: true,
      billing_type: 'recurring' as const,
      reference_amount: 30000,
      reference_currency: 'ARS' as const,
      ended_at: null,
    },
    {
      active: true,
      billing_type: 'one_time' as const,
      reference_amount: 80,
      reference_currency: 'USD' as const,
      ended_at: null,
    },
    {
      active: false,
      billing_type: 'recurring' as const,
      reference_amount: 100,
      reference_currency: 'USD' as const,
      ended_at: '2026-01-01',
    },
  ];

  it('recurring USD y ARS separados; one_time fuera', () => {
    const mrr = calculateMrr(services, '2026-08-14');
    expect(mrr.usd).toBe(95);
    expect(mrr.ars).toBe(30000);
  });

  it('one_time no suma al MRR', () => {
    const onlyOneTime = calculateMrr(
      [
        {
          active: true,
          billing_type: 'one_time',
          reference_amount: 80,
          reference_currency: 'USD',
          ended_at: null,
        },
      ],
      '2026-08-14',
    );
    expect(onlyOneTime.usd).toBe(0);
    expect(onlyOneTime.ars).toBe(0);
  });
});

describe('Cobrado este mes (paid_at)', () => {
  it('suma por moneda recibida en el mes', () => {
    const collected = calculateCollectedInMonth(
      [
        { paid_at: '2026-08-05', amount_received: 100000, currency_received: 'ARS' },
        { paid_at: '2026-08-20', amount_received: 68400, currency_received: 'ARS' },
        { paid_at: '2026-09-01', amount_received: 45, currency_received: 'USD' },
      ],
      '2026-08-01',
    );
    expect(collected.ars).toBe(168400);
    expect(collected.usd).toBe(0);
  });
});
