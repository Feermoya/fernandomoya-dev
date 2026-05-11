import { formatARS, getMonthlyInvested, getTotalInvested } from '@/lib/finance/calculations';
import type { FinanceState } from '@/lib/finance/types';
import { useMemo } from 'react';

type Props = {
  state: FinanceState;
  month: string;
};

export function FinanceQuickMetrics({ state, month }: Props) {
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

  const cards = [
    {
      key: 'inv',
      label: 'Invertido este mes',
      value: formatARS(invested),
      hint: 'Suma del mes',
      icon: '📈',
      className: 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/80 to-slate-900/90 text-emerald-50',
    },
    {
      key: 'tot',
      label: 'Total invertido',
      value: formatARS(total),
      hint: 'Histórico',
      icon: '💎',
      className: 'border-violet-500/50 bg-gradient-to-br from-violet-950/85 to-slate-900/90 text-violet-50',
    },
    {
      key: 'str',
      label: 'Meses con carga',
      value: String(activeMonths),
      hint: 'Al menos una inversión',
      icon: '🔁',
      className: 'border-amber-500/50 bg-gradient-to-br from-amber-950/80 to-slate-900/90 text-amber-50',
    },
    {
      key: 'avg',
      label: 'Promedio mensual',
      value: formatARS(avgMonthly),
      hint: 'Sobre meses activos',
      icon: '⚡',
      className: 'border-sky-500/50 bg-gradient-to-br from-sky-950/85 to-slate-900/90 text-sky-50',
    },
    {
      key: 'ops',
      label: 'Operaciones',
      value: String(opsThisMonth),
      hint: 'Este mes',
      icon: '🧾',
      className: 'border-fuchsia-500/45 bg-gradient-to-br from-fuchsia-950/80 to-slate-900/90 text-fuchsia-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <article
          key={c.key}
          className={`relative overflow-hidden rounded-2xl border-2 p-3 shadow-lg transition hover:brightness-110 sm:p-4 ${c.className}`}
        >
          <span className="text-lg opacity-90" aria-hidden>
            {c.icon}
          </span>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">{c.label}</p>
          <p className="mt-1 text-xl font-black tabular-nums leading-none sm:text-2xl">{c.value}</p>
          <p className="mt-2 text-[11px] font-medium opacity-75">{c.hint}</p>
        </article>
      ))}
    </div>
  );
}
