import { formatARS, getStreakCalendarCells, MONTHLY_STREAK_MINIMUM_ARS } from '@/lib/finance/calculations';
import type { FinanceEntry } from '@/lib/finance/types';

type Props = {
  entries: FinanceEntry[];
  monthCount?: number;
};

export function FinanceStreakCalendar({ entries, monthCount = 12 }: Props) {
  const cells = getStreakCalendarCells(entries, monthCount);

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Calendario de racha</p>
        <p className="text-[10px] font-semibold text-white/40">Mín. {formatARS(MONTHLY_STREAK_MINIMUM_ARS)}/mes</p>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
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
              className={`flex flex-col items-center rounded-lg border px-1 py-2 ${bg} ${c.isCurrent ? 'ring-2 ring-cyan-400/60' : ''}`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide text-white/55">{c.label}</span>
              <span className="mt-1 text-sm leading-none" aria-hidden>
                {c.isFuture ? '·' : c.qualified ? '✓' : c.invested > 0 ? '!' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold text-white/45">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-400/80" /> Racha OK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-400/60" /> Inversión baja
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-rose-500/50" /> Sin carga
        </span>
      </div>
    </div>
  );
}
