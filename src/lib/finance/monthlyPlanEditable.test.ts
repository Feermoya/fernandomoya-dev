import { describe, expect, it } from 'vitest';
import { createMonthlyInvestmentPlanItems, editMonthlyInvestmentPlanItem, getMonthlyPlanItems } from './monthlyInvestmentPlan';
import { getInitialFinanceState } from './storage';
import { getMonthlyLevel, getMonthlyMissionView } from './levels';
import type { FinanceEntry } from './types';

describe('editable monthly investment plan', () => {
 it('never re-adds SPY as a mandatory investment', () => {
   expect(getMonthlyPlanItems([], '2026-11')).toEqual([]);
   const items = createMonthlyInvestmentPlanItems({month:'2026-11',rawInput:'ETH, IBIT',existingItems:[]});
   expect(getMonthlyPlanItems(items, '2026-11').map(x=>x.label)).toEqual(['ETH','IBIT']);
   expect(getMonthlyPlanItems(items.filter(x=>x.label!=='ETH'),'2026-11').map(x=>x.label)).toEqual(['IBIT']);
 });
 it('edits an existing plan item without affecting other months', () => {
   const old = createMonthlyInvestmentPlanItems({month:'2026-10',rawInput:'MU',existingItems:[]});
   const now = createMonthlyInvestmentPlanItems({month:'2026-11',rawInput:'SPY',existingItems:old});
   const result = editMonthlyInvestmentPlanItem([...old,...now],now[0].id,'BTC',0.005);
   expect(result[1]).toMatchObject({id:now[0].id,label:'BTC',targetUnits:0.005,month:'2026-11'});
   expect(result[0]).toEqual(old[0]);
   expect(now[0].label).toBe('SPY');
 });
});
describe('personal monthly target', () => {
 it('changes the dashboard goal without changing the level rules', () => {
   const entry: FinanceEntry={id:'a',month:'2026-11',type:'investment',amount:200000,asset:'ETF',createdAt:'2026-11-03T00:00:00.000Z'};
   const state={...getInitialFinanceState(),entries:[entry],currentMonth:'2026-11'};
   const level=getMonthlyLevel(state,'2026-11').level;
   const custom={...state,monthlyInvestmentTargets:{'2026-11':500000}};
   expect(getMonthlyMissionView(custom,'2026-11').targetAmount).toBe(500000);
   expect(getMonthlyMissionView(custom,'2026-11').percent).toBe(40);
   expect(getMonthlyLevel(custom,'2026-11').level).toBe(level);
 });
});
