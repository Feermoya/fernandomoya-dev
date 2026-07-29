import { useMemo } from 'react';
import { History } from 'lucide-react';
import { formatARS } from '@/lib/finance/calculations';
import { getTickerHistorySummary } from '@/lib/finance/tickerHistory';
import type { FinanceEntry } from '@/lib/finance/types';
import { FinanceDetailsSummary } from '@/components/finance/FinanceDetailsSummary';

type Props = {
  entries: FinanceEntry[];
};

function formatMonthKey(ym: string): string {
  const [ys, ms] = ym.split('-').map(Number);
  if (!Number.isFinite(ys) || !Number.isFinite(ms)) return ym;
  const d = new Date(ys, ms - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

export function FinanceTickerHistoryPanel({ entries }: Props) {
  const summary = useMemo(() => getTickerHistorySummary(entries), [entries]);
  const topFive = summary.items.slice(0, 5);

  if (topFive.length === 0) return null;

  return (
    <details className="finance-details group open:pb-1">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <FinanceDetailsSummary
          icon={History}
          label="Historial"
          trailing={
            <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-500">
              {topFive.length}
            </span>
          }
        />
        <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="px-3 pb-3 pt-2 sm:px-4">
        <ul className="space-y-2">
          {topFive.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold tracking-tight text-slate-900">
                  {item.label}
                </span>
                <span className="finance-metric-sm shrink-0 text-base">
                  {formatARS(item.totalAmount)}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                {item.count} {item.count === 1 ? 'compra' : 'compras'} · último{' '}
                {formatMonthKey(item.lastMonth)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
