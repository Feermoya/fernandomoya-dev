import { useMemo } from 'react';
import type { ReactNode } from 'react';
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
import { deltaPercent, formatMonthShort } from '@/components/finance/FinanceDelta';
import { FocoCard, FocoTrendChip } from '@/components/finance/ui';

type Props = {
  state: FinanceState;
  month: string;
  variant?: 'full' | 'compact';
};

function StatCell({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
}) {
  return (
    <article className="foco-subcard">
      <p className="foco-label">{label}</p>
      <p className="foco-amount-secondary mt-1 tabular-nums">{value}</p>
      {delta ? <div className="mt-2">{delta}</div> : null}
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
          .filter((x) => x.type === 'investment' && x.amount > 0 && x.amountCurrency !== 'USD')
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
        delta={
          avgMonthly > 0 && monthInvested > 0 && vsAvgPct != null && vsAvgPct !== 0 ? (
            <FocoTrendChip percent={vsAvgPct} versus="vs promedio" />
          ) : (
            <span className="text-[13px] font-medium text-[var(--text-muted)]">
              {activeMonths > 0 ? `${activeMonths} meses` : 'Sin datos'}
            </span>
          )
        }
      />
      <StatCell
        label="Operaciones"
        value={String(opsThisMonth)}
        delta={
          opsPrevMonth > 0 && opsPct != null && opsPct !== 0 ? (
            <FocoTrendChip percent={opsPct} versus={`vs ${formatMonthShort(prevMonth)}`} />
          ) : (
            <span className="text-[13px] font-medium text-[var(--text-muted)]">En el mes</span>
          )
        }
      />
      <StatCell
        label={`Año ${year}`}
        value={formatARS(yearInvested)}
        delta={
          prevYearInvested > 0 && yearPct != null && yearPct !== 0 ? (
            <FocoTrendChip percent={yearPct} versus={`vs ${year - 1}`} />
          ) : (
            <span className="text-[13px] font-medium text-[var(--text-muted)]">Acumulado</span>
          )
        }
      />
    </>
  );

  return (
    <FocoCard className="h-full" aria-labelledby="finance-overview-heading">
      <h3 id="finance-overview-heading" className="foco-card-title">
        Cartera
      </h3>
      <p className="mt-0.5 text-[13px] font-medium text-[var(--text-muted)]">Resumen de inversión</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCell
          label="Este mes"
          value={formatARS(monthInvested)}
          delta={
            <>
              {prevMonthInvested > 0 && monthPct != null && monthPct !== 0 ? (
                <FocoTrendChip percent={monthPct} versus={`vs ${formatMonthShort(prevMonth)}`} />
              ) : null}
              {monthInvestedUsd > 0 ? (
                <p className="mt-1 text-[13px] font-medium tabular-nums text-[var(--text-muted)]">
                  + {formatEntryAmount(monthInvestedUsd, 'USD')} en dólares
                </p>
              ) : null}
            </>
          }
        />
        <StatCell
          label="Total histórico"
          value={formatARS(total)}
          delta={
            <>
              <span className="text-[13px] font-medium text-[var(--text-muted)]">Desde el inicio</span>
              {totalUsd > 0 ? (
                <p className="mt-1 text-[13px] font-medium tabular-nums text-[var(--text-muted)]">
                  + {formatEntryAmount(totalUsd, 'USD')} en dólares
                </p>
              ) : null}
            </>
          }
        />
      </div>

      {compact ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-[var(--primary)] [&::-webkit-details-marker]:hidden">
            Ver promedio, ops y año
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">{secondary}</div>
        </details>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">{secondary}</div>
      )}
    </FocoCard>
  );
}
