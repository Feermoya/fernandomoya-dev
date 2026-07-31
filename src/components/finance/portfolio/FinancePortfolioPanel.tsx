import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CircleAlert,
  Minus,
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
import { FinanceDetailsSummary } from '@/components/finance/FinanceDetailsSummary';
import { FinancePortfolioCsvImport } from '@/components/finance/portfolio/FinancePortfolioCsvImport';
import { FinancePortfolioForm } from '@/components/finance/portfolio/FinancePortfolioForm';

type Props = {
  holdings: FinancePortfolioHolding[];
  onChange: (next: FinancePortfolioHolding[]) => void;
};

function formatMoney(value: number, currency: string): string {
  if (currency === 'ARS') return formatARS(value);
  return formatFinancePrice(value, currency);
}

function HoldingRow({
  holding,
  price,
  onEdit,
  onRemove,
}: {
  holding: FinancePortfolioHolding;
  price?: { price: number; currency?: string; error?: string };
  onEdit: () => void;
  onRemove: () => void;
}) {
  const current = price && price.price > 0 ? price.price : null;
  const sameFx =
    current != null &&
    price?.currency &&
    price.currency.toUpperCase() === holding.currency.toUpperCase();
  const marketValue = sameFx && current != null ? current * holding.quantity : null;
  const deltaPct =
    sameFx && current != null
      ? ((current - holding.averagePurchasePrice) / holding.averagePurchasePrice) * 100
      : null;

  let DeltaIcon = Minus;
  let deltaClass = 'text-slate-500';
  let deltaText = 'Sin comparación';
  if (!price || price.error || !(price.price > 0)) {
    DeltaIcon = CircleAlert;
    deltaClass = 'text-amber-700';
    deltaText = 'Falta precio';
  } else if (deltaPct != null) {
    if (deltaPct > 0.05) {
      DeltaIcon = TrendingUp;
      deltaClass = 'text-emerald-700';
      deltaText = `▲ +${deltaPct.toFixed(1)}%`;
    } else if (deltaPct < -0.05) {
      DeltaIcon = TrendingDown;
      deltaClass = 'text-red-700';
      deltaText = `▼ ${deltaPct.toFixed(1)}%`;
    } else {
      deltaText = '→ Sin cambios';
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {holding.ticker}
            {holding.displayName ? (
              <span className="font-semibold text-slate-500"> · {holding.displayName}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
            {holding.quantity.toLocaleString('es-AR')} u. @{' '}
            {formatMoney(holding.averagePurchasePrice, holding.currency)} {holding.currency}
            {holding.broker ? ` · ${holding.broker}` : ''}
          </p>
          <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${deltaClass}`}>
            <DeltaIcon size={12} strokeWidth={2.5} aria-hidden />
            {deltaText}
            {marketValue != null ? ` · valor ${formatMoney(marketValue, holding.currency)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            className="finance-touch-target rounded-lg p-1.5 text-slate-500 hover:text-blue-700"
            aria-label={`Editar ${holding.ticker}`}
          >
            <Pencil size={14} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="finance-touch-target rounded-lg p-1.5 text-slate-500 hover:text-red-600"
            aria-label={`Eliminar ${holding.ticker}`}
          >
            <Trash2 size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </li>
  );
}

export function FinancePortfolioPanel({ holdings, onChange }: Props) {
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'csv'>('list');
  const [editing, setEditing] = useState<FinancePortfolioHolding | null>(null);
  const [prices, setPrices] = useState<FinancePricesMap>({});

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

  const lastUpdated = useMemo(() => {
    if (holdings.length === 0) return null;
    return holdings.reduce((max, h) => (h.updatedAt > max ? h.updatedAt : max), holdings[0].updatedAt);
  }, [holdings]);

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString('es-AR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <details className="finance-details group open:pb-1">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <FinanceDetailsSummary
          icon={Briefcase}
          label="Posiciones"
          trailing={
            <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-500">
              {holdings.length}
            </span>
          }
        />
        <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="space-y-3 px-3 pb-3 pt-1 sm:px-4">
        <p className="text-[11px] font-medium leading-snug text-slate-500">
          Cartera inicial o histórica. No cuenta para el objetivo del mes, racha ni niveles.
          {lastUpdatedLabel ? ` · Actualizado ${lastUpdatedLabel}` : ''}
        </p>

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
              Importar CSV
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
            <ul className="space-y-2">
              {holdings.map((h) => (
                <HoldingRow
                  key={h.id}
                  holding={h}
                  price={prices[h.ticker]}
                  onEdit={() => {
                    setEditing(h);
                    setMode('edit');
                  }}
                  onRemove={() => {
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm(`¿Eliminar ${h.ticker} de la cartera inicial?`)
                    ) {
                      return;
                    }
                    onChange(holdings.filter((x) => x.id !== h.id));
                    sileo.info({ title: 'Posición eliminada', description: h.ticker });
                  }}
                />
              ))}
            </ul>
          )
        ) : null}
      </div>
    </details>
  );
}
