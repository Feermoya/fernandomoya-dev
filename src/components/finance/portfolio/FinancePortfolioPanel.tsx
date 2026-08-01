import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CircleAlert,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { sileo } from 'sileo';
import { formatARS } from '@/lib/finance/calculations';
import {
  fetchFinancePrices,
  formatFinancePrice,
  type FinancePricesMap,
} from '@/lib/finance/financePrices';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';
import {
  buildPortfolioHoldingViews,
  filterPortfolioViews,
  sortPortfolioViews,
  summarizePortfolioViews,
  type PortfolioViewFilter,
  type PortfolioViewSort,
} from '@/lib/finance/portfolio/portfolioView';
import { FinanceDetailsSummary } from '@/components/finance/FinanceDetailsSummary';
import { FinancePortfolioCsvImport } from '@/components/finance/portfolio/FinancePortfolioCsvImport';
import { FinancePortfolioForm } from '@/components/finance/portfolio/FinancePortfolioForm';

type Props = {
  holdings: FinancePortfolioHolding[];
  onChange: (next: FinancePortfolioHolding[]) => void;
};

const PAGE_SIZE = 6;

function formatMoney(value: number, currency: string): string {
  if (currency === 'ARS') return formatARS(value);
  return formatFinancePrice(value, currency);
}

