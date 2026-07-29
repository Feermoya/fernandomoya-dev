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
import { getLevelTheme } from '@/lib/finance/levelTheme';
import { FinanceStreakCalendar } from '@/components/finance/FinanceStreakCalendar';
import { FinanceMonthSelector } from '@/components/finance/FinanceMonthSelector';
import { FinanceDelta, deltaPercent, formatMonthShort } from '@/components/finance/FinanceDelta';

export type FinanceDashboardCelebration = {
  key: number;
  barFrom: number;
  barTo: number;
};

type MoodLine = {
  label: string;
  text: string;
};

function getMoodLine(
  investedMonth: number,
  level: number,
  deltaPct: number | null,
): MoodLine {
  if (investedMonth === 0) return { label: 'idle', text: 'Sin movimientos este mes' };
  if (level >= 6) return { label: 'strong', text: 'Mes fuerte' };
  if (level >= 4 && deltaPct !== null && deltaPct > 0) return { label: 'up', text: 'Mejor que el mes pasado' };
  if (level >= 3) return { label: 'steady', text: 'Buen ritmo' };
  if (level >= 1) return { label: 'start', text: 'En marcha' };
  return { label: 'near', text: 'Casi nivel 1' };
}

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
  const theme = getLevelTheme(levelInfo.level);
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
  const mood = getMoodLine(investedMonth, levelInfo.level, deltaPct);
  const streak = getMonthlyInvestmentStreak(entries, month);
  const missionDone = mission.status === 'completed';
  const progressComplete = mission.percent >= 100;

  return (
    <section className="finance-card finance-hero-enter overflow-visible p-4 motion-reduce:animate-none sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
            >
              <Trophy size={14} strokeWidth={2.25} aria-hidden />
              Nivel {levelInfo.level}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
              {mood.text}
            </span>
          </div>
          <h2 className="mt-2.5 text-[1.35rem] font-bold tracking-tight text-slate-900 sm:text-2xl">
            {levelInfo.title}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{theme.name}</p>
        </div>

        <div className="w-full border-t border-slate-100 pt-3">
          <span className="finance-label mb-1.5 block">Mes en foco</span>
          <FinanceMonthSelector value={month} onChange={onMonthChange} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className="finance-label flex items-center gap-1">
              <Target size={11} strokeWidth={2.25} className="text-blue-600" aria-hidden />
              Objetivo del mes
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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

          <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-700">{mission.headline}</p>

          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="finance-metric">{formatARS(mission.currentAmount)}</span>
            <span className="finance-metric-meta">
              de {formatARS(mission.targetAmount)} · {mission.percent.toFixed(0)}%
            </span>
          </div>

          {investedPrevMonth > 0 ? (
            <div className="mt-2">
              <FinanceDelta
                absolute={deltaVsPrev}
                percent={deltaPct}
                versus={`vs ${formatMonthShort(prevMonth)}`}
                sense="invest"
                size="md"
              />
            </div>
          ) : null}

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${
                progressComplete ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, mission.percent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {gap && gap.amountMissing > 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/90 px-3.5 py-3">
              <p className="finance-label">Próximo nivel</p>
              <strong className="finance-metric-sm mt-1 block text-blue-700">
                {formatARS(gap.amountMissing)}
              </strong>
              <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                Faltan para nivel {gap.nextLevel} · {gap.nextTitle}
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
              <p className="finance-label">Estado</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{mood.text}</p>
              {streak.streakCount > 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Racha · {streak.streakCount} {streak.streakCount === 1 ? 'mes' : 'meses'}
                </p>
              ) : null}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
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
                className="h-full rounded-full bg-blue-600 motion-reduce:transition-none"
                style={{
                  width: `${widthPct}%`,
                  minWidth: widthPct > 0 ? '6px' : undefined,
                  transition: `width ${barTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <FinanceStreakCalendar entries={entries} streakCount={streak.streakCount} compact />
      </div>

      <style>{`
        @keyframes finance-hero-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .finance-hero-enter {
          animation: finance-hero-in 0.4s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-hero-enter { animation: none; }
        }
      `}</style>
    </section>
  );
}
