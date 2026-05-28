import { useMemo } from 'react';
import {
  formatARS,
  getTotalInvested,
  getYearFromMonthKey,
  getYearInvested,
} from '@/lib/finance/calculations';
import type { FinanceState } from '@/lib/finance/types';

type Props = {
  state: FinanceState;
  month: string;
};

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'emerald' | 'violet' | 'sky' | 'amber';
}) {
  const border =
    accent === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-950/25'
      : accent === 'violet'
        ? 'border-violet-500/30 bg-violet-950/25'
        : accent === 'amber'
          ? 'border-amber-500/30 bg-amber-950/25'
          : 'border-sky-500/30 bg-sky-950/25';

  return (
    <article className={`rounded-xl border px-3 py-2.5 ${border}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums leading-none text-white sm:text-xl">{value}</p>
      {sub ? <p className="mt-1 text-[10px] font-medium text-slate-500">{sub}</p> : null}
    </article>
  );
}

export function FinanceOverviewPanel({ state, month }: Props) {
  const entries = state.entries;
  const year = getYearFromMonthKey(month);
  const yearInvested = useMemo(() => getYearInvested(entries, year), [entries, year]);
  const total = useMemo(() => getTotalInvested(entries), [entries]);
  const opsThisMonth = useMemo(
    () => entries.filter((e) => e.month === month && e.type === 'investment').length,
    [entries, month],
  );
  const activeMonths = useMemo(
    () => new Set(entries.filter((x) => x.type === 'investment' && x.amount > 0).map((x) => x.month)).size,
    [entries],
  );
  const avgMonthly = activeMonths > 0 ? Math.round(total / activeMonths) : 0;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 shadow-md sm:p-4"
      aria-labelledby="finance-overview-heading"
    >
      <h2 id="finance-overview-heading" className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        Resumen
      </h2>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        <StatCell
          label={`Año ${year}`}
          value={formatARS(yearInvested)}
          sub="Inversión acumulada"
          accent="sky"
        />
        <StatCell label="Total histórico" value={formatARS(total)} sub="Desde el inicio" accent="violet" />
        <StatCell
          label="Promedio mensual"
          value={formatARS(avgMonthly)}
          sub={activeMonths > 0 ? `${activeMonths} meses activos` : 'Sin meses activos'}
          accent="emerald"
        />
        <StatCell
          label="Actividad"
          value={String(opsThisMonth)}
          sub={opsThisMonth === 1 ? 'operación este mes' : 'operaciones este mes'}
          accent="amber"
        />
      </div>
    </section>
  );
}
