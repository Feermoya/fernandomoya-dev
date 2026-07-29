import { useCallback, useEffect, useRef, useState } from 'react';
import { sileo } from 'sileo';
import type { FinanceDashboardCelebration } from '@/components/finance/FinanceDashboard';
import type { FinanceEntry, FinanceState } from '@/lib/finance/types';
import { triggerEntryHaptic } from '@/lib/finance/celebration';
import { buildEntryLoadSummary, type EntryLoadSummary } from '@/lib/finance/entry';
import {
  getLevelProgressPercent,
  getMonthlyLevel,
} from '@/lib/finance/levels';

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
  const [loadSummary, setLoadSummary] = useState<EntryLoadSummary | null>(null);
  const celebrationKeyRef = useRef(0);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(() => setCelebration(null), 1800);
    return () => clearTimeout(t);
  }, [celebration?.key]);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);
  const dismissLoadSummary = useCallback(() => setLoadSummary(null), []);

  const handleAddEntry = useCallback(
    (entry: FinanceEntry) => {
      let overlay: { level: number; title: string; icon: string; message?: string } | null = null;
      let dash: FinanceDashboardCelebration | null = null;
      let summary: EntryLoadSummary | null = null;

      persist((prev) => {
        const m = entry.month;
        const prevLevel = getMonthlyLevel(prev, m).level;
        const next: FinanceState = { ...prev, entries: [...prev.entries, entry] };
        const newLevel = getMonthlyLevel(next, m).level;

        summary = buildEntryLoadSummary({ prev, next, entry });

        if (summary.levelUp) {
          overlay = summary.levelUp;
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
        if (summary) {
          setLoadSummary(summary);
          sileo.success({
            title: summary.headline,
            description: summary.toastDescription,
          });
        }
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
    loadSummary,
    dismissLevelUp,
    dismissLoadSummary,
    handleAddEntry,
  };
}
