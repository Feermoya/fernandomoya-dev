import { useMemo } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  formatARS,
  getMonthlyInvested,
  getTotalInvested,
} from '@/lib/finance/calculations';
import {
  getGapToNextInvestmentMilestone,
  getLevelProgressPercent,
  getMonthlyLevel,
} from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

type Props = {
  state: FinanceState;
  onMonthChange: (month: string) => void;
};

export function FinanceDashboard({ state, onMonthChange }: Props) {
  const month = state.currentMonth;
  const entries = state.entries;
  const levelInfo = getMonthlyLevel(state, month);
  const theme = getLevelTheme(levelInfo.level);
  const progress = getLevelProgressPercent(state, month, levelInfo.level);
  const gap = getGapToNextInvestmentMilestone(state, month);
  const investedMonth = getMonthlyInvested(entries, month);
  const investedTotal = getTotalInvested(entries);

  const activeMonths = useMemo(() => {
    return new Set(
      entries.filter((e) => e.type === 'investment' && e.amount > 0).map((e) => e.month),
    ).size;
  }, [entries]);

  const avg =
    activeMonths > 0 ? Math.round(investedTotal / activeMonths) : 0;

  const gapLine =
    gap && gap.amountMissing > 0
      ? `Te faltan ${formatARS(gap.amountMissing)} para desbloquear Nivel ${gap.nextLevel} · ${gap.nextTitle}.`
      : gap?.hint
        ? gap.hint
        : gap
          ? `Próximo hito: Nivel ${gap.nextLevel} · ${gap.nextTitle}.`
          : 'Nivel máximo alcanzado en la ruta mensual.';

  return (
    <section
      className="finance-hero-enter relative overflow-hidden rounded-3xl border-2 shadow-2xl motion-reduce:animate-none"
      style={{
        borderColor: theme.border,
        background: `linear-gradient(145deg, ${theme.from}, ${theme.to})`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.55), 0 0 80px -20px ${theme.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 motion-reduce:animate-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 0%, ${theme.glow}, transparent 55%)`,
        }}
        aria-hidden
      />

      <div className="relative z-[1] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: 'rgba(0,0,0,0.25)',
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              Nivel actual
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.12)', color: theme.textMuted }}
            >
              Mes {month}
            </span>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="min-h-[44px] rounded-xl border-2 bg-black/30 px-3 py-2 text-sm font-bold backdrop-blur-sm"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-end gap-4">
            <span
              className="finance-level-pulse text-[4.5rem] font-black leading-none tabular-nums tracking-tighter sm:text-[5.25rem]"
              style={{
                color: theme.text,
                textShadow: `0 0 40px ${theme.glow}`,
              }}
            >
              {levelInfo.level}
            </span>
            <div className="min-w-0 pb-1">
              <p className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: theme.text }}>
                {levelInfo.title}
              </p>
              <p className="mt-1 text-2xl" aria-hidden>
                {theme.icon}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-prose text-[15px] font-semibold leading-snug sm:text-base" style={{ color: theme.text }}>
          Invertiste {formatARS(investedMonth)} este mes.
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed sm:text-[15px]" style={{ color: theme.textMuted }}>
          {levelInfo.message}
        </p>
        <p className="mt-3 text-sm font-bold leading-snug sm:text-[15px]" style={{ color: theme.text }}>
          {gapLine}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
            <span>Progreso al próximo nivel</span>
            <span className="tabular-nums">{progress.toFixed(0)}%</span>
          </div>
          <div
            className="h-4 overflow-hidden rounded-full border-2 bg-black/35"
            style={{ borderColor: theme.border }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: `${progress}%`,
                minWidth: progress > 0 ? '6px' : undefined,
                background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                boxShadow: `0 0 20px ${theme.glow}`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className="inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold"
            style={{ borderColor: theme.border, color: theme.text, background: 'rgba(0,0,0,0.2)' }}
          >
            Racha: {activeMonths} mes{activeMonths !== 1 ? 'es' : ''} con registro
          </span>
          <span
            className="inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold"
            style={{ borderColor: theme.border, color: theme.text, background: 'rgba(0,0,0,0.2)' }}
          >
            Total: {formatARS(investedTotal)}
          </span>
          {activeMonths > 0 ? (
            <span
              className="inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold"
              style={{ borderColor: theme.border, color: theme.text, background: 'rgba(0,0,0,0.2)' }}
            >
              Promedio: {formatARS(avg)}/mes
            </span>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes finance-hero-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes finance-level-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.12); }
        }
        .finance-hero-enter {
          animation: finance-hero-in 0.55s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-hero-enter { animation: none; }
        }
        .finance-level-pulse {
          animation: finance-level-pulse 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-level-pulse { animation: none; }
        }
      `}</style>
    </section>
  );
}
