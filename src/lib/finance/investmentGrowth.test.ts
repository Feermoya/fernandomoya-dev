import { describe, expect, it } from 'vitest';
import { buildInvestmentTimeline, buildYearlyTimeline } from './investmentGrowth';
import type { FinanceEntry } from '@/lib/finance/types';

const entry = (id: string, month: string, amount: number, amountCurrency: 'USD' | 'ARS' = 'ARS'): FinanceEntry => ({
 id, month, amount, amountCurrency, createdAt: month + '-03T00:00:00.000Z',
 type: 'investment', asset: 'ETF',
});
describe('investment contribution timeline', () => {
 it('includes empty months while preserving an all-time cumulative sum', () => {
   const points = buildInvestmentTimeline([entry('a','2025-12',200),entry('b','2026-02',300)],'2026-03');
   expect(points.map(p=>p.month)).toEqual(['2025-12','2026-01','2026-02','2026-03']);
   expect(points.map(p=>p.cumulativeArs)).toEqual([200,200,500,500]);
 });
 it('never sums USD contributions into ARS', () => {
   const points = buildInvestmentTimeline([entry('a','2025-01',400),entry('b','2025-02',25,'USD')],'2025-02');
   expect(points.at(-1)).toMatchObject({cumulativeArs:400,cumulativeUsd:25});
 });
 it('yearly view starts again in January without losing historical entries', () => {
   const rows = [entry('a','2025-12',400),entry('b','2026-02',50)];
   expect(buildYearlyTimeline(rows,2026,'2026-02').at(-1)?.cumulativeArs).toBe(50);
   expect(buildInvestmentTimeline(rows,'2026-02').at(-1)?.cumulativeArs).toBe(450);
 });
 it('does not confuse sales and valuations with new invested capital', () => {
   const sale = {...entry('sale','2026-01',500),type:'investment_sale' as const};
   expect(buildInvestmentTimeline([sale], '2026-02')).toEqual([]);
 });
});
