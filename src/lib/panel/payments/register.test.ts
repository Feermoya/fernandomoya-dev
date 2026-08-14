import { describe, expect, it } from 'vitest';
import {
  buildValidatedPayment,
  defaultCurrencyReceived,
  expectedArsFromUsd,
} from '@/lib/panel/payments/register';
import { calculateCollectedInMonth } from '@/lib/panel/mrr';

const usdCharge = {
  id: 'charge-usd',
  reference_amount: 45,
  reference_currency: 'USD' as const,
};

const arsCharge = {
  id: 'charge-ars',
  reference_amount: 100000,
  reference_currency: 'ARS' as const,
};

describe('expectedArsFromUsd', () => {
  it('45 × 1512.48', () => {
    expect(expectedArsFromUsd(45, 1512.48)).toBe(68061.6);
  });
});

describe('buildValidatedPayment · USD → ARS', () => {
  it('toma reference_* del charge y exige MEP', () => {
    const p = buildValidatedPayment(
      {
        chargeId: 'charge-usd',
        paidAt: '2026-08-14',
        amountReceived: 68062,
        currencyReceived: 'ARS',
        exchangeRate: 1512.48,
        paymentMethod: 'Transferencia',
        notes: 'Galicia',
      },
      usdCharge,
    );
    expect(p.reference_amount).toBe(45);
    expect(p.reference_currency).toBe('USD');
    expect(p.currency_received).toBe('ARS');
    expect(p.exchange_rate).toBe(1512.48);
    expect(p.amount_received).toBe(68062);
    expect(p.payment_method).toBe('Transferencia');
  });

  it('falla sin exchange_rate', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-usd',
          paidAt: '2026-08-14',
          amountReceived: 68062,
          currencyReceived: 'ARS',
        },
        usdCharge,
      ),
    ).toThrow(/exchange_rate/);
  });

  it('ignora reference falso del browser', () => {
    const p = buildValidatedPayment(
      {
        chargeId: 'charge-usd',
        paidAt: '2026-08-14',
        amountReceived: 68000,
        currencyReceived: 'ARS',
        exchangeRate: 1500,
      },
      { ...usdCharge, reference_amount: 45 },
    );
    expect(p.reference_amount).toBe(45);
  });
});

describe('buildValidatedPayment · ARS → ARS', () => {
  it('exchange_rate null', () => {
    const p = buildValidatedPayment(
      {
        chargeId: 'charge-ars',
        paidAt: '2026-08-14',
        amountReceived: 100000,
        currencyReceived: 'ARS',
      },
      arsCharge,
    );
    expect(p.exchange_rate).toBeNull();
    expect(p.reference_currency).toBe('ARS');
    expect(p.amount_received).toBe(100000);
  });
});

describe('validaciones', () => {
  it('amount_received > 0', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-ars',
          paidAt: '2026-08-14',
          amountReceived: 0,
          currencyReceived: 'ARS',
        },
        arsCharge,
      ),
    ).toThrow(/mayor que 0/);
  });

  it('paid_at inválido', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-ars',
          paidAt: '14/08/2026',
          amountReceived: 1000,
          currencyReceived: 'ARS',
        },
        arsCharge,
      ),
    ).toThrow(/paid_at/);
  });

  it('charge id mismatch', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'otro',
          paidAt: '2026-08-14',
          amountReceived: 1000,
          currencyReceived: 'ARS',
        },
        arsCharge,
      ),
    ).toThrow(/Charge/);
  });

  it('NaN / Infinity', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-ars',
          paidAt: '2026-08-14',
          amountReceived: Number.NaN,
          currencyReceived: 'ARS',
        },
        arsCharge,
      ),
    ).toThrow(/inválido/);
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-ars',
          paidAt: '2026-08-14',
          amountReceived: Number.POSITIVE_INFINITY,
          currencyReceived: 'ARS',
        },
        arsCharge,
      ),
    ).toThrow(/inválido/);
  });

  it('moneda arbitraria', () => {
    expect(() =>
      buildValidatedPayment(
        {
          chargeId: 'charge-ars',
          paidAt: '2026-08-14',
          amountReceived: 1000,
          currencyReceived: 'EUR',
        },
        arsCharge,
      ),
    ).toThrow(/Moneda/);
  });
});

describe('defaults UI', () => {
  it('USD → default ARS recibido', () => {
    expect(defaultCurrencyReceived('USD')).toBe('ARS');
    expect(defaultCurrencyReceived('ARS')).toBe('ARS');
  });
});

describe('Cobrado este mes tras pagos', () => {
  it('suma ARS por paid_at sin mezclar USD', () => {
    const collected = calculateCollectedInMonth(
      [
        { paid_at: '2026-08-14', amount_received: 68062, currency_received: 'ARS' },
        { paid_at: '2026-08-15', amount_received: 100000, currency_received: 'ARS' },
        { paid_at: '2026-08-16', amount_received: 40, currency_received: 'USD' },
      ],
      '2026-08-14',
    );
    expect(collected.ars).toBe(168062);
    expect(collected.usd).toBe(40);
  });
});
