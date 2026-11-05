import { useMemo } from 'react';
import { formatARS } from '@/lib/finance/calculations';
import { getTickerMonthlyBreakdown } from '@/lib/finance/monthlyBreakdown';
import type { FinanceEntry } from '@/lib/finance/types';
import { FocoCard, FocoChip } from '@/components/finance/ui';

type Props = {
  entries: FinanceEntry[];
  month: string;
};

const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function FinanceConcentrationPanel({ entries, month }: Props) {
  const breakdown = useMemo(() => getTickerMonthlyBreakdown(entries, month), [entries, month]);
  const topThree = breakdown.items.slice(0, 3);
  const rest = breakdown.items.slice(3);

  if (breakdown.total <= 0 || topThree.length === 0) return null;

  const statusLabel = breakdown.concentrationWarning
    ? 'Concentración alta'
    : topThree[0].percent >= 35
      ? 'Concentración moderada'
      : 'Concentración distribuida';

  return (
    <FocoCard className="h-full" aria-labelledby="concentration-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="concentration-heading" className="foco-card-title">
            Concentración del mes
          </h3>
          <p className="mt-0.5 text-[13px] font-medium text-[var(--text-muted)]">
            Distribución de compras
          </p>
        </div>
        <FocoChip tone={breakdown.concentrationWarning ? 'warning' : 'neutral'}>
          {statusLabel}
        </FocoChip>
      </div>

      <ul className="mt-4 space-y-3.5">
        {topThree.map((item, index) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="foco-card-title min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 text-[17px] font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                {item.percent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--bg-segment)]">
              <div
                className="foco-bar-fill h-full origin-left rounded-full"
                style={{
                  background: item.percent >= 50 ? 'var(--chart-1)' : CHART_VARS[index % CHART_VARS.length],
                  transform: `scaleX(${Math.min(1, Math.max(0, item.percent / 100))})`,
                  transitionDelay: `${index * 60}ms`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[13px] font-medium tabular-nums text-[var(--text-muted)]">
              {formatARS(item.amount)} · {item.count}{' '}
              {item.count === 1 ? 'operación' : 'operaciones'}
            </p>
          </li>
        ))}
      </ul>

      {rest.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-[var(--primary)] [&::-webkit-details-marker]:hidden">
            Ver distribución completa ({breakdown.items.length})
          </summary>
          <ul className="mt-2 space-y-2 border-t border-[var(--border-card)] pt-2">
            {rest.map((item) => (
              <li
                key={item.label}
                className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-[var(--text-secondary)]"
              >
                <span className="truncate">{item.label}</span>
                <span className="tabular-nums text-[var(--text-muted)]">
                  {item.percent.toFixed(0)}% · {formatARS(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </FocoCard>
  );
}