function RowMenu({
  ticker,
  onEdit,
  onRemove,
}: {
  ticker: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="finance-touch-target rounded-lg p-1.5 text-slate-500 hover:text-slate-800"
        aria-label={`Acciones de ${ticker}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[8.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={14} strokeWidth={2.25} aria-hidden />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            <Trash2 size={14} strokeWidth={2.25} aria-hidden />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HoldingRow({
  view,
  onEdit,
  onRemove,
}: {
  view: ReturnType<typeof buildPortfolioHoldingViews>[number];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { holding, marketValue, deltaPct, status } = view;
  let DeltaIcon = Minus;
  let deltaClass = 'text-slate-500';
  let deltaText = 'Sin cambios';
  if (status === 'no_price') {
    DeltaIcon = CircleAlert;
    deltaClass = 'text-amber-700';
    deltaText = 'Sin precio';
  } else if (status === 'gain' && deltaPct != null) {
    DeltaIcon = TrendingUp;
    deltaClass = 'text-emerald-700';
    deltaText = `+${deltaPct.toFixed(1).replace('.', ',')}%`;
  } else if (status === 'loss' && deltaPct != null) {
    DeltaIcon = TrendingDown;
    deltaClass = 'text-red-700';
    deltaText = `${deltaPct.toFixed(1).replace('.', ',')}%`;
  }

  return (
    <li className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {holding.ticker}
            {holding.displayName ? (
              <span className="font-medium text-slate-500"> · {holding.displayName}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-600">
            {holding.quantity.toLocaleString('es-AR')} u. · promedio{' '}
            {formatMoney(holding.averagePurchasePrice, holding.currency)}
            {holding.broker ? ` · ${holding.broker}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <div className="text-right">
            {marketValue != null ? (
              <p className="text-sm font-black tabular-nums text-slate-900">
                {formatMoney(marketValue, holding.currency)}
              </p>
            ) : (
              <p className="text-xs font-bold text-amber-700">—</p>
            )}
            <p className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold ${deltaClass}`}>
              <DeltaIcon size={12} strokeWidth={2.5} aria-hidden />
              {deltaText}
            </p>
          </div>
          <RowMenu ticker={holding.ticker} onEdit={onEdit} onRemove={onRemove} />
        </div>
      </div>
    </li>
  );
}

export function FinancePortfolioPanel({ holdings, onChange }: Props) {
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'csv'>('list');
  const [editing, setEditing] = useState<FinancePortfolioHolding | null>(null);
  const [prices, setPrices] = useState<FinancePricesMap>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PortfolioViewFilter>('all');
  const [sort, setSort] = useState<PortfolioViewSort>('loss');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const tickersKey = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker))].sort().join(','),
    [holdings],
  );

  useEffect(() => {
    if (!tickersKey) {
      setPrices({});
      return;
    }
    let cancelled = false;
    void fetchFinancePrices(tickersKey.split(',')).then((res) => {
      if (!cancelled) setPrices(res.prices);
    });
    return () => {
      cancelled = true;
    };
  }, [tickersKey]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, filter, sort, holdings.length]);

  const views = useMemo(
    () => buildPortfolioHoldingViews(holdings, prices),
    [holdings, prices],
  );
  const summary = useMemo(() => summarizePortfolioViews(views), [views]);
  const filtered = useMemo(
    () => sortPortfolioViews(filterPortfolioViews(views, filter, query), sort),
    [views, filter, query, sort],
  );
  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(0, filtered.length - visible.length);

  const summaryLine = useMemo(() => {
    if (summary.count === 0) return 'Sin posiciones';
    const parts = [`${summary.count} activos`];
    for (const row of summary.byCurrency) {
      if (row.deltaPct != null) {
        parts.push(
          `${formatMoney(row.marketValue, row.currency)} (${row.deltaPct >= 0 ? '+' : ''}${row.deltaPct.toFixed(1).replace('.', ',')}% ${row.currency})`,
        );
      } else if (row.marketValue > 0) {
        parts.push(`${formatMoney(row.marketValue, row.currency)}`);
      }
    }
    return parts.join(' · ');
  }, [summary]);

  const removeHolding = (holding: FinancePortfolioHolding) => {
    if (
      !window.confirm(
        `¿Eliminar ${holding.ticker}${holding.displayName ? ` (${holding.displayName})` : ''}?`,
      )
    ) {
      return;
    }
    onChange(holdings.filter((h) => h.id !== holding.id));
    sileo.success({ title: 'Posición eliminada', description: holding.ticker });
  };

  return (
    <details className="finance-details group open:pb-1">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <FinanceDetailsSummary
          icon={Briefcase}
          label="Posiciones históricas"
          trailing={
            <span className="ml-auto max-w-[55%] truncate text-right text-[10px] font-bold tabular-nums text-slate-500 sm:text-[11px]">
              {summaryLine}
            </span>
          }
        />
        <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="space-y-2.5 px-3 pb-3 pt-1 sm:px-4">
        <p className="text-[11px] font-medium leading-snug text-slate-500">
          No cuenta para el objetivo del mes, racha ni niveles.
        </p>

        {summary.count > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
            <span className="text-emerald-700">{summary.gainCount} en ganancia</span>
            <span className="text-red-700">{summary.lossCount} en pérdida</span>
            {summary.noPriceCount > 0 ? (
              <span className="text-amber-700">{summary.noPriceCount} sin precio</span>
            ) : null}
          </div>
        ) : null}

        {mode === 'list' ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setMode('add');
              }}
              className="finance-secondary-button inline-flex min-h-[36px] items-center gap-1.5 px-2.5 text-[11px] font-bold"
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden />
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setMode('csv')}
              className="finance-secondary-button inline-flex min-h-[36px] items-center gap-1.5 px-2.5 text-[11px] font-bold"
            >
              <Upload size={14} strokeWidth={2.25} aria-hidden />
              Importar
            </button>
          </div>
        ) : null}

        {mode === 'add' || mode === 'edit' ? (
          <FinancePortfolioForm
            initial={editing}
            onCancel={() => {
              setMode('list');
              setEditing(null);
            }}
            onSave={(holding) => {
              if (editing) {
                onChange(holdings.map((h) => (h.id === holding.id ? holding : h)));
                sileo.success({ title: 'Posición editada', description: holding.ticker });
              } else {
                onChange([...holdings, holding]);
                sileo.success({ title: 'Posición agregada', description: holding.ticker });
              }
              setMode('list');
              setEditing(null);
            }}
          />
        ) : null}

        {mode === 'csv' ? (
          <FinancePortfolioCsvImport
            existing={holdings}
            onClose={() => setMode('list')}
            onApply={(next) => {
              onChange(next);
              setMode('list');
            }}
          />
        ) : null}

        {mode === 'list' ? (
          holdings.length === 0 ? (
            <p className="text-xs font-semibold text-slate-500">
              Todavía no cargaste posiciones históricas.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="finance-label">Buscar activo</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar activo…"
                    className="finance-input-mobile mt-1 min-h-[40px] w-full rounded-xl px-3 text-sm"
                  />
                </label>
                <label>
                  <span className="finance-label">Orden</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as PortfolioViewSort)}
                    className="finance-input-mobile mt-1 min-h-[40px] rounded-xl px-2 text-xs font-semibold"
                  >
                    <option value="loss">Mayor pérdida</option>
                    <option value="gain">Mayor ganancia</option>
                    <option value="value">Mayor valor</option>
                    <option value="ticker">Ticker A–Z</option>
                    <option value="recent">Más reciente</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtros de posiciones">
                {(
                  [
                    ['all', 'Todas', summary.count],
                    ['gain', 'En ganancia', summary.gainCount],
                    ['loss', 'En pérdida', summary.lossCount],
                    ['no_price', 'Sin precio', summary.noPriceCount],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`min-h-[32px] rounded-full border px-2.5 text-[10px] font-bold transition ${
                      filter === id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                    aria-pressed={filter === id}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <ul className="space-y-1.5">
                {visible.map((v) => (
                  <HoldingRow
                    key={v.holding.id}
                    view={v}
                    onEdit={() => {
                      setEditing(v.holding);
                      setMode('edit');
                    }}
                    onRemove={() => removeHolding(v.holding)}
                  />
                ))}
              </ul>

              {filtered.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">Ninguna posición con ese filtro.</p>
              ) : null}

              {remaining > 0 ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Ver {Math.min(remaining, PAGE_SIZE) === remaining
                    ? `${remaining} posiciones más`
                    : `${PAGE_SIZE} más (${remaining} restantes)`}
                </button>
              ) : null}

              {visibleCount > PAGE_SIZE && filtered.length > PAGE_SIZE ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filtered.length)}
                    className="flex-1 min-h-[36px] text-[11px] font-bold text-blue-700"
                  >
                    Mostrar todas ({filtered.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(PAGE_SIZE)}
                    className="flex-1 min-h-[36px] text-[11px] font-bold text-slate-500"
                  >
                    Contraer
                  </button>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </div>
    </details>
  );
}
