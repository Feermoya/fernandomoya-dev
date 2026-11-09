import { describe, expect, it } from 'vitest';
import { getVixActionSignal, getVixNeedleTip, VIX_DIAL_CENTER, VIX_NEEDLE_LENGTH, vixDialRatio } from './vixSignal';

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

describe('centered, gently oscillating VIX needle', () => {
  it('points left, up and right for VIX 10, 30 and 50', () => {
    expect(getVixNeedleTip(10).x).toBeCloseTo(72);
    expect(getVixNeedleTip(10).y).toBeCloseTo(168);
    expect(getVixNeedleTip(30).x).toBeCloseTo(160);
    expect(getVixNeedleTip(30).y).toBeCloseTo(80);
    expect(getVixNeedleTip(50).x).toBeCloseTo(248);
    expect(getVixNeedleTip(50).y).toBeCloseTo(168);
  });

  it('keeps a fixed-radius tip so the needle always grows from the central axle', () => {
    for (const value of [10, 13, 25.64, 30, 45, 50]) {
      for (const pressure of [-2.2, -0.8, 0, 1.9, 2.2]) {
        const tip = getVixNeedleTip(value, pressure);
        expect(Math.hypot(tip.x - VIX_DIAL_CENTER.x, tip.y - VIX_DIAL_CENTER.y))
          .toBeCloseTo(VIX_NEEDLE_LENGTH);
      }
    }
  });

  it('makes a small but perceptible needle movement without falsifying the VIX', () => {
    const a = getVixNeedleTip(25.64, -1.9);
    const b = getVixNeedleTip(25.64, 1.9);
    const pixelMovement = Math.hypot(b.x - a.x, b.y - a.y);
    expect(pixelMovement).toBeGreaterThan(5);
    expect(pixelMovement).toBeLessThan(8);
    expect(vixDialRatio(25.64)).toBeCloseTo((25.64 - 10) / 40);
  });
});
