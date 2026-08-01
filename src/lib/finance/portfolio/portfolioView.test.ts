import { describe, expect, it } from 'vitest';
import { buildAttentionItems } from '@/lib/finance/attentionItems';
import type { MarketAlert } from '@/lib/finance/marketAlerts';
import {
  buildPortfolioHoldingViews,
  filterPortfolioViews,
  sortMarketAlertsForDisplay,
  sortPortfolioViews,
  summarizePortfolioViews,
} from '@/lib/finance/portfolio/portfolioView';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

const holding = (partial: Partial<FinancePortfolioHolding>): FinancePortfolioHolding => ({
  id: partial.id ?? 'h1',
  ticker: partial.ticker ?? 'AMZN',
  quantity: partial.quantity ?? 10,
  averagePurchasePrice: partial.averagePurchasePrice ?? 100,
  currency: partial.currency ?? 'ARS',
  source: partial.source ?? 'manual',
  createdAt: partial.createdAt ?? '2024-01-01T00:00:00.000Z',
  updatedAt: partial.updatedAt ?? '2024-06-01T00:00:00.000Z',
  ...partial,
});

describe('portfolioView', () => {
  it('summarizes ARS and USD separately', () => {
    const views = buildPortfolioHoldingViews(
      [
        holding({ ticker: 'AMZN', quantity: 2, averagePurchasePrice: 1000, currency: 'ARS' }),
        holding({ id: '2', ticker: 'BTC', quantity: 1, averagePurchasePrice: 50, currency: 'USD' }),
      ],
      {
        AMZN: {
          ticker: 'AMZN',
          exchange: 'BCBA',
          price: 1200,
          currency: 'ARS',
          source: 'google-finance',
          fetchedAt: 'x',
          url: '',
        },
        BTC: {
          ticker: 'BTC',
          exchange: 'CCC',
          price: 40,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: 'x',
          url: '',
        },
      },
    );
    const summary = summarizePortfolioViews(views);
    expect(summary.count).toBe(2);
    expect(summary.byCurrency).toHaveLength(2);
    expect(summary.gainCount).toBe(1);
    expect(summary.lossCount).toBe(1);
  });

  it('filters and sorts by loss first', () => {
    const views = buildPortfolioHoldingViews(
      [
        holding({ id: 'a', ticker: 'AAA', averagePurchasePrice: 100 }),
        holding({ id: 'b', ticker: 'BBB', averagePurchasePrice: 100 }),
      ],
      {
        AAA: {
          ticker: 'AAA',
          exchange: 'X',
          price: 80,
          currency: 'ARS',
          source: 'google-finance',
          fetchedAt: 'x',
          url: '',
        },
        BBB: {
          ticker: 'BBB',
          exchange: 'X',
          price: 130,
          currency: 'ARS',
          source: 'google-finance',
          fetchedAt: 'x',
          url: '',
        },
      },
    );
    const lossOnly = filterPortfolioViews(views, 'loss', '');
    expect(lossOnly).toHaveLength(1);
    expect(lossOnly[0].holding.ticker).toBe('AAA');
    const sorted = sortPortfolioViews(views, 'loss');
    expect(sorted[0].holding.ticker).toBe('AAA');
  });
});

describe('sortMarketAlertsForDisplay', () => {
  it('prioritizes loss-since-buy', () => {
    const alerts = [
      { kind: 'daily-rise', changePercent: 5, severity: 'positive' },
      { kind: 'loss-since-buy', changePercent: -10, severity: 'opportunity' },
      { kind: 'daily-drop', changePercent: -4, severity: 'opportunity' },
    ];
    const sorted = sortMarketAlertsForDisplay(alerts);
    expect(sorted[0].kind).toBe('loss-since-buy');
    expect(sorted[1].kind).toBe('daily-drop');
  });
});

describe('buildAttentionItems', () => {
  it('caps at 3 and includes plan pending', () => {
    const alerts: MarketAlert[] = [
      {
        id: 'loss-since-buy:MSTR',
        ticker: 'MSTR',
        kind: 'loss-since-buy',
        title: 'MSTR abajo',
        detail: '',
        severity: 'opportunity',
        changePercent: -25.9,
      },
    ];
    const items = buildAttentionItems({
      planPendingCount: 6,
      planTotalCount: 10,
      monthInvested: 100_000,
      targetAmount: 500_000,
      alerts,
      concentration: {
        items: [
          { label: 'YPFD', amount: 260_000, count: 1, percent: 26 },
          { label: 'OTHER', amount: 740_000, count: 2, percent: 74 },
        ],
        topItem: { label: 'YPFD', amount: 260_000, count: 1, percent: 26 },
        total: 1_000_000,
        concentrationWarning: false,
      },
    });
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0].title).toContain('6 activos');
    expect(items.some((i) => i.title.includes('MSTR'))).toBe(true);
  });
});
