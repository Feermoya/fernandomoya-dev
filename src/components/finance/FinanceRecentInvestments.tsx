import { formatARS } from '@/lib/finance/calculations';
import type { FinanceEntry } from '@/lib/finance/types';

type Props = {
  month: string;
  investments: FinanceEntry[];
  onEdit: (entry: FinanceEntry) => void;
  onRemove: (id: string) => void;
};

function InvestmentRow({
  entry,
  onEdit,
  onRemove,
  compact,
}: {
  entry: FinanceEntry;
  onEdit: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const dateStr = new Date(entry.createdAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li
      className={`group flex items-center justify-between gap-2 border-l-2 border-emerald-400/70 bg-white/[0.025] transition hover:bg-white/[0.04] ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className={`font-black tabular-nums text-white ${compact ? 'text-base' : 'text-lg'}`}>
            {formatARS(entry.amount)}
          </p>
          {entry.asset ? (
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
              {entry.asset}
            </span>
          ) : null}
        </div>
        <p className="text-[10px] text-slate-500">{dateStr}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="finance-touch-target rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="finance-touch-target rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-300"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

export function FinanceRecentInvestments({ month, investments, onEdit, onRemove }: Props) {
  const total = investments.reduce((s, e) => s + e.amount, 0);
  const count = investments.length;

  if (count === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
        Todavía no cargaste inversiones este mes.
      </p>
    );
  }

  return (
    <details className="group rounded-2xl border border-white/10 bg-slate-950/45 shadow-md">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-3.5 py-3 transition hover:bg-white/[0.03] sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-black text-white">Últimas inversiones</span>
        <span className="ml-auto text-right text-[11px] font-bold tabular-nums text-slate-400">
          {count} · {formatARS(total)}
        </span>
        <span
          className="text-slate-500 transition group-open:rotate-180"
          aria-hidden
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-white/10 px-2 pb-2 pt-1 sm:px-3">
        <ul className="flex flex-col gap-1">
          {investments.map((e) => (
            <InvestmentRow
              key={e.id}
              entry={e}
              compact
              onEdit={() => onEdit(e)}
              onRemove={() => onRemove(e.id)}
            />
          ))}
        </ul>
      </div>
    </details>
  );
}
