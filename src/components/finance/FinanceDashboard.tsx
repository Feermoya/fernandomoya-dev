import { useEffect, useState } from 'react';
import { Target, TrendingUp, Trophy } from 'lucide-react';
import type { FinanceState } from '@/lib/finance/types';
import {
  formatARS,
  getMonthlyInvested,
  getMonthlyInvestmentStreak,
} from '@/lib/finance/calculations';
import {
  addMonths,
  getGapToNextInvestmentMilestone,
  getLevelProgressPercent,
  getMonthlyLevel,
  type MonthlyMissionView,
} from '@/lib/finance/levels';
import { FinanceStreakCalendar } from '@/components/finance/FinanceStreakCalendar';
import { FinanceMonthSelector } from '@/components/finance/FinanceMonthSelector';
import { FinanceDelta, deltaPercent, formatMonthShort } from '@/components/finance/FinanceDelta';

export type FinanceDashboardCelebration = {
  key: number;
  barFrom: number;
  barTo: number;
};

const LEVEL_ACCENT: Record<number, string> = {
  0: '#64748b',
  1: '#16a34a',
  2: '#2563eb',
  3: '#7c3aed',
  4: '#d97706',
  5: '#ca8a04',
};

function levelAccent(level: number): string {
  if (level >= 6) return '#0891b2';
  return LEVEL_ACCENT[level] ?? '#2563eb';
}

type Props = {
  state: FinanceState;
  mission: MonthlyMissionView;
  onMonthChange: (month: string) => void;
  celebration?: FinanceDashboardCelebration | null;
};

export function FinanceDashboard({ state, mission, onMonthChange, celebration }: Props) {
  const month = state.currentMonth;
  const entries = state.entries;
  const levelInfo = getMonthlyLevel(state, month);
  const accent = levelAccent(levelInfo.level);
  const rawProgress = getLevelProgressPercent(state, month, levelInfo.level);
  const gap = getGapToNextInvestmentMilestone(state, month);
  const investedMonth = getMonthlyInvested(entries, month);

  const showProgressPercent = !(rawProgress < 1 && levelInfo.level >= 1);
  const barWidth = Math.min(
    100,
    Math.max(
      rawProgress,
      levelInfo.level >= 1 && investedMonth > 0 && rawProgress < 3 ? 5 : rawProgress,
    ),
  );

  const [barOverride, setBarOverride] = useState<number | null>(null);

  useEffect(() => {
    if (!celebration) return;
    setBarOverride(celebration.barFrom);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setBarOverride(celebration.barTo));
    });
    const t = window.setTimeout(() => setBarOverride(null), 1600);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [celebration?.key, celebration?.barFrom, celebration?.barTo]);

  const widthPct = barOverride !== null ? barOverride : barWidth;
  const barTransitionMs = barOverride !== null ? 1000 : 700;

  const prevMonth = addMonths(month, -1);
  const investedPrevMonth = getMonthlyInvested(entries, prevMonth);
  const deltaVsPrev = investedMonth - investedPrevMonth;
  const deltaPct = deltaPercent(investedMonth, investedPrevMonth);
  const streak = getMonthlyInvestmentStreak(entries, month);
  const missionDone = mission.status === 'completed';
  const progressComplete = mission.percent >= 100;

  return (
    <section
      className="finance-card finance-hero-card finance-hero-enter overflow-visible p-4 motion-reduce:animate-none sm:p-5 lg:p-6"
      key={month}
    >
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span
            className="finance-level-chip inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
          >
            <Trophy size={14} strokeWidth={2.25} aria-hidden />
            Nivel {levelInfo.level}
          </span>
          <div className="min-w-0 sm:max-w-md sm:flex-1 lg:max-w-lg">
            <FinanceMonthSelector value={month} onChange={onMonthChange} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-stretch lg:gap-5">
          <div className="finance-goal-panel flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/90 via-white to-slate-50/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="finance-label flex items-center gap-1.5 text-blue-700">
                <Target size={12} strokeWidth={2.25} aria-hidden />
                Objetivo del mes
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  missionDone
                    ? 'bg-emerald-100 text-emerald-800'
                    : mission.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {missionDone ? 'Completado' : mission.status === 'in_progress' ? 'En curso' : 'Pendiente'}
              </span>
            </div>

            <div className="mt-3">
              <p className="finance-metric finance-metric-hero">{formatARS(mission.currentAmount)}</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-600">
                de{' '}
                <span className="tabular-nums text-slate-900">{formatARS(mission.targetAmount)}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span
                  className={`tabular-nums font-bold ${
                    progressComplete ? 'text-emerald-700' : 'text-blue-700'
                  }`}
                >
                  {mission.percent.toFixed(0)}%
                </span>
              </p>
            </div>

            {investedPrevMonth > 0 ? (
              <div className="mt-3">
                <FinanceDelta
                  absolute={deltaVsPrev}
                  percent={deltaPct}
                  versus={`vs ${formatMonthShort(prevMonth)}`}
                  sense="invest"
                  size="md"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`finance-progress-fill h-full w-full origin-left rounded-full ${
                    progressComplete ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, mission.percent / 100))})`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3 sm:px-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="finance-label flex items-center gap-1">
                  <TrendingUp size={11} strokeWidth={2.25} aria-hidden />
                  Progreso de nivel
                </span>
                {showProgressPercent ? (
                  <span className="text-[11px] font-bold tabular-nums text-slate-700">
                    {rawProgress.toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">En curso</span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full w-full origin-left rounded-full bg-blue-600 motion-reduce:transition-none"
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, widthPct / 100))})`,
                    transition: `transform ${barTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }}
                />
              </div>
              {gap && gap.amountMissing > 0 ? (
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  Faltan {formatARS(gap.amountMissing)} para nivel {gap.nextLevel}
                </p>
              ) : null}
            </div>

            <FinanceStreakCalendar entries={entries} streakCount={streak.streakCount} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
