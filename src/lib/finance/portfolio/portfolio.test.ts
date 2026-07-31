import { describe, expect, it } from 'vitest';
import {
  buildConsolidatedPortfolio,
  holdingsFromCsvPreview,
  mergePortfolioHoldings,
  normalizeAndValidateHolding,
  normalizePortfolioHoldings,
  parsePortfolioCsv,
  weightedAveragePrice,
} from '@/lib/finance/portfolio';
import { importFinanceState } from '@/lib/finance/storage';
import { buildMarketAlerts } from '@/lib/finance/marketAlerts';
import type { FinanceEntry } from '@/lib/finance/types';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

const baseHolding = (partial: Partial<FinancePortfolioHolding>): FinancePortfolioHolding => ({
  id: partial.id ?? 'h1',
  ticker: partial.ticker ?? 'AAPL',
  quantity: partial.quantity ?? 10,
  averagePurchasePrice: partial.averagePurchasePrice ?? 100,
  currency: partial.currency ?? 'USD',
  source: partial.source ?? 'manual',
  createdAt: partial.createdAt ?? '2024-01-01T00:00:00.000Z',
  updatedAt: partial.updatedAt ?? '2024-01-01T00:00:00.000Z',
  ...partial,
});

describe('portfolio holdings validation', () => {
  it('normalizes ticker and rejects invalid quantity', () => {
    const ok = normalizeAndValidateHolding({
      ticker: ' aapl ',
      quantity: 2,
      averagePurchasePrice: 190.5,
      currency: 'USD',
      source: 'manual',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.holding.ticker).toBe('AAPL');

    const bad = normalizeAndValidateHolding({
      ticker: 'AAPL',
      quantity: 0,
      averagePurchasePrice: 10,
      currency: 'USD',
    });
    expect(bad.ok).toBe(false);
  });

  it('defaults missing portfolioHoldings to [] on import', () => {
    const json = JSON.stringify({
      entries: [],
      goals: [],
      challenges: [],
      currentMonth: '2026-07',
    });
    const result = importFinanceState(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.portfolioHoldings).toEqual([]);
    }
  });

  it('keeps valid portfolioHoldings on import and drops garbage', () => {
    const json = JSON.stringify({
      entries: [],
      goals: [],
      challenges: [],
      currentMonth: '2026-07',
      portfolioHoldings: [
        baseHolding({ ticker: 'SPY' }),
        { ticker: 'BAD', quantity: -1, averagePurchasePrice: 1, currency: 'USD' },
      ],
    });
    const result = importFinanceState(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.portfolioHoldings).toHaveLength(1);
      expect(result.state.portfolioHoldings?.[0].ticker).toBe('SPY');
    }
  });
});

describe('weighted average and merge', () => {
  it('computes weighted average correctly', () => {
    expect(weightedAveragePrice(10, 100, 10, 200)).toBe(150);
  });

  it('combines duplicate ticker+currency', () => {
    const existing = [baseHolding({ id: 'a', quantity: 10, averagePurchasePrice: 100 })];
    const incoming = [baseHolding({ id: 'b', quantity: 10, averagePurchasePrice: 200 })];
    const merged = mergePortfolioHoldings({
      existing,
      incoming,
      strategy: 'combine',
      nowIso: '2026-07-31T00:00:00.000Z',
    });
    expect(merged.combined).toBe(1);
    expect(merged.holdings[0].quantity).toBe(20);
    expect(merged.holdings[0].averagePurchasePrice).toBe(150);
    expect(merged.holdings[0].id).toBe('a');
  });

  it('replaces and ignores', () => {
    const existing = [baseHolding({ id: 'a', quantity: 1, averagePurchasePrice: 50 })];
    const incoming = [baseHolding({ id: 'b', quantity: 5, averagePurchasePrice: 90 })];
    const replaced = mergePortfolioHoldings({
      existing,
      incoming,
      strategy: 'replace',
    });
    expect(replaced.replaced).toBe(1);
    expect(replaced.holdings[0].quantity).toBe(5);
    expect(replaced.holdings[0].id).toBe('a');

    const ignored = mergePortfolioHoldings({
      existing,
      incoming,
      strategy: 'ignore',
    });
    expect(ignored.ignored).toBe(1);
    expect(ignored.holdings[0].quantity).toBe(1);
  });
});

describe('csv import', () => {
  it('parses standard headers', () => {
    const csv = `ticker,quantity,averagePurchasePrice,currency,broker,purchaseDate
AAPL,10,190.50,USD,Balanz,2024-05-10
SPY,3,520,USD,InvertirOnline,2025-01-12`;
    const parsed = parsePortfolioCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.validCount).toBe(2);
    expect(holdingsFromCsvPreview(parsed.rows)).toHaveLength(2);
  });

  it('accepts alternate headers', () => {
    const csv = `simbolo,cantidad,precio_promedio,moneda
GGAL,100,1200,ARS`;
    const parsed = parsePortfolioCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.rows[0].holding?.ticker).toBe('GGAL');
  });

  it('marks invalid rows', () => {
    const csv = `ticker,quantity,averagePurchasePrice,currency
AAPL,0,100,USD`;
    const parsed = parsePortfolioCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.invalidCount).toBe(1);
  });
});

describe('consolidation and alerts', () => {
  it('consolidates holdings without inventing entry units', () => {
    const entries: FinanceEntry[] = [
      {
        id: 'e1',
        month: '2026-07',
        type: 'investment',
        amount: 50_000,
        createdAt: '2026-07-01T00:00:00.000Z',
        ticker: 'MELI',
        buyPrice: 10_000,
        buyCurrency: 'ARS',
      },
    ];
    const holdings = [baseHolding({ ticker: 'AAPL', quantity: 2, averagePurchasePrice: 200 })];
    const positions = buildConsolidatedPortfolio(entries, holdings);
    const aapl = positions.find((p) => p.ticker === 'AAPL');
    const meli = positions.find((p) => p.ticker === 'MELI');
    expect(aapl?.quantity).toBe(2);
    expect(aapl?.sources.historicalHoldings).toBe(true);
    expect(meli?.sources.entries).toBe(true);
    expect(meli?.limitation).toBeTruthy();
  });

  it('does not mix ARS and USD averages', () => {
    const holdings = [
      baseHolding({ id: '1', ticker: 'XYZ', currency: 'ARS', quantity: 1, averagePurchasePrice: 100 }),
      baseHolding({ id: '2', ticker: 'XYZ', currency: 'USD', quantity: 1, averagePurchasePrice: 10 }),
    ];
    // consolidate groups by ticker only — two currencies → limitation
    const positions = buildConsolidatedPortfolio([], holdings);
    expect(positions).toHaveLength(1);
    expect(positions[0].limitation).toMatch(/monedas/i);
    expect(positions[0].averagePurchasePrice).toBeUndefined();
  });

  it('builds alerts from holdings buy price', () => {
    const holdings = [
      baseHolding({ ticker: 'TSLA', quantity: 1, averagePurchasePrice: 100, currency: 'USD' }),
    ];
    const alerts = buildMarketAlerts({
      entries: [],
      holdings,
      prices: {
        TSLA: {
          ticker: 'TSLA',
          exchange: 'NMS',
          price: 120,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: '2026-07-31T00:00:00.000Z',
          url: 'https://example.com',
        },
      },
    });
    expect(alerts.some((a) => a.kind === 'gain-since-buy')).toBe(true);
  });

  it('normalizePortfolioHoldings returns [] for non-array', () => {
    expect(normalizePortfolioHoldings(undefined)).toEqual([]);
    expect(normalizePortfolioHoldings(null)).toEqual([]);
  });
});
