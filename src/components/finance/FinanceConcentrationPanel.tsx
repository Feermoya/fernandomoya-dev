import { useMemo } from 'react';
import { formatARS } from '@/lib/finance/calculations';
import { getTickerMonthlyBreakdown } from '@/lib/finance/monthlyBreakdown';
import type { FinanceEntry } from '@/lib/finance/types';

type Props = {
  entries: FinanceEntry[];
  month: string;
};

export function FinanceConcentrationPanel({ entries, month }: Props) {
  const breakdown = useMemo(() => getTickerMonthlyBreakdown(entries, month), [entries, month]);
  const topThree = breakdown.items.slice(0, 3);

  if (breakdown.total <= 0 || topThree.length === 0) return null;

  return (
    <section
      className="finance-card-compact p-3"
      aria-labelledby="concentration-heading"
    >
      <h2
        id="concentration-heading"
        className="finance-label"
      >
        Concentración del mes
      </h2>

      {breakdown.concentrationWarning && breakdown.topItem ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-700">
          Alta concentración en {breakdown.topItem.label}
        </p>
      ) : null}

      <ul className="mt-2.5 space-y-2.5">
        {topThree.map((item) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-black text-slate-900">{item.label}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-600">
                {item.percent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.min(100, item.percent)}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-500">
              {formatARS(item.amount)} · {item.count} {item.count === 1 ? 'op.' : 'ops.'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
