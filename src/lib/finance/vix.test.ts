import { describe, expect, it } from 'vitest';
import { parseCboeVixCsv, vixZone } from './vix';

describe('Cboe VIX validation', () => {
 const csv='DATE,OPEN,HIGH,LOW,CLOSE\n11/04/2026,20,21,19,19.2\n11/05/2026,29,30,26,28.3\n11/06/2026,27,28,23,25.64';
 it('reads newest daily close rather than max intraday', () => {
   const result = parseCboeVixCsv(csv,new Date('2026-11-09T15:00:00Z'));
   expect(result?.value).toBe(25.64); expect(result?.date).toBe('2026-11-06');
   expect(result?.percentileYear).toBe(67);
   expect(result?.stale).toBe(false);
 });
 it('rejects stale or malformed inputs',()=>{
   expect(parseCboeVixCsv('bad,row\n1,2')).toBeNull();
   expect(parseCboeVixCsv(csv,new Date('2026-12-01T15:00:00Z'))?.stale).toBe(true);
 });
 it('classifies volatility without claiming returns',()=>{
   expect(vixZone(13)).toBe('calma');expect(vixZone(27)).toBe('tension');expect(vixZone(44)).toBe('extrema');
 });
});
