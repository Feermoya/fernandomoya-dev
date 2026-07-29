import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import {
  formatARS,
  getMonthlyInvested,
  getTotalInvested,
  getYearFromMonthKey,
  getYearInvested,
} from '@/lib/finance/calculations';
import { addMonths } from '@/lib/finance/levels';
import type { FinanceState } from '@/lib/finance/types';
import { FinanceDelta, deltaPercent, formatMonthShort } from '@/components/finance/FinanceDelta';
import { FinanceSectionHeading } from '@/components/finance/FinanceSectionHeading';

type Props = {
  state: FinanceState;
  month: string;
  variant?: 'full' | 'compact';
};

function StatCell({
  label,
  value,
  delta,
  emphasis,
  compact,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  emphasis?: boolean;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-slate-200/90 bg-white px-2.5 py-2.5 ${
        compact ? '' : 'sm:px-3 sm:py-3'
      } ${emphasis ? 'sm:col-span-2' : ''}`}
    >
      <p className="finance-label">{label}</p>
      <p className={`mt-1 ${emphasis ? 'finance-metric' : 'finance-metric-sm'}`}>{value}</p>
      {delta ? <div className="mt-1.5">{delta}</div> : null}
    </article>
  );
}

export function FinanceOverviewPanel({ state, month, variant = 'full' }: Props) {
  const compact = variant === 'compact';
  const entries = state.entries;
  const year = getYearFromMonthKey(month);
  const yearInvested = useMemo(() => getYearInvested(entries, year), [entries, year]);
  const prevYearInvested = useMemo(() => getYearInvested(entries, year - 1), [entries, year]);
  const monthInvested = useMemo(() => getMonthlyInvested(entries, month), [entries, month]);
  const prevMonth = addMonths(month, -1);
  const prevMonthInvested = useMemo(
    () => getMonthlyInvested(entries, prevMonth),
    [entries, prevMonth],
  );
  const total = useMemo(() => getTotalInvested(entries), [entries]);
  const opsThisMonth = useMemo(
    () => entries.filter((e) => e.month === month && e.type === 'investment').length,
    [entries, month],
  );
  const opsPrevMonth = useMemo(
    () => entries.filter((e) => e.month === prevMonth && e.type === 'investment').length,
    [entries, prevMonth],
  );
  const activeMonths = useMemo(
    () => new Set(entries.filter((x) => x.type === 'investment' && x.amount > 0).map((x) => x.month)).size,
    [entries],
  );
  const avgMonthly = activeMonths > 0 ? Math.round(total / activeMonths) : 0;

  const monthPct = deltaPercent(monthInvested, prevMonthInvested);
  const opsPct = deltaPercent(opsThisMonth, opsPrevMonth);
  const yearPct = deltaPercent(yearInvested, prevYearInvested);
  const vsAvgPct = avgMonthly > 0 ? deltaPercent(monthInvested, avgMonthly) : null;

  return (
    <section
      className={`finance-card ${compact ? 'p-3' : 'p-3.5 sm:p-4'}`}
      aria-labelledby="finance-overview-heading"
    >
      <FinanceSectionHeading
        id="finance-overview-heading"
        title="Cartera"
        subtitle="Resumen de inversión"
        icon={Wallet}
        iconTone="blue"
      />

      <div
        className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
      >
        <StatCell
          label="Este mes"
          value={formatARS(monthInvested)}
          emphasis={!compact}
          compact={compact}
          delta={
            prevMonthInvested > 0 ? (
              <FinanceDelta
                absolute={monthInvested - prevMonthInvested}
                percent={monthPct}
                versus={`vs ${formatMonthShort(prevMonth)}`}
                sense="invest"
              />
            ) : undefined
          }
        />
        <StatCell
          label="Promedio mensual"
          value={formatARS(avgMonthly)}
          compact={compact}
          delta={
            avgMonthly > 0 && monthInvested > 0 ? (
              <FinanceDelta
                absolute={monthInvested - avgMonthly}
                percent={vsAvgPct}
                versus="vs tu promedio"
                sense="invest"
              />
            ) : (
              <span className="text-[10px] font-medium text-slate-500">
                {activeMonths > 0 ? `${activeMonths} meses activos` : 'Sin datos'}
              </span>
            )
          }
        />
        <StatCell
          label="Operaciones"
          value={String(opsThisMonth)}
          compact={compact}
          delta={
            opsPrevMonth > 0 ? (
              <FinanceDelta
                absolute={opsThisMonth - opsPrevMonth}
                percent={opsPct}
                versus={`vs ${formatMonthShort(prevMonth)}`}
                sense="neutral"
              />
            ) : (
              <span className="text-[10px] font-medium text-slate-500">En el mes</span>
            )
          }
        />
        <StatCell
          label={`Año ${year}`}
          value={formatARS(yearInvested)}
          compact={compact}
          delta={
            prevYearInvested > 0 ? (
              <FinanceDelta
                absolute={yearInvested - prevYearInvested}
                percent={yearPct}
                versus={`vs ${year - 1}`}
                sense="invest"
              />
            ) : (
              <span className="text-[10px] font-medium text-slate-500">Acumulado</span>
            )
          }
        />
        <StatCell
          label="Total histórico"
          value={formatARS(total)}
          compact={compact}
          delta={<span className="text-[10px] font-medium text-slate-500">Desde el inicio</span>}
        />
      </div>
    </section>
  );
}
