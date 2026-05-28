import { formatARS, getStreakCalendarCells, MONTHLY_STREAK_MINIMUM_ARS } from '@/lib/finance/calculations';
import type { FinanceEntry } from '@/lib/finance/types';

type Props = {
  entries: FinanceEntry[];
  monthCount?: number;
  streakCount?: number;
};

export function FinanceStreakCalendar({ entries, monthCount = 12, streakCount }: Props) {
  const cells = getStreakCalendarCells(entries, monthCount);
  const streakUnit = streakCount === 1 ? 'mes' : 'meses';

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/50">
          Racha
          {typeof streakCount === 'number' ? (
            <span className="ml-1.5 font-black tabular-nums text-white/75">
              · {streakCount} {streakUnit}
            </span>
          ) : null}
        </p>
        <p className="text-[9px] font-medium text-white/40">Mín. {formatARS(MONTHLY_STREAK_MINIMUM_ARS)}</p>
      </div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-12 sm:gap-1.5">
        {cells.map((c) => {
          const bg = c.isFuture
            ? 'bg-white/5 border-white/10'
            : c.qualified
              ? 'bg-emerald-500/25 border-emerald-400/45'
              : c.invested > 0
                ? 'bg-amber-500/15 border-amber-400/35'
                : 'bg-rose-950/40 border-rose-500/25';
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
              className={`flex flex-col items-center rounded-md border px-0.5 py-1.5 sm:py-2 ${bg} ${c.isCurrent ? 'ring-1 ring-cyan-400/60' : ''}`}
            >
              <span className="text-[8px] font-bold uppercase tracking-wide text-white/55 sm:text-[9px]">
                {c.label}
              </span>
              <span className="mt-0.5 text-xs leading-none sm:text-sm" aria-hidden>
                {c.isFuture ? '·' : c.qualified ? '✓' : c.invested > 0 ? '!' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 hidden flex-wrap gap-2 text-[9px] font-medium text-white/40 sm:flex">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-emerald-400/80" /> OK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-400/60" /> Bajo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-rose-500/50" /> Vacío
        </span>
      </div>
    </div>
  );
}
