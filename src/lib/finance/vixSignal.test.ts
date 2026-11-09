import { describe, expect, it } from 'vitest';
import { getVixActionSignal, vixDialRatio } from './vixSignal';

describe('VIX interpretation and tachometer', () => {
  it('high uncertainty highlights opportunities conditionally', () => {
    const result = getVixActionSignal(25.64, 67);
    expect(result.tone).toBe('opportunity');
    expect(result.badge).toContain('compra');
    expect(result.message).toContain('podrían');
  });
  it('extreme VIX mentions the risk of new falls', () => {
    const result = getVixActionSignal(45, 95);
    expect(result.tone).toBe('opportunity');
    expect(result.message).toMatch(/riesgo/);
  });
  it('calm conditions invite caution, not a claim of overpricing', () => {
    const result = getVixActionSignal(13, 25);
    expect(result.tone).toBe('caution');
    expect(result.badge).toContain('No te apures');
    expect(result.message).not.toMatch(/están caras|sobreprecio/);
  });
  it('ordinary market yields neutral copy', () => {
    expect(getVixActionSignal(20, 48).tone).toBe('neutral');
  });
  it('clamps the needle and ignores nonsensical input', () => {
    expect(vixDialRatio(10)).toBe(0);
    expect(vixDialRatio(30)).toBe(0.5);
    expect(vixDialRatio(50)).toBe(1);
    expect(vixDialRatio(90)).toBe(1);
    expect(vixDialRatio(Number.NaN)).toBe(0);
  });
});
