import { useCallback, useMemo } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  copyMonthlyPlanItemsToMonth,
  createMonthlyInvestmentPlanItems,
  getMonthlyPlanProgress,
  getMonthlyPlanUserItems,
  getPreviousMonthKey,
} from '@/lib/finance/monthlyInvestmentPlan';

type Options = {
  state: FinanceState;
  month: string;
  persist: (updater: (prev: FinanceState) => FinanceState) => void;
};

export function useFinanceMonthlyPlanActions({ state, month, persist }: Options) {
  const previousMonth = useMemo(() => getPreviousMonthKey(month), [month]);

  const currentPlanProgress = useMemo(
    () =>
      getMonthlyPlanProgress({
        plan: state.monthlyInvestmentPlan,
        entries: state.entries,
        month,
      }),
    [state.monthlyInvestmentPlan, state.entries, month],
  );

  const pendingPlanLabels = useMemo(
    () => currentPlanProgress.items.filter((x) => !x.completed).map((x) => x.item.label),
    [currentPlanProgress.items],
  );

  const currentMonthPlan = useMemo(
    () => getMonthlyPlanUserItems(state.monthlyInvestmentPlan, month),
    [state.monthlyInvestmentPlan, month],
  );

  const previousMonthPlan = useMemo(
    () => getMonthlyPlanUserItems(state.monthlyInvestmentPlan, previousMonth),
    [state.monthlyInvestmentPlan, previousMonth],
  );

  const hasPreviousMonthPlan = currentMonthPlan.length === 0 && previousMonthPlan.length > 0;

  const addMonthlyPlanItems = useCallback(
    (rawInput: string) => {
      persist((prev) => {
        const newItems = createMonthlyInvestmentPlanItems({
          month,
          rawInput,
          existingItems: prev.monthlyInvestmentPlan ?? [],
        });
        if (newItems.length === 0) return prev;
        return {
          ...prev,
          monthlyInvestmentPlan: [...(prev.monthlyInvestmentPlan ?? []), ...newItems],
        };
      });
    },
    [month, persist],
  );

  const copyMonthlyPlanFromPreviousMonth = useCallback(() => {
    persist((prev) => {
      const copied = copyMonthlyPlanItemsToMonth({
        plan: prev.monthlyInvestmentPlan,
        fromMonth: previousMonth,
        toMonth: month,
      });
      if (copied.length === 0) return prev;
      return {
        ...prev,
        monthlyInvestmentPlan: [...(prev.monthlyInvestmentPlan ?? []), ...copied],
      };
    });
  }, [month, previousMonth, persist]);

  const removeMonthlyPlanItem = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        monthlyInvestmentPlan: (prev.monthlyInvestmentPlan ?? []).filter((x) => x.id !== id),
      }));
    },
    [persist],
  );

  const splitMergedMonthlyPlanItem = useCallback(
    (itemId: string, rawLabel: string) => {
      persist((prev) => {
        const without = (prev.monthlyInvestmentPlan ?? []).filter((x) => x.id !== itemId);
        const newItems = createMonthlyInvestmentPlanItems({
          month,
          rawInput: rawLabel,
          existingItems: without,
        });
        if (newItems.length === 0) return prev;
        return {
          ...prev,
          monthlyInvestmentPlan: [...without, ...newItems],
        };
      });
    },
    [month, persist],
  );

  return {
    currentPlanProgress,
    pendingPlanLabels,
    currentMonthPlan,
    previousMonthPlan,
    hasPreviousMonthPlan,
    addMonthlyPlanItems,
    copyMonthlyPlanFromPreviousMonth,
    removeMonthlyPlanItem,
    splitMergedMonthlyPlanItem,
  };
}
