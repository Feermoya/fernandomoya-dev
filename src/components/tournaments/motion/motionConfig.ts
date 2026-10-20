export const lfEaseOut = [0.16, 1, 0.3, 1] as const;

export const lfDuration = {
  press: 0.12,
  score: 0.22,
  goal: 0.55,
  chip: 0.16,
  draw: 0.46,
  reveal: 0.78,
  row: 0.28,
  rank: 0.42,
  champion: 1.15,
} as const;

export const lfSpring = {
  layout: { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.85 },
};

export type ScoreDirection = 1 | -1 | 0;
export type ScoreLead = 'home' | 'away' | 'level';

export function clampScore(value: number): number {
  return Math.min(99, Math.max(0, value));
}

export function stepScore(current: number, delta: 1 | -1): {
  value: number;
  changed: boolean;
  direction: ScoreDirection;
} {
  const value = clampScore(current + delta);
  if (value === current) return { value: current, changed: false, direction: 0 };
  return { value, changed: true, direction: delta };
}

export function leadOf(home: number, away: number): ScoreLead {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'level';
}

/** Solo los dos cambios que pide el marcador: empate → ventaja, o desventaja → empate. */
export function leadPulse(before: ScoreLead, after: ScoreLead): ScoreLead | null {
  if (before === after) return null;
  if (before === 'level' && after !== 'level') return after;
  if (before !== 'level' && after === 'level') return 'level';
  return null;
}
