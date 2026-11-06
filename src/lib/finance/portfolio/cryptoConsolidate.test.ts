import { describe, expect, it } from 'vitest';
import { buildConsolidatedPortfolio } from './consolidate';
import type { FinanceEntry } from '@/lib/finance/types';

describe('Binance holdings in the consolidated portfolio', () => {
  it('keeps the exact ETH quantity in ARS even without a live price', () => {
    const entry: FinanceEntry = {
      id: 'eth', month: '2026-11', type: 'investment',
      amount: 50000, amountCurrency: 'ARS', asset: 'CRYPTO',
      platform: 'Binance', ticker: 'ETH', category: 'ETH', estimatedUnits: 0.01234567,
      quantitySource: 'actual', createdAt: '2026-11-06T00:00:00Z',
    };
    const [eth] = buildConsolidatedPortfolio([entry]);
    expect(eth.quantity).toBe(0.01234567);
    expect(eth.investedAmountByCurrency.ARS).toBe(50000);
    expect(eth.averagePurchasePrice).toBeUndefined();
  });

  it('does not present a Binance USDT reference as an ARS average', () => {
    const entry: FinanceEntry = {
      id: 'btc', month: '2026-11', type: 'investment',
      amount: 120000, amountCurrency: 'ARS', asset: 'CRYPTO',
      platform: 'Binance', category: 'BTC', ticker: 'BTC',
      estimatedUnits: 0.0005, buyPrice: 75000, buyCurrency: 'USD',
      createdAt: '2026-11-06T00:00:00Z',
    };
    const [btc] = buildConsolidatedPortfolio([entry]);
    expect(btc.quantity).toBe(0.0005);
    expect(btc.averagePurchasePrice).toBeUndefined();
    expect(btc.currency).toBe('ARS');
    expect(btc.limitation).toContain('monedas distintas');
  });
});
