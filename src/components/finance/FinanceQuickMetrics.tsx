import { formatARS, getMonthlyInvested, getTotalInvested } from '@/lib/finance/calculations';
import type { FinanceState } from '@/lib/finance/types';
import { useMemo } from 'react';

type Props = {
  state: FinanceState;
  month: string;
  compact?: boolean;
};

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

  const mainCards = [
    {
      key: 'inv',
      label: 'Invertido este mes',
      value: formatARS(invested),
      hint: 'Este mes',
      icon: '↗',
      className:
        'border-emerald-400/45 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.30),transparent_38%),linear-gradient(135deg,rgba(6,95,70,0.92),rgba(15,23,42,0.96))] text-emerald-50 shadow-[0_18px_45px_-24px_rgba(16,185,129,0.95)]',
      barClass: 'from-emerald-300 to-cyan-300',
    },
    {
      key: 'tot',
      label: 'Total invertido',
      value: formatARS(total),
      hint: 'Histórico',
      icon: '◆',
      className:
        'border-violet-400/45 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(76,29,149,0.92),rgba(15,23,42,0.96))] text-violet-50 shadow-[0_18px_45px_-24px_rgba(139,92,246,0.95)]',
      barClass: 'from-violet-300 to-fuchsia-300',
    },
    {
      key: 'str',
      label: 'Meses con carga',
      value: String(activeMonths),
      hint: 'Racha activa',
      icon: '●',
      className:
        'border-amber-400/45 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.30),transparent_38%),linear-gradient(135deg,rgba(120,53,15,0.88),rgba(15,23,42,0.96))] text-amber-50 shadow-[0_18px_45px_-24px_rgba(245,158,11,0.90)]',
      barClass: 'from-amber-300 to-orange-300',
    },
  ];

  const pad = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5';
  const valueSize = compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 sm:gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {mainCards.map((c) => (
          <article
            key={c.key}
            className={`group relative overflow-hidden rounded-2xl border ${pad} ${c.className} transition duration-300 hover:-translate-y-0.5 hover:brightness-110`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            </div>

            <div className="relative z-[1] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-black uppercase tracking-[0.18em] opacity-75 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
                  {c.label}
                </p>
                <p className={`mt-2 font-black tabular-nums leading-none tracking-tight ${valueSize}`}>{c.value}</p>
                <p className={`mt-2 font-bold opacity-75 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{c.hint}</p>
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12 text-sm font-black backdrop-blur">
                {c.icon}
              </span>
            </div>

            <div className="relative z-[1] mt-4 h-1 overflow-hidden rounded-full bg-black/25">
              <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${c.barClass}`} />
            </div>
          </article>
        ))}
      </div>

      <details className="rounded-xl border border-white/10 bg-slate-950/40">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 sm:px-4 [&::-webkit-details-marker]:hidden">
          Ver métricas completas
        </summary>
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
          <article className="rounded-xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-950/70 to-slate-900/90 p-3 text-sky-50 shadow-md">
            <span className="text-base opacity-90" aria-hidden>
              ⚡
            </span>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">Promedio mensual</p>
            <p className="mt-1 text-xl font-black tabular-nums leading-none">{formatARS(avgMonthly)}</p>
            <p className="mt-2 text-[11px] font-medium opacity-75">Sobre meses activos</p>
          </article>
          <article className="rounded-xl border-2 border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-950/70 to-slate-900/90 p-3 text-fuchsia-50 shadow-md">
            <span className="text-base opacity-90" aria-hidden>
              🧾
            </span>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">Operaciones</p>
            <p className="mt-1 text-xl font-black tabular-nums leading-none">{String(opsThisMonth)}</p>
            <p className="mt-2 text-[11px] font-medium opacity-75">Este mes</p>
          </article>
        </div>
      </details>
    </div>
  );
}
