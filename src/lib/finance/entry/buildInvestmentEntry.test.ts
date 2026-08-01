import { describe, expect, it } from 'vitest';
import { buildInvestmentEntry } from '@/lib/finance/entry/buildInvestmentEntry';
import {
  amountFromUnits,
  normalizeAmountCurrency,
} from '@/lib/finance/entry/inputModes';
import {
  entryAmountCurrency,
  getMonthlyInvested,
  getTotalInvested,
} from '@/lib/finance/calculations';
import type { FinanceEntry } from '@/lib/finance/types';
import type { FinancePrice } from '@/lib/finance/financePrices';

const price = (partial: Partial<FinancePrice> & Pick<FinancePrice, 'ticker' | 'price'>): FinancePrice => ({
  exchange: 'BCBA',
  currency: 'ARS',
  source: 'google-finance',
  fetchedAt: '2026-07-29T12:00:00.000Z',
  url: '',
  ...partial,
});

describe('amountCurrency helpers', () => {
  it('normalizes currency and treats legacy as ARS', () => {
    expect(normalizeAmountCurrency('usd')).toBe('USD');
    expect(normalizeAmountCurrency('ARS')).toBe('ARS');
    expect(normalizeAmountCurrency(undefined)).toBe('ARS');
    expect(entryAmountCurrency({})).toBe('ARS');
    expect(entryAmountCurrency({ amountCurrency: 'USD' })).toBe('USD');
  });

  it('rounds USD amounts to cents and ARS to whole pesos', () => {
    expect(amountFromUnits(1.5, 10.333, 'USD')).toBe(15.5);
    expect(amountFromUnits(1.5, 1000.4, 'ARS')).toBe(1501);
  });

  it('sums invested amounts per currency', () => {
    const entries: FinanceEntry[] = [
      {
        id: '1',
        month: '2026-07',
        type: 'investment',
        amount: 100_000,
        createdAt: 'a',
      },
      {
        id: '2',
        month: '2026-07',
        type: 'investment',
        amount: 50,
        amountCurrency: 'USD',
        createdAt: 'b',
      },
      {
        id: '3',
        month: '2026-06',
        type: 'investment',
        amount: 25,
        amountCurrency: 'USD',
        createdAt: 'c',
      },
    ];
    expect(getMonthlyInvested(entries, '2026-07', 'ARS')).toBe(100_000);
    expect(getMonthlyInvested(entries, '2026-07', 'USD')).toBe(50);
    expect(getTotalInvested(entries, 'USD')).toBe(75);
  });
});

describe('buildInvestmentEntry', () => {
  it('loads amount mode in ARS by default', async () => {
    const result = await buildInvestmentEntry({
      mode: 'amount',
      amountRaw: '150000',
      unitsRaw: '',
      month: '2026-07',
      asset: '',
      platform: 'Balanz',
      category: '',
      note: '',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.amount).toBe(150_000);
    expect(result.entry.amountCurrency).toBe('ARS');
  });

  it('loads amount mode in USD with cents', async () => {
    const result = await buildInvestmentEntry({
      mode: 'amount',
      amountRaw: '99.999',
      unitsRaw: '',
      amountCurrency: 'USD',
      month: '2026-07',
      asset: '',
      platform: 'Balanz',
      category: 'MEP',
      note: '',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.amount).toBe(100);
    expect(result.entry.amountCurrency).toBe('USD');
    expect(result.entry.asset).toBe('USD');
  });

  it('loads units mode using USD price currency', async () => {
    const result = await buildInvestmentEntry({
      mode: 'units',
      amountRaw: '',
      unitsRaw: '2',
      month: '2026-07',
      asset: '',
      platform: 'Balanz',
      category: 'AAPL',
      note: '',
      cachedPrice: price({
        ticker: 'AAPL',
        price: 150.25,
        currency: 'USD',
        exchange: 'NASDAQ',
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.amount).toBe(300.5);
    expect(result.entry.amountCurrency).toBe('USD');
    expect(result.entry.estimatedUnits).toBe(2);
    expect(result.entry.buyCurrency).toBe('USD');
  });

  it('loads units mode using ARS price currency', async () => {
    const result = await buildInvestmentEntry({
      mode: 'units',
      amountRaw: '',
      unitsRaw: '10',
      month: '2026-07',
      asset: 'CEDEAR',
      platform: 'Balanz',
      category: 'MELI',
      note: '',
      cachedPrice: price({
        ticker: 'MELI',
        price: 12_345.6,
        currency: 'ARS',
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.amount).toBe(123_456);
    expect(result.entry.amountCurrency).toBe('ARS');
    expect(result.entry.estimatedUnits).toBe(10);
  });
});
