import { normalizePlanLabel } from '@/lib/finance/monthlyInvestmentPlan';
import type { FinanceAsset } from '@/lib/finance/types';

const PLATFORM_OPTIONS = ['Balanz', 'Exchange crypto', 'Banco', 'Otro'] as const;

export type EntryPlatform = (typeof PLATFORM_OPTIONS)[number];

export { PLATFORM_OPTIONS };

/** Prefill de activo/plataforma/etiqueta desde un chip del plan mensual. */
export function applyPendingPlanLabel(
  label: string,
  currentAsset: FinanceAsset | '',
  setAsset: (value: FinanceAsset | '') => void,
  setCategory: (value: string) => void,
  setPlatform: (value: EntryPlatform) => void,
): string {
  const norm = normalizePlanLabel(label);
  const base = norm.split(' ')[0] ?? norm;
  setCategory(base);

  if (base === 'BTC') {
    setAsset('BTC');
    setPlatform('Exchange crypto');
    return base;
  }
  if (base === 'ETH' || base === 'SOL') {
    setAsset('OTHER');
    setPlatform('Exchange crypto');
    return base;
  }
  if (!currentAsset) setAsset('CEDEAR');
  return base;
}
