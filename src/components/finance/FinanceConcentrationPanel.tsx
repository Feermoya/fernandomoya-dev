import { useMemo } from 'react';
import { ChartPie } from 'lucide-react';
import { formatARS } from '@/lib/finance/calculations';
import { getTickerMonthlyBreakdown } from '@/lib/finance/monthlyBreakdown';
import type { FinanceEntry } from '@/lib/finance/types';
import { FinanceSectionHeading } from '@/components/finance/FinanceSectionHeading';

type Props = {
  entries: FinanceEntry[];
  month: string;
};

const BAR_TONES = ['bg-blue-600', 'bg-violet-500', 'bg-cyan-600', 'bg-indigo-500', 'bg-sky-600'];

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
    <section className="finance-card-compact p-3.5 sm:p-4" aria-labelledby="concentration-heading">
      <FinanceSectionHeading
        id="concentration-heading"
        title="Concentración del mes"
        subtitle={statusLabel}
        icon={ChartPie}
        iconTone="violet"
      />

      {breakdown.topItem ? (
        <p className="mt-2.5 text-sm font-semibold leading-snug text-slate-700">
          <span className="font-black text-slate-900">{breakdown.topItem.label}</span>
          {' · '}
          <span className="tabular-nums text-slate-900">{breakdown.topItem.percent.toFixed(0)}%</span>
          {' de las compras del mes'}
        </p>
      ) : null}

      <ul className="mt-3 space-y-3">
        {topThree.map((item, index) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-bold tracking-tight text-slate-900">
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-black tabular-nums text-slate-800">
                {item.percent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  item.percent >= 50 ? 'bg-amber-500' : BAR_TONES[index % BAR_TONES.length]
                }`}
                style={{ width: `${Math.min(100, item.percent)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-semibold tabular-nums text-slate-500">
              {formatARS(item.amount)}
              {' · '}
              {item.count} {item.count === 1 ? 'operación' : 'operaciones'}
            </p>
          </li>
        ))}
      </ul>

      {rest.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none text-[11px] font-bold text-blue-700 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
            Ver distribución completa ({breakdown.items.length})
          </summary>
          <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            {rest.map((item) => (
              <li
                key={item.label}
                className="flex items-baseline justify-between gap-2 text-xs font-semibold text-slate-700"
              >
                <span className="truncate">{item.label}</span>
                <span className="tabular-nums text-slate-500">
                  {item.percent.toFixed(0)}% · {formatARS(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
