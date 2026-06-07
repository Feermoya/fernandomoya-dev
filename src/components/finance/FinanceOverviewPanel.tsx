import { useMemo } from 'react';
import { WalletCards } from 'lucide-react';
import {
  formatARS,
  getMonthlyInvested,
  getTotalInvested,
  getYearFromMonthKey,
  getYearInvested,
} from '@/lib/finance/calculations';
import type { FinanceState } from '@/lib/finance/types';

type Props = {
  state: FinanceState;
  month: string;
  variant?: 'full' | 'compact';
};

function StatCell({
  label,
  value,
  sub,
  accent,
  compact,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'emerald' | 'violet' | 'sky' | 'amber';
  compact?: boolean;
}) {
  const border =
    accent === 'emerald'
      ? 'border-emerald-200 bg-emerald-50'
      : accent === 'violet'
        ? 'border-violet-200 bg-violet-50'
        : accent === 'amber'
          ? 'border-amber-200 bg-amber-50'
          : 'border-sky-200 bg-sky-50';

  return (
    <article className={`rounded-xl border px-2.5 py-2 ${border} ${compact ? '' : 'sm:px-3 sm:py-2.5'}`}>
      <p className="finance-label">{label}</p>
      <p
        className={`mt-0.5 font-black tabular-nums leading-none text-slate-900 ${
          compact ? 'text-base' : 'text-lg sm:text-xl'
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[10px] font-medium text-slate-500">{sub}</p> : null}
    </article>
  );
}

export function FinanceOverviewPanel({ state, month, variant = 'full' }: Props) {
  const compact = variant === 'compact';
  const entries = state.entries;
  const year = getYearFromMonthKey(month);
  const yearInvested = useMemo(() => getYearInvested(entries, year), [entries, year]);
  const monthInvested = useMemo(() => getMonthlyInvested(entries, month), [entries, month]);
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
      className={`finance-card ${compact ? 'p-3' : 'p-3 sm:p-4'}`}
      aria-labelledby="finance-overview-heading"
    >
      <h2 id="finance-overview-heading" className="finance-label flex items-center gap-1.5">
        <WalletCards size={14} strokeWidth={2.25} className="text-blue-600" aria-hidden />
        Resumen
      </h2>

      <div
        className={`mt-2 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
      >
        <StatCell
          label="Mes actual"
          value={formatARS(monthInvested)}
          sub="Este mes"
          accent="emerald"
          compact={compact}
        />
        <StatCell
          label="Promedio"
          value={formatARS(avgMonthly)}
          sub={activeMonths > 0 ? `${activeMonths} meses` : 'Sin datos'}
          accent="sky"
          compact={compact}
        />
        <StatCell
          label="Operaciones"
          value={String(opsThisMonth)}
          sub="En el mes"
          accent="amber"
          compact={compact}
        />
        <StatCell
          label={`Año ${year}`}
          value={formatARS(yearInvested)}
          sub="Acumulado"
          accent="violet"
          compact={compact}
        />
        <StatCell
          label="Total histórico"
          value={formatARS(total)}
          sub="Desde el inicio"
          accent="violet"
          compact={compact}
        />
      </div>
    </section>
  );
}
