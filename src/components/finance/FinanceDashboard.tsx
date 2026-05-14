import { useEffect, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { formatARS, getMonthlyInvested } from '@/lib/finance/calculations';
import {
  getGapToNextInvestmentMilestone,
  getLevelProgressPercent,
  getMonthlyLevel,
} from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

export type FinanceDashboardCelebration = {
  key: number;
  barFrom: number;
  barTo: number;
};

type Props = {
  state: FinanceState;
  onMonthChange: (month: string) => void;
  /** Pulso en la card y animación de barra al subir de nivel (mismo mes visible). */
  celebration?: FinanceDashboardCelebration | null;
};

export function FinanceDashboard({ state, onMonthChange, celebration }: Props) {
  const month = state.currentMonth;
  const entries = state.entries;
  const levelInfo = getMonthlyLevel(state, month);
  const theme = getLevelTheme(levelInfo.level);
  const rawProgress = getLevelProgressPercent(state, month, levelInfo.level);
  const gap = getGapToNextInvestmentMilestone(state, month);
  const investedMonth = getMonthlyInvested(entries, month);

  const gapLine =
    gap && gap.amountMissing > 0
      ? `Te faltan ${formatARS(gap.amountMissing)} para el Nivel ${gap.nextLevel} · ${gap.nextTitle}.`
      : gap?.hint
        ? gap.hint
        : gap
          ? `Próximo hito: Nivel ${gap.nextLevel} · ${gap.nextTitle}.`
          : 'Nivel máximo alcanzado en la ruta mensual.';

  const showProgressPercent = !(rawProgress < 1 && levelInfo.level >= 1);
  const barWidth = Math.min(
    100,
    Math.max(
      rawProgress,
      levelInfo.level >= 1 && investedMonth > 0 && rawProgress < 3 ? 5 : rawProgress,
    ),
  );

  const [burst, setBurst] = useState(false);
  const [barOverride, setBarOverride] = useState<number | null>(null);

  useEffect(() => {
    if (!celebration) return;
    setBurst(true);
    setBarOverride(celebration.barFrom);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setBarOverride(celebration.barTo));
    });
    const t = window.setTimeout(() => {
      setBarOverride(null);
      setBurst(false);
    }, 1600);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [celebration?.key, celebration?.barFrom, celebration?.barTo]);

  const widthPct = barOverride !== null ? barOverride : barWidth;
  const barTransitionMs = barOverride !== null ? 1000 : 700;

  const heroGlow = burst
    ? `0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px -12px rgba(0,0,0,0.55), 0 0 100px -12px ${theme.glow}, 0 0 140px -20px ${theme.glow}`
    : `0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.55), 0 0 80px -20px ${theme.glow}`;

  const sectionBackground = `
    radial-gradient(circle at 12% 8%, ${theme.glow}, transparent 30%),
    radial-gradient(circle at 88% 12%, rgba(255,255,255,0.16), transparent 22%),
    linear-gradient(135deg, ${theme.from}, ${theme.to})
  `;

  const barFillBackground = `linear-gradient(90deg, ${theme.from}, ${theme.to}), repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 8px, transparent 8px 16px)`;

  return (
    <section
      className={`finance-hero-enter relative overflow-hidden rounded-2xl border-2 shadow-2xl motion-reduce:animate-none sm:rounded-3xl ${burst ? 'finance-dashboard-burst' : ''}`}
      style={{
        borderColor: theme.border,
        background: sectionBackground,
        boxShadow: heroGlow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 motion-reduce:animate-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 0%, ${theme.glow}, transparent 55%)`,
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute right-6 top-6 hidden h-28 w-28 rounded-full border border-white/10 opacity-40 sm:block" aria-hidden />
      <div className="pointer-events-none absolute right-12 top-12 hidden h-16 w-16 rounded-full border border-white/10 opacity-30 sm:block" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/20 to-transparent"
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`finance-level-pulse relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border-2 bg-black/20 shadow-2xl backdrop-blur-sm sm:h-28 sm:w-28 ${burst ? 'finance-dashboard-level-pop' : ''}`}
              style={{
                borderColor: theme.border,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 42px -10px ${theme.glow}`,
              }}
            >
              <span
                className="text-[3.7rem] font-black leading-none tabular-nums tracking-tighter sm:text-[4.4rem]"
                style={{
                  color: theme.text,
                  textShadow: `0 0 40px ${theme.glow}`,
                }}
              >
                {levelInfo.level}
              </span>
            </div>
            <div className="min-w-0 pb-0.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-shadow duration-500 ${burst ? 'finance-dashboard-badge-shine' : ''}`}
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                Nivel actual
              </span>
              <p className="mt-1.5 text-xl font-black tracking-tight sm:text-2xl" style={{ color: theme.text }}>
                {levelInfo.title}
              </p>
              <p className="mt-0.5 text-lg sm:text-xl" aria-hidden>
                {theme.icon}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:items-end">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              Mes
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border-2 bg-black/30 px-3 py-2 text-sm font-bold backdrop-blur-sm sm:w-auto"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>
        </div>

        <p className="text-base font-bold sm:text-lg" style={{ color: theme.text }}>
          Invertiste {formatARS(investedMonth)} este mes.
        </p>
        <p className="text-sm font-semibold leading-snug sm:text-[15px]" style={{ color: theme.textMuted }}>
          {gapLine}
        </p>

        <div>
          <div
            className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest sm:text-[11px]"
            style={{ color: theme.textMuted }}
          >
            <span>Avance al próximo nivel</span>
            {showProgressPercent ? (
              <span className="tabular-nums">{rawProgress.toFixed(0)}%</span>
            ) : (
              <span className="tabular-nums opacity-80">En curso</span>
            )}
          </div>
          <div
            className="h-4 overflow-hidden rounded-full border-2 bg-black/35 sm:h-5"
            style={{ borderColor: theme.border }}
          >
            <div
              className="finance-dashboard-progress-fill h-full rounded-full motion-reduce:transition-none"
              style={{
                width: `${widthPct}%`,
                minWidth: widthPct > 0 ? '6px' : undefined,
                backgroundImage: barFillBackground,
                boxShadow: `0 0 24px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                transition: `width ${barTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            />
          </div>
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
        @keyframes finance-dashboard-burst-pulse {
          0% { filter: brightness(1) saturate(1); }
          40% { filter: brightness(1.14) saturate(1.12); }
          100% { filter: brightness(1) saturate(1); }
        }
        @keyframes finance-dashboard-badge-shine {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          35% { box-shadow: 0 0 20px 2px rgba(255,255,255,0.35); }
        }
        @keyframes finance-dashboard-level-pop {
          0% { transform: scale(1); }
          35% { transform: scale(1.06); }
          100% { transform: scale(1); }
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
        .finance-dashboard-burst {
          animation: finance-dashboard-burst-pulse 1.4s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-dashboard-burst { animation: none; }
        }
        .finance-dashboard-badge-shine {
          animation: finance-dashboard-badge-shine 1.45s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-dashboard-badge-shine { animation: none; }
        }
        .finance-dashboard-level-pop {
          animation: finance-dashboard-level-pop 1.1s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-dashboard-level-pop { animation: none; }
        }
      `}</style>
    </section>
  );
}
