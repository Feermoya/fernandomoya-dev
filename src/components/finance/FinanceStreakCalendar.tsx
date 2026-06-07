import { formatARS, getStreakCalendarCells, MONTHLY_STREAK_MINIMUM_ARS } from '@/lib/finance/calculations';
import type { FinanceEntry } from '@/lib/finance/types';
import { Flame } from 'lucide-react';

type Props = {
  entries: FinanceEntry[];
  monthCount?: number;
  streakCount?: number;
  compact?: boolean;
};

export function FinanceStreakCalendar({ entries, monthCount = 12, streakCount, compact = false }: Props) {
  const cells = getStreakCalendarCells(entries, monthCount);
  const streakUnit = streakCount === 1 ? 'mes' : 'meses';

  return (
    <div className={compact ? 'rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2' : 'finance-card-compact px-2.5 py-2 sm:px-3 sm:py-2.5'}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="finance-label flex items-center gap-1">
          <Flame size={12} strokeWidth={2.25} className="text-amber-600" aria-hidden />
          Racha
          {typeof streakCount === 'number' ? (
            <span className="ml-1.5 font-black tabular-nums text-slate-700">
              · {streakCount} {streakUnit}
            </span>
          ) : null}
        </p>
        <p className="text-[9px] font-medium text-slate-500">Mín. {formatARS(MONTHLY_STREAK_MINIMUM_ARS)}</p>
      </div>
      <div className="grid grid-cols-4 gap-0.5 sm:grid-cols-6 sm:gap-1 lg:grid-cols-12">
        {cells.map((c) => {
          const bg = c.isFuture
            ? 'bg-slate-50 border-slate-200'
            : c.qualified
              ? 'bg-emerald-100 border-emerald-300'
              : c.invested > 0
                ? 'bg-amber-50 border-amber-300'
                : 'bg-red-50 border-red-200';
          const title = c.isFuture
            ? `${c.label}: mes futuro`
            : c.qualified
              ? `${c.label}: racha OK (${formatARS(c.invested)})`
              : c.invested > 0
                ? `${c.label}: ${formatARS(c.invested)} (falta mínimo)`
                : `${c.label}: sin inversión`;

          return (
            <div
              key={c.month}
              title={title}
              className={`flex flex-col items-center rounded border px-0.5 py-1 ${bg} ${c.isCurrent ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            >
              <span className="text-[7px] font-bold uppercase tracking-wide text-slate-500 sm:text-[8px]">
                {c.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-none sm:text-xs" aria-hidden>
                {c.isFuture ? '·' : c.qualified ? '✓' : c.invested > 0 ? '!' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-emerald-500" /> OK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-500" /> Bajo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-red-500" /> Vacío
        </span>
      </div>
    </div>
  );
}
