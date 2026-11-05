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

  const statusTone = breakdown.concentrationWarning
    ? 'text-amber-800 bg-amber-50 border-amber-200'
    : topThree[0].percent >= 35
      ? 'text-blue-800 bg-blue-50 border-blue-200'
      : 'text-emerald-800 bg-emerald-50 border-emerald-200';

  return (
    <section
      className="finance-card finance-panel-enter h-full p-3.5 sm:p-4 lg:p-5"
      aria-labelledby="concentration-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <FinanceSectionHeading
          id="concentration-heading"
          title="Concentración del mes"
          subtitle="Distribución de compras"
          icon={ChartPie}
          iconTone="violet"
        />
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      {breakdown.topItem ? (
        <p className="mt-3 text-sm font-semibold leading-snug text-slate-600">
          <span className="font-black text-slate-900">{breakdown.topItem.label}</span>
          {' lidera con '}
          <span className="tabular-nums font-black text-slate-900">
            {breakdown.topItem.percent.toFixed(0)}%
          </span>
        </p>
      ) : null}

      <ul className="mt-4 space-y-3.5">
        {topThree.map((item, index) => (
          <li key={item.label} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] font-bold tracking-tight text-slate-900">
                {item.label}
              </span>
              <span className="shrink-0 text-base font-black tabular-nums text-slate-900">
                {item.percent.toFixed(0)}
                <span className="text-sm font-bold text-slate-500">%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`finance-progress-fill h-full w-full origin-left rounded-full motion-reduce:transition-none ${
                  item.percent >= 50 ? 'bg-amber-500' : BAR_TONES[index % BAR_TONES.length]
                }`}
                style={{
                  transform: `scaleX(${Math.min(1, Math.max(0, item.percent / 100))})`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-slate-500">
              {formatARS(item.amount)}
              <span className="mx-1 text-slate-300">·</span>
              {item.count} {item.count === 1 ? 'operación' : 'operaciones'}
            </p>
          </li>
        ))}
      </ul>

      {rest.length > 0 ? (
        <details className="finance-details-inline mt-4">
          <summary className="cursor-pointer list-none text-[11px] font-bold text-blue-700 underline-offset-2 transition hover:underline [&::-webkit-details-marker]:hidden">
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
