export type GrowthMilestoneScale = {
  step: number;
  max: number;
  milestones: number[];
  next: number;
  reachedCount: number;
};

/**
 * Human-friendly investment milestones in ARS. Keep at least two visible
 * milestones ABOVE the current contribution balance, so growth has headroom.
 */
export function createGrowthMilestoneScale(currentRaw: number): GrowthMilestoneScale {
  const current = Number.isFinite(currentRaw) ? Math.max(0, currentRaw) : 0;
  const target = Math.max(1000, current / 4);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const fraction = target / magnitude;
  const nice = [1, 2, 2.5, 5, 10].find(n => n >= fraction) ?? 10;
  const step = Math.max(1000, nice * magnitude);
  const reachedCount = Math.floor(current / step);
  const max = (reachedCount + 2) * step;
  const milestones = Array.from({ length: reachedCount + 2 }, (_, index) => (index + 1) * step);
  return { step, max, milestones, next: (reachedCount + 1) * step, reachedCount };
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value);
}

/** Compact SVG labels, never a currency conversion. */
export function formatGrowthMilestone(value: number): string {
  if (value >= 1_000_000) return '$' + formatAmount(value / 1_000_000) + ' M';
  if (value >= 1_000) return '$' + formatAmount(value / 1_000) + ' mil';
  return '$' + formatAmount(value);
}
