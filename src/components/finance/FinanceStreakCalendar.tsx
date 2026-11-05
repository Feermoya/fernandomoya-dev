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
    <div
      className={
        compact
          ? 'rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/70 via-white to-slate-50/40 px-2.5 py-2.5'
          : 'finance-card-compact px-2.5 py-2 sm:px-3 sm:py-2.5'
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="finance-label mb-0 flex items-center gap-1.5 text-amber-800">
          <Flame size={12} strokeWidth={2.25} className="text-amber-600" aria-hidden />
          Racha
          {typeof streakCount === 'number' ? (
            <span className="ml-1 font-bold normal-case tracking-normal tabular-nums text-slate-900">
              {streakCount} {streakUnit}
            </span>
          ) : null}
        </p>
        <p className="text-[9px] font-medium text-slate-500">Mín. {formatARS(MONTHLY_STREAK_MINIMUM_ARS)}</p>
      </div>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 sm:gap-1.5 lg:grid-cols-12">
        {cells.map((c) => {
          const bg = c.isFuture
            ? 'bg-slate-50 border-slate-200 text-slate-400'
            : c.qualified
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-200/60'
              : c.invested > 0
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700';
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
              className={`flex flex-col items-center rounded-lg border px-0.5 py-1.5 transition ${bg} ${
                c.isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              } ${c.qualified && !c.isFuture ? 'finance-streak-win' : ''}`}
            >
              <span
                className={`text-[7px] font-bold uppercase tracking-wide sm:text-[8px] ${
                  c.qualified && !c.isFuture ? 'text-emerald-50' : 'opacity-80'
                }`}
              >
                {c.label}
              </span>
              <span className="mt-0.5 text-[10px] font-black leading-none sm:text-xs" aria-hidden>
                {c.isFuture ? '·' : c.qualified ? '✓' : c.invested > 0 ? '!' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2.5 text-[9px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-emerald-500" /> Cumplido
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-500" /> Bajo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-red-400" /> Vacío
        </span>
      </div>
    </div>
  );
}
