import { useCallback, useEffect, useRef, useState } from 'react';
import { sileo } from 'sileo';
import type { FinanceDashboardCelebration } from '@/components/finance/FinanceDashboard';
import type { FinanceEntry, FinanceState } from '@/lib/finance/types';
import { formatARS, getMonthlyInvested } from '@/lib/finance/calculations';
import { triggerEntryHaptic } from '@/lib/finance/celebration';
import { getEntryTicker } from '@/lib/finance/entryTicker';
import { getLevelTheme } from '@/lib/finance/levelTheme';
import {
  getLevelProgressPercent,
  getMonthlyLevel,
  getMonthlyMissionView,
} from '@/lib/finance/levels';
import {
  formatPlanMissingListForToast,
  getMonthlyPlanProgress,
  getNewlyCompletedPlanLabels,
} from '@/lib/finance/monthlyInvestmentPlan';

function levelUpMessageFor(nextLevel: number): string | undefined {
  if (nextLevel === 2) return 'Ahora estás construyendo repetición, no entusiasmo.';
  return undefined;
}

type Options = {
  persist: (updater: (prev: FinanceState) => FinanceState) => void;
};

export function useFinanceCelebrations({ persist }: Options) {
  const [levelUp, setLevelUp] = useState<{
    level: number;
    title: string;
    icon: string;
    message?: string;
  } | null>(null);
  const [celebration, setCelebration] = useState<FinanceDashboardCelebration | null>(null);
  const celebrationKeyRef = useRef(0);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(() => setCelebration(null), 1800);
    return () => clearTimeout(t);
  }, [celebration?.key]);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  const handleAddEntry = useCallback(
    (entry: FinanceEntry) => {
      let overlay: { level: number; title: string; icon: string; message?: string } | null = null;
      let dash: FinanceDashboardCelebration | null = null;
      let toastTitle = 'Inversión cargada';
      let toastDescription = formatARS(entry.amount);

      persist((prev) => {
        const m = entry.month;
        const beforePlan = getMonthlyPlanProgress({
          plan: prev.monthlyInvestmentPlan,
          entries: prev.entries,
          month: m,
        });
        const prevLevel = getMonthlyLevel(prev, m).level;
        const next: FinanceState = { ...prev, entries: [...prev.entries, entry] };
        const afterPlan = getMonthlyPlanProgress({
          plan: next.monthlyInvestmentPlan,
          entries: next.entries,
          month: m,
        });
        const newLevel = getMonthlyLevel(next, m).level;
        const inv = getMonthlyInvested(next.entries, m);
        const mv = getMonthlyMissionView(next, m);
        const ticker = getEntryTicker(entry) ?? entry.category ?? entry.asset;

        const subParts: string[] = [
          ticker ? `${formatARS(entry.amount)} en ${ticker}` : formatARS(entry.amount),
          `${formatARS(inv)} este mes · ${mv.percent.toFixed(0)}% del objetivo`,
        ];
        if (afterPlan.totalCount > 0 && afterPlan.completedCount > beforePlan.completedCount) {
          const newlyDone = getNewlyCompletedPlanLabels(beforePlan, afterPlan);
          if (newlyDone.length > 0) {
            subParts.push(
              newlyDone.length === 1
                ? `Compraste ${newlyDone[0]}`
                : `Compraste ${newlyDone.join(', ')}`,
            );
          }
          if (afterPlan.completedCount >= afterPlan.totalCount) {
            subParts.push('Plan de foco completo');
          } else {
            const missing = formatPlanMissingListForToast(afterPlan.missingLabels);
            if (missing) subParts.push(`Te falta ${missing}`);
          }
        }

        toastTitle = 'Inversión cargada';
        toastDescription = subParts.join(' · ');

        if (newLevel > prevLevel) {
          const info = getMonthlyLevel(next, m);
          const th = getLevelTheme(newLevel);
          overlay = {
            level: newLevel,
            title: info.title,
            icon: th.icon,
            message: levelUpMessageFor(newLevel),
          };
          if (m === prev.currentMonth) {
            celebrationKeyRef.current += 1;
            dash = {
              key: celebrationKeyRef.current,
              barFrom: getLevelProgressPercent(prev, m, prevLevel),
              barTo: getLevelProgressPercent(next, m, newLevel),
            };
          }
        }
        return next;
      });

      queueMicrotask(() => {
        sileo.success({
          title: toastTitle,
          description: toastDescription,
        });
        setConfettiKey((k) => k + 1);
        triggerEntryHaptic();
        if (overlay) setLevelUp(overlay);
        if (dash) setCelebration(dash);
      });
    },
    [persist],
  );

  return {
    levelUp,
    celebration,
    confettiKey,
    dismissLevelUp,
    handleAddEntry,
  };
}
