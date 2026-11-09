import { describe, expect, it } from 'vitest';
import { createGrowthMilestoneScale, formatGrowthMilestone } from './growthMilestones';

describe('capital milestones inside the growth chart', () => {
  it('shows achieved amounts and upcoming milestones for the current portfolio', () => {
    const result = createGrowthMilestoneScale(7_385_990);
    expect(result.step).toBe(2_000_000);
    expect(result.max).toBe(10_000_000);
    expect(result.next).toBe(8_000_000);
    expect(result.milestones).toEqual([2_000_000,4_000_000,6_000_000,8_000_000,10_000_000]);
    expect(result.reachedCount).toBe(3);
  });
  it('increments the next milestone after crossing a round amount', () => {
    expect(createGrowthMilestoneScale(8_000_000).next).toBeGreaterThan(8_000_000);
  });
  it('scales to small and large amounts without negative or infinite values', () => {
    for (const amount of [0,1_200,250_000,45_000_000,2_000_000_000,Number.NaN]) {
      const scale=createGrowthMilestoneScale(amount);
      expect(scale.max).toBeGreaterThan(Math.max(0,Number.isFinite(amount)?amount:0));
      expect(scale.milestones.length).toBeGreaterThanOrEqual(2);
      expect(scale.milestones.length).toBeLessThanOrEqual(6);
    }
  });
  it('formats labels for inside the chart', () => {
    expect(formatGrowthMilestone(2_000_000)).toBe('$2 M');
    expect(formatGrowthMilestone(8_000_000)).toBe('$8 M');
    expect(formatGrowthMilestone(500_000)).toBe('$500 mil');
  });
});
