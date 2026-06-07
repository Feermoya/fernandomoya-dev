import { useMemo } from 'react';
import type { MonthlyMissionView } from '@/lib/finance/levels';
import { getMonthlyInsightSummary, type MonthlyInsight } from '@/lib/finance/monthlyInsights';
import { getMonthlyPlanProgress } from '@/lib/finance/monthlyInvestmentPlan';
import type { FinanceState } from '@/lib/finance/types';

type Props = {
  state: FinanceState;
  month: string;
  mission: MonthlyMissionView;
};

function severityTitleClass(severity: MonthlyInsight['severity']): string {
  switch (severity) {
    case 'good':
      return 'text-emerald-700';
    case 'warning':
      return 'text-amber-700';
    case 'danger':
      return 'text-red-600';
    default:
      return 'text-blue-700';
  }
}

function severityDetailClass(severity: MonthlyInsight['severity']): string {
  switch (severity) {
    case 'good':
      return 'text-emerald-600';
    case 'warning':
      return 'text-amber-600';
    case 'danger':
      return 'text-red-500';
    default:
      return 'text-slate-500';
  }
}

export function FinanceMonthlyInsightPanel({ state, month, mission }: Props) {
  const planProgress = useMemo(
    () =>
      getMonthlyPlanProgress({
        plan: state.monthlyInvestmentPlan,
        entries: state.entries,
        month,
      }),
    [state.monthlyInvestmentPlan, state.entries, month],
  );

  const summary = useMemo(
    () =>
      getMonthlyInsightSummary({
        entries: state.entries,
        plan: state.monthlyInvestmentPlan,
        month,
        targetAmount: mission.targetAmount,
        currentAmount: mission.currentAmount,
        planCompletedCount: planProgress.completedCount,
        planTotalCount: planProgress.totalCount,
        pendingReferenceTotal: planProgress.pendingReferenceTotal,
      }),
    [
      state.entries,
      state.monthlyInvestmentPlan,
      month,
      mission.targetAmount,
      mission.currentAmount,
      planProgress.completedCount,
      planProgress.totalCount,
      planProgress.pendingReferenceTotal,
    ],
  );

  const secondary = summary.insights.slice(0, 2);
  const { main } = summary;

  return (
    <section
      className="finance-card-compact p-3"
      aria-labelledby="monthly-insight-heading"
    >
      <p
        id="monthly-insight-heading"
        className="finance-label"
      >
        Diagnóstico
      </p>

      <div className="mt-2.5">
        <p className={`text-sm font-black leading-tight ${severityTitleClass(main.severity)}`}>{main.title}</p>
        <p className={`mt-1 text-xs font-medium leading-snug ${severityDetailClass(main.severity)}`}>
          {main.detail}
        </p>
      </div>

      {secondary.length > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="finance-label">Prioridad del mes</p>
          <ul className="mt-2 space-y-1.5">
            {secondary.map((item) => (
              <li
                key={item.id}
                className={`text-xs font-semibold leading-snug ${severityTitleClass(item.severity)}`}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
