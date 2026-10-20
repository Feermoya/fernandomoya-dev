import { describe, expect, it } from 'vitest';
import { leadOf, leadPulse, stepScore } from '@/components/tournaments/motion/motionConfig';

describe('stepScore', () => {
  it('no cambia en los límites', () => {
    expect(stepScore(0, -1)).toEqual({ value: 0, changed: false, direction: 0 });
    expect(stepScore(99, 1)).toEqual({ value: 99, changed: false, direction: 0 });
  });

  it('sube y baja un gol', () => {
    expect(stepScore(2, 1)).toEqual({ value: 3, changed: true, direction: 1 });
    expect(stepScore(2, -1)).toEqual({ value: 1, changed: true, direction: -1 });
  });
});

describe('leadPulse', () => {
  it('marca quién pasa a mandar desde el empate', () => {
    expect(leadOf(2, 2)).toBe('level');
    expect(leadPulse('level', leadOf(3, 2))).toBe('home');
    expect(leadPulse('level', leadOf(1, 2))).toBe('away');
  });

  it('vuelve a neutro cuando un gol empata', () => {
    expect(leadPulse('away', 'level')).toBe('level');
    expect(leadPulse('home', 'level')).toBe('level');
  });

  it('no celebra si la ventaja no cambia', () => {
    expect(leadPulse('home', 'home')).toBeNull();
    expect(leadPulse('away', 'home')).toBeNull();
  });
});
