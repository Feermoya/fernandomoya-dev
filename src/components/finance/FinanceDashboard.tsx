import { useEffect, useState } from 'react';
import { Flame, Target, Trophy } from 'lucide-react';
import type { FinanceState } from '@/lib/finance/types';
import {
  formatARS,
  getMonthlyInvested,
  getMonthlyInvestmentStreak,
  getStreakCalendarCells,
  MONTHLY_STREAK_MINIMUM_ARS,
} from '@/lib/finance/calculations';
import {
  addMonths,
  getGapToNextInvestmentMilestone,
  getLevelProgressPercent,
  getMonthlyLevel,
  type MonthlyMissionView,
} from '@/lib/finance/levels';
import { FinanceMonthSelector } from '@/components/finance/FinanceMonthSelector';
import { deltaPercent, formatMonthShort } from '@/components/finance/FinanceDelta';
import {
  FocoCard,
  FocoChip,
  FocoProgressRing,
  FocoSegmentedBar,
  FocoStreakStrip,
  FocoTrendChip,
  FOCO_ICON_STROKE,
} from '@/components/finance/ui';

export type FinanceDashboardCelebration = {
  key: number;
  barFrom: number;
  barTo: number;
};

type Props = {
  state: FinanceState;
  mission: MonthlyMissionView;
  onMonthChange: (month: string) => void;
  celebration?: FinanceDashboardCelebration | null;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** ease-out cubic. Empieza ya y deja ver el conteo; el expo del token termina demasiado pronto. */
function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** 1200ms: el monto y el anillo terminan juntos, y el conteo se lee. */
function useEnterProgress(key: string, reduced: boolean) {
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, reduced]);
  return progress;
}

export function FinanceDashboard({ state, mission, onMonthChange, celebration }: Props) {
  const month = state.currentMonth;
  const entries = state.entries;
  const levelInfo = getMonthlyLevel(state, month);
  const rawProgress = getLevelProgressPercent(state, month, levelInfo.level);
  const gap = getGapToNextInvestmentMilestone(state, month);
  const investedMonth = getMonthlyInvested(entries, month);
  const reduced = usePrefersReducedMotion();

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
  const enter = useEnterProgress(month, reduced);
  const counted = Math.round(mission.currentAmount * enter);

  const prevMonth = addMonths(month, -1);
  const investedPrevMonth = getMonthlyInvested(entries, prevMonth);
  const deltaPct = deltaPercent(investedMonth, investedPrevMonth);
  const streak = getMonthlyInvestmentStreak(entries, month);
  const cells = getStreakCalendarCells(entries, 12);
  const missionDone = mission.status === 'completed' || mission.percent >= 100;

  return (
    <div className="foco-dashboard-stack" key={month}>
      <div className="foco-level-row">
        <FocoChip tone="level" icon={<Trophy size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />}>
          Nivel {levelInfo.level}
        </FocoChip>
        <div className="foco-level-row__month">
          <FinanceMonthSelector value={month} onChange={onMonthChange} />
        </div>
      </div>

      <FocoCard className="foco-goal-card" data-tour="goal">
        <div className="foco-goal-card__top">
          <p className="foco-label">
            <Target size={12} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
            Objetivo del mes
          </p>
          <FocoChip tone={missionDone ? 'successSolid' : 'primary'}>
            {missionDone ? 'Objetivo cumplido' : 'En curso'}
          </FocoChip>
        </div>

        <div className="foco-goal-card__body">
          <FocoProgressRing
            percent={mission.percent}
            progress={enter}
            label={`Objetivo del mes: ${Math.round(mission.percent)}%`}
          />
          <div className="min-w-0">
            <p className="foco-amount-hero tabular-nums">
              <span className="foco-amount-sizer">
                <span className="foco-amount-sizer__ghost" aria-hidden>
                  {formatARS(mission.currentAmount)}
                </span>
                <span className="foco-amount-sizer__value">{formatARS(counted)}</span>
              </span>
            </p>
            <p className="foco-amount-sub">de {formatARS(mission.targetAmount)}</p>
          </div>
        </div>

        {investedPrevMonth > 0 && deltaPct != null && deltaPct !== 0 ? (
          <FocoTrendChip percent={deltaPct} versus={`vs ${formatMonthShort(prevMonth)}`} />
        ) : null}
      </FocoCard>

      <FocoCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="foco-label">Progreso de nivel</p>
          {showProgressPercent ? (
            <span className="text-[12px] font-semibold tabular-nums text-[var(--text-secondary)]">
              {rawProgress.toFixed(0)}%
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-[var(--text-muted)]">En curso</span>
          )}
        </div>
        <FocoSegmentedBar
          percent={widthPct}
          aria-label={`Progreso de nivel: ${rawProgress.toFixed(0)}%`}
          reducedMotion={reduced}
        />
        {gap && gap.amountMissing > 0 ? (
          <p className="mt-2 text-[13px] font-medium text-[var(--text-muted)]">
            Faltan {formatARS(gap.amountMissing)} para nivel {gap.nextLevel}
          </p>
        ) : null}
      </FocoCard>

      <FocoCard data-tour="streak">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="foco-label">
            <Flame size={12} strokeWidth={FOCO_ICON_STROKE} className="text-[var(--warning-text)]" aria-hidden />
            Racha · {streak.streakCount} {streak.streakCount === 1 ? 'mes' : 'meses'}
          </p>
          <FocoChip tone="warning">Mín. {formatARS(MONTHLY_STREAK_MINIMUM_ARS)}</FocoChip>
        </div>
        <FocoStreakStrip
          cells={cells}
          streakCount={streak.streakCount}
          ariaLabel={`Racha: ${streak.streakCount} meses`}
        />
      </FocoCard>
    </div>
  );
}
