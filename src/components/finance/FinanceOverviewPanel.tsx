import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import {
  formatARS,
  formatEntryAmount,
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
  primary,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  emphasis?: boolean;
  compact?: boolean;
  primary?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border px-2.5 py-2 ${
        primary
          ? 'border-blue-200/90 bg-blue-50/50 sm:col-span-1'
          : 'border-slate-200/80 bg-white'
      } ${compact ? '' : 'sm:px-3 sm:py-3'} ${emphasis ? 'sm:col-span-2' : ''}`}
    >
      <p className={`finance-label ${primary ? 'text-blue-700' : ''}`}>{label}</p>
      <p
        className={`mt-0.5 tabular-nums tracking-tight text-slate-900 ${
          primary ? 'text-xl font-black sm:text-2xl' : 'text-sm font-bold text-slate-700'
        }`}
      >
        {value}
      </p>
      {delta ? <div className="mt-1">{delta}</div> : null}
    </article>
  );
}

export function FinanceOverviewPanel({ state, month, variant = 'full' }: Props) {
  const compact = variant === 'compact';
  const entries = state.entries;
  const year = getYearFromMonthKey(month);
  const yearInvested = useMemo(() => getYearInvested(entries, year, 'ARS'), [entries, year]);
  const prevYearInvested = useMemo(() => getYearInvested(entries, year - 1, 'ARS'), [entries, year]);
  const monthInvested = useMemo(() => getMonthlyInvested(entries, month, 'ARS'), [entries, month]);
  const monthInvestedUsd = useMemo(
    () => getMonthlyInvested(entries, month, 'USD'),
    [entries, month],
  );
  const prevMonth = addMonths(month, -1);
  const prevMonthInvested = useMemo(
    () => getMonthlyInvested(entries, prevMonth, 'ARS'),
    [entries, prevMonth],
  );
  const total = useMemo(() => getTotalInvested(entries, 'ARS'), [entries]);
  const totalUsd = useMemo(() => getTotalInvested(entries, 'USD'), [entries]);
  const opsThisMonth = useMemo(
    () => entries.filter((e) => e.month === month && e.type === 'investment').length,
    [entries, month],
  );
  const opsPrevMonth = useMemo(
    () => entries.filter((e) => e.month === prevMonth && e.type === 'investment').length,
    [entries, prevMonth],
  );
  const activeMonths = useMemo(
    () =>
      new Set(
        entries
          .filter((x) => x.type === 'investment' && x.amount > 0 && (x.amountCurrency !== 'USD'))
          .map((x) => x.month),
      ).size,
    [entries],
  );
  const avgMonthly = activeMonths > 0 ? Math.round(total / activeMonths) : 0;

  const monthPct = deltaPercent(monthInvested, prevMonthInvested);
  const opsPct = deltaPercent(opsThisMonth, opsPrevMonth);
  const yearPct = deltaPercent(yearInvested, prevYearInvested);
  const vsAvgPct = avgMonthly > 0 ? deltaPercent(monthInvested, avgMonthly) : null;

  const secondary = (
    <>
      <StatCell
        label="Promedio mensual"
        value={formatARS(avgMonthly)}
        compact={compact}
        delta={
          avgMonthly > 0 && monthInvested > 0 ? (
            <FinanceDelta
              absolute={monthInvested - avgMonthly}
              percent={vsAvgPct}
              versus="vs promedio"
              sense="invest"
            />
          ) : (
            <span className="text-[10px] font-medium text-slate-500">
              {activeMonths > 0 ? `${activeMonths} meses` : 'Sin datos'}
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
    </>
  );

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

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <StatCell
          label="Este mes"
          value={formatARS(monthInvested)}
          primary
          compact={compact}
          delta={
            <>
              {prevMonthInvested > 0 ? (
                <FinanceDelta
                  absolute={monthInvested - prevMonthInvested}
                  percent={monthPct}
                  versus={`vs ${formatMonthShort(prevMonth)}`}
                  sense="invest"
                />
              ) : null}
              {monthInvestedUsd > 0 ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                  + {formatEntryAmount(monthInvestedUsd, 'USD')} en dólares
                </p>
              ) : null}
            </>
          }
        />
        <StatCell
          label="Total histórico"
          value={formatARS(total)}
          primary
          compact={compact}
          delta={
            <>
              <span className="text-[10px] font-medium text-slate-500">Desde el inicio</span>
              {totalUsd > 0 ? (
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                  + {formatEntryAmount(totalUsd, 'USD')} en dólares
                </p>
              ) : null}
            </>
          }
        />
      </div>

      {compact ? (
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-[11px] font-bold text-blue-700 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
            Ver promedio, ops y año
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{secondary}</div>
        </details>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{secondary}</div>
      )}
    </section>
  );
}
