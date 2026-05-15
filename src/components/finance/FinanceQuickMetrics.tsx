import {
  formatARS,
  getCalendarMonthKey,
  getMonthlyInvested,
  getMonthlyInvestmentStreak,
  getTotalInvested,
  MONTHLY_STREAK_MINIMUM_ARS,
} from '@/lib/finance/calculations';
import type { FinanceState } from '@/lib/finance/types';
import { useMemo } from 'react';

type Props = {
  state: FinanceState;
  month: string;
  compact?: boolean;
};

function MetricCard({
  label,
  value,
  hint,
  className,
  barClass,
  pad,
  compact,
}: {
  label: string;
  value: string;
  hint: string;
  className: string;
  barClass: string;
  pad: string;
  compact: boolean;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border ${pad} ${className} transition duration-300 hover:-translate-y-0.5 hover:brightness-110`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      </div>

      <div className="relative z-[1] flex flex-col gap-1">
        <p
          className={`font-bold uppercase tracking-[0.14em] text-white/55 ${compact ? 'text-[9px] leading-tight' : 'text-[10px] leading-tight'}`}
        >
          {label}
        </p>
        <p
          className={`font-black tabular-nums leading-none tracking-tight text-white ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[1.85rem]'}`}
        >
          {value}
        </p>
        <p className={`font-semibold text-white/50 ${compact ? 'text-[10px]' : 'text-xs'}`}>{hint}</p>
      </div>

      <div className={`relative z-[1] h-1 overflow-hidden rounded-full bg-black/30 ${compact ? 'mt-2.5' : 'mt-3.5'}`}>
        <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${barClass}`} />
      </div>
    </article>
  );
}

export function FinanceQuickMetrics({ state, month, compact = false }: Props) {
  const e = state.entries;
  const invested = getMonthlyInvested(e, month);
  const total = getTotalInvested(e);
  const activeMonths = useMemo(
    () => new Set(e.filter((x) => x.type === 'investment' && x.amount > 0).map((x) => x.month)).size,
    [e],
  );
  const opsThisMonth = useMemo(
    () => e.filter((x) => x.month === month && x.type === 'investment').length,
    [e, month],
  );
  const avgMonthly = activeMonths > 0 ? Math.round(total / activeMonths) : 0;

  const todayKey = getCalendarMonthKey();
  const streakBoard = useMemo(() => getMonthlyInvestmentStreak(e, month), [e, month]);
  const streakLive = useMemo(() => getMonthlyInvestmentStreak(e, todayKey), [e, todayKey]);
  const offBoard = month !== todayKey;
  const display = offBoard ? streakLive : streakBoard;
  const barWidthPct = offBoard
    ? streakLive.progressPercent
    : streakBoard.status === 'protected'
      ? 100
      : streakBoard.progressPercent;

  const streakMesUnit = display.streakCount === 1 ? 'mes' : 'meses';
  const streakStateLine = offBoard
    ? 'La racha se calcula sobre el mes actual.'
    : streakBoard.status === 'protected'
      ? 'Racha protegida'
      : streakBoard.status === 'pending'
        ? streakBoard.missingForCurrentMonth > 0
          ? `Te faltan ${formatARS(streakBoard.missingForCurrentMonth)} para protegerla`
          : `Meta ${formatARS(MONTHLY_STREAK_MINIMUM_ARS)}`
        : 'Racha rota';

  const streakCardClass = offBoard
    ? 'border-slate-500/40 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.22),transparent_38%),linear-gradient(135deg,rgba(30,41,59,0.92),rgba(15,23,42,0.96))] text-slate-100 shadow-[0_12px_32px_-20px_rgba(100,116,139,0.5)] sm:shadow-[0_18px_45px_-24px_rgba(100,116,139,0.55)]'
    : streakBoard.status === 'protected'
      ? 'border-emerald-400/45 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.30),transparent_38%),linear-gradient(135deg,rgba(6,95,70,0.92),rgba(15,23,42,0.96))] text-emerald-50 shadow-[0_12px_32px_-20px_rgba(16,185,129,0.85)] sm:shadow-[0_18px_45px_-24px_rgba(16,185,129,0.95)]'
      : streakBoard.status === 'pending'
        ? 'border-amber-400/45 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.30),transparent_38%),linear-gradient(135deg,rgba(120,53,15,0.88),rgba(15,23,42,0.96))] text-amber-50 shadow-[0_12px_32px_-20px_rgba(245,158,11,0.82)] sm:shadow-[0_18px_45px_-24px_rgba(245,158,11,0.90)]'
        : 'border-rose-400/40 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.22),transparent_38%),linear-gradient(135deg,rgba(136,19,55,0.88),rgba(15,23,42,0.96))] text-rose-50 shadow-[0_12px_32px_-20px_rgba(244,63,94,0.55)] sm:shadow-[0_18px_45px_-24px_rgba(244,63,94,0.65)]';

  const streakBarClass = offBoard
    ? 'from-slate-300 to-sky-400'
    : streakBoard.status === 'protected'
      ? 'from-emerald-300 to-cyan-300'
      : streakBoard.status === 'pending'
        ? 'from-amber-300 to-orange-300'
        : 'from-rose-300 to-fuchsia-400';

  const pad = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5';

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 sm:gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <MetricCard
          label="Invertido este mes"
          value={formatARS(invested)}
          hint="Este mes"
          className="border-emerald-400/45 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.30),transparent_38%),linear-gradient(135deg,rgba(6,95,70,0.92),rgba(15,23,42,0.96))] text-emerald-50 shadow-[0_12px_32px_-20px_rgba(16,185,129,0.85)] sm:shadow-[0_18px_45px_-24px_rgba(16,185,129,0.95)]"
          barClass="from-emerald-300 to-cyan-300"
          pad={pad}
          compact={compact}
        />
        <MetricCard
          label="Total invertido"
          value={formatARS(total)}
          hint="Histórico"
          className="border-violet-400/45 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(76,29,149,0.92),rgba(15,23,42,0.96))] text-violet-50 shadow-[0_12px_32px_-20px_rgba(139,92,246,0.85)] sm:shadow-[0_18px_45px_-24px_rgba(139,92,246,0.95)]"
          barClass="from-violet-300 to-fuchsia-300"
          pad={pad}
          compact={compact}
        />

        <article
          className={`group relative overflow-hidden rounded-2xl border ${pad} ${streakCardClass} transition duration-300 hover:-translate-y-0.5 hover:brightness-110`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
          </div>

          <div className="relative z-[1] flex flex-col gap-1">
            <p
              className={`font-bold uppercase tracking-[0.14em] text-white/55 ${compact ? 'text-[9px] leading-tight' : 'text-[10px] leading-tight'}`}
            >
              Racha mensual
            </p>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span
                className={`font-black tabular-nums leading-none tracking-tight text-white ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[1.85rem]'}`}
              >
                {display.streakCount}
              </span>
              <span className={`font-semibold text-white/50 ${compact ? 'text-[10px]' : 'text-xs'}`}>{streakMesUnit}</span>
            </div>
            <p className={`font-semibold leading-snug text-white/60 ${compact ? 'text-[10px] leading-snug' : 'text-xs'}`}>
              {streakStateLine}
            </p>
            <p className={`text-[10px] font-medium text-white/45 ${compact ? 'text-[9px]' : ''}`}>
              Mínimo {formatARS(MONTHLY_STREAK_MINIMUM_ARS)} por mes calendario
            </p>
          </div>

          <div className={`relative z-[1] h-1 overflow-hidden rounded-full bg-black/30 ${compact ? 'mt-2.5' : 'mt-3.5'}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${streakBarClass}`}
              style={{ width: `${barWidthPct}%` }}
            />
          </div>
        </article>
      </div>

      <details className="rounded-xl border border-white/10 bg-slate-950/40">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 sm:px-4 [&::-webkit-details-marker]:hidden">
          Ver métricas completas
        </summary>
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
          <article className="rounded-xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-950/70 to-slate-900/90 p-4 text-sky-50 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/70">Promedio mensual</p>
            <p className="mt-2 text-2xl font-black tabular-nums leading-none tracking-tight">{formatARS(avgMonthly)}</p>
            <p className="mt-2 text-xs font-semibold text-sky-100/60">Sobre meses activos</p>
          </article>
          <article className="rounded-xl border-2 border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-950/70 to-slate-900/90 p-4 text-fuchsia-50 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fuchsia-200/70">Operaciones</p>
            <p className="mt-2 text-2xl font-black tabular-nums leading-none tracking-tight">{String(opsThisMonth)}</p>
            <p className="mt-2 text-xs font-semibold text-fuchsia-100/60">Este mes</p>
          </article>
          <article className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-950/50 to-slate-900/90 p-4 text-amber-50 shadow-md sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/70">Meses con inversión</p>
            <p className="mt-2 text-2xl font-black tabular-nums leading-none tracking-tight">{String(activeMonths)}</p>
            <p className="mt-2 text-xs font-semibold text-amber-100/60">Meses distintos con al menos una carga</p>
          </article>
        </div>
      </details>
    </div>
  );
}
