import { ArrowLeftRight } from 'lucide-react';
import {
  entryAmountCurrency,
  formatARS,
  formatEntryAmount,
} from '@/lib/finance/calculations';
import { formatFinancePrice } from '@/lib/finance/financePrices';
import { getEntryTicker } from '@/lib/finance/entryTicker';
import type { FinanceEntry } from '@/lib/finance/types';
import { FinanceTickerBadge } from '@/components/finance/FinanceTickerBadge';
import { FinanceDetailsSummary } from '@/components/finance/FinanceDetailsSummary';

type Props = {
  month: string;
  investments: FinanceEntry[];
  onEdit: (entry: FinanceEntry) => void;
  onRemove: (id: string) => void;
};

function formatBuyPrice(entry: FinanceEntry): string | null {
  if (!entry.buyPrice || entry.buyPrice <= 0) return null;
  const ticker = getEntryTicker(entry) ?? entry.ticker;
  if (!ticker) return null;
  const priceStr = formatFinancePrice(entry.buyPrice, entry.buyCurrency ?? 'ARS');
  return `${ticker} · compra ${priceStr}`;
}

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

  const ticker = getEntryTicker(entry);
  const buyLine = formatBuyPrice(entry);
  const metaParts = [entry.platform, entry.category && !ticker ? entry.category : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={`group flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 transition hover:bg-slate-100 ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`font-bold tabular-nums tracking-tight text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {formatEntryAmount(entry.amount, entryAmountCurrency(entry))}
          </p>
          {ticker ? <FinanceTickerBadge ticker={ticker} tone="blue" /> : null}
          {!ticker && entry.asset ? (
            <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
              {entry.asset}
            </span>
          ) : null}
        </div>
        {buyLine ? (
          <p className="mt-0.5 text-[10px] font-semibold text-slate-600">{buyLine}</p>
        ) : null}
        {entry.estimatedUnits && entry.estimatedUnits > 0 ? (
          <p className="text-[10px] font-medium text-slate-500">
            ~{entry.estimatedUnits.toLocaleString('es-AR', { maximumFractionDigits: 2 })} unidades
          </p>
        ) : null}
        {metaParts ? (
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">{metaParts}</p>
        ) : null}
        <p className="text-[10px] text-slate-400">{dateStr}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="finance-touch-target rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-blue-600"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="finance-touch-target rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-600"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

export function FinanceRecentInvestments({ investments, onEdit, onRemove }: Props) {
  const totalArs = investments
    .filter((e) => entryAmountCurrency(e) === 'ARS')
    .reduce((s, e) => s + e.amount, 0);
  const totalUsd = investments
    .filter((e) => entryAmountCurrency(e) === 'USD')
    .reduce((s, e) => s + e.amount, 0);
  const count = investments.length;
  const totalLabel =
    totalUsd > 0
      ? `${formatARS(totalArs)} + ${formatEntryAmount(totalUsd, 'USD')}`
      : formatARS(totalArs);

  if (count === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        Todavía no hay movimientos este mes.
      </p>
    );
  }

  return (
    <details className="finance-details group">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-3.5 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <FinanceDetailsSummary
          icon={ArrowLeftRight}
          label="Movimientos"
          trailing={
            <span className="ml-auto text-right text-[11px] font-bold tabular-nums text-slate-500">
              {count} {count === 1 ? 'operación' : 'operaciones'} · {totalLabel}
            </span>
          }
        />
        <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="px-2 pb-2 pt-1 sm:px-3">
        <ul className="flex flex-col gap-1.5">
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
