import { describe, expect, it } from 'vitest';
import { drawMatch } from '@/lib/tournaments/draw';

describe('drawMatch', () => {
  it('arma 1v1 con 2 jugadores', () => {
    const result = drawMatch(['a', 'b'], 'solo', () => 0);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.mode).toBe('solo');
    expect(result.participants).toHaveLength(2);
    expect(result.resting).toHaveLength(0);
  });

  it('con 7 jugadores en 2v2 deja 3 descansando', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = drawMatch(ids, 'pairs', () => 0.1);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.participants).toHaveLength(4);
    expect(result.resting).toHaveLength(3);
  });

  it('rechaza 2v2 con menos de 4', () => {
    const result = drawMatch(['a', 'b', 'c'], 'pairs');
    expect('error' in result).toBe(true);
  });
});
