import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock, RefreshCcw, Target } from 'lucide-react';
import { sileo } from 'sileo';
import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import { formatARS } from '@/lib/finance/calculations';
import type { FinancePricesMap } from '@/lib/finance/financePrices';
import {
  fetchFinancePrices,
  formatFinancePrice,
} from '@/lib/finance/financePrices';
import type { MonthlyPlanProgressItem } from '@/lib/finance/monthlyInvestmentPlan';
import {
  createMonthlyInvestmentPlanItems,
  getMonthlyPlanAnchorDef,
  getMonthlyPlanProgress,
  getMonthlyPlanUserItems,
  getPlanTickersForPricing,
  normalizePlanLabel,
  parseInvestmentPlanInput,
  planItemLabelLooksLikeMergedTickers,
} from '@/lib/finance/monthlyInvestmentPlan';
import { getCryptoLogoFallbackUrl } from '@/lib/finance/tickerPricing';

type Props = {
  month: string;
  entries: FinanceEntry[];
  plan: MonthlyInvestmentPlanItem[] | undefined;
  onAddItems: (rawInput: string) => void;
  onRemoveItem: (id: string) => void;
  onSplitMergedItem?: (itemId: string, rawLabel: string) => void;
  onCopyFromPreviousMonth?: () => void;
  hasPreviousMonthPlan?: boolean;
};

function tickerInitial(ticker: string): string {
  const clean = ticker.trim().toUpperCase();
  if (clean.length <= 2) return clean;
  return clean.charAt(0);
}

function tickerLogoUrl(ticker: string, prices: FinancePricesMap): string | undefined {
  const label = normalizePlanLabel(ticker);
  const base = label.split(' ')[0] ?? label;
  return prices[label]?.logoUrl ?? prices[base]?.logoUrl ?? getCryptoLogoFallbackUrl(base);
}

function TickerAvatar({
  ticker,
  logoUrl,
  completed,
}: {
  ticker: string;
  logoUrl?: string;
  completed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initial = tickerInitial(ticker) || '?';

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  const checkBadge = completed ? (
    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
      <Check size={10} strokeWidth={3} aria-hidden />
    </span>
  ) : null;

  if (logoUrl && !failed) {
    return (
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <img
          src={logoUrl}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
          className="h-6 w-6 rounded-full object-contain"
          onError={() => setFailed(true)}
        />
        {checkBadge}
      </span>
    );
  }

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-700 shadow-sm">
      {initial}
      {checkBadge}
    </span>
  );
}

function PlanChip({
  progressItem,
  prices,
  pricesLoading,
  onRemove,
  onSplit,
  compact,
}: {
  progressItem: MonthlyPlanProgressItem;
  prices: FinancePricesMap;
  pricesLoading: boolean;
  onRemove: () => void;
  onSplit?: () => void;
  compact?: boolean;
}) {
  const {
    item,
    completed,
    historicallyCompleted,
    hasReferencePrice,
    referencePrice,
    referenceCurrency,
  } = progressItem;
  const pendingWithHistory = !completed && historicallyCompleted;

  const shellClass = completed
    ? 'border-emerald-200 bg-emerald-50/80'
    : pendingWithHistory
      ? 'border-sky-200 bg-sky-50/80'
      : 'border-amber-200 bg-amber-50/80';

  let priceLine = 'Sin precio';
  if (pricesLoading && !hasReferencePrice) {
    priceLine = '…';
  } else if (hasReferencePrice) {
    priceLine = formatFinancePrice(referencePrice, referenceCurrency);
  }

  const logoUrl = tickerLogoUrl(item.label, prices);
  const anchor = getMonthlyPlanAnchorDef(item);

  if (compact) {
    return (
      <article
        className={`group relative flex min-h-[52px] items-center gap-2 rounded-xl border px-2.5 py-2 transition hover:shadow-sm motion-reduce:transition-none ${shellClass} ${
          anchor ? 'border-violet-200 bg-violet-50/80' : ''
        }`}
      >
        <TickerAvatar ticker={item.label} logoUrl={logoUrl} completed={completed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-black tracking-wide text-slate-900">
              {item.label}
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-slate-800">{priceLine}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-500">
              {completed ? 'Cubierto' : 'Pendiente'}
            </span>
            {anchor ? (
              <span className="rounded-md border border-violet-200 bg-violet-100 px-1 py-px text-[8px] font-black uppercase tracking-[0.1em] text-violet-700">
                {anchor.badge}
              </span>
            ) : null}
            {pendingWithHistory ? (
              <span className="rounded-md border border-sky-200 bg-sky-100 px-1 py-px text-[8px] font-black uppercase tracking-[0.1em] text-sky-700">
                Antes
              </span>
            ) : null}
          </div>
        </div>
        {!anchor ? (
          <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {onSplit ? (
              <button
                type="button"
                onClick={onSplit}
                className="rounded-md px-1.5 py-0.5 text-[9px] font-bold text-blue-600"
              >
                Separar
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md px-1.5 py-0.5 text-[9px] font-bold text-slate-400 hover:text-red-600"
            >
              Quitar
            </button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={`group flex min-h-0 w-full min-w-0 flex-col rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:hover:shadow-none ${shellClass} ${
        anchor ? 'border-violet-200 bg-violet-50/80' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <TickerAvatar ticker={item.label} logoUrl={logoUrl} completed={completed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-base font-black tracking-wide text-slate-900">{item.label}</span>
            {completed ? (
              <Check size={16} strokeWidth={2.5} className="shrink-0 text-emerald-600" aria-hidden />
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {anchor ? (
              <span className="rounded-md border border-violet-200 bg-violet-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-violet-700">
                {anchor.badge}
              </span>
            ) : null}
            {pendingWithHistory ? (
              <span className="rounded-md border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-sky-700">
                Antes
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm font-black tabular-nums text-slate-800">{priceLine}</p>

          {anchor?.hint ? (
            <p className="mt-0.5 text-[10px] font-semibold leading-tight text-violet-600">{anchor.hint}</p>
          ) : null}
        </div>
      </div>

      {!anchor ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 border-t border-slate-200/60 pt-2">
          {onSplit ? (
            <button
              type="button"
              onClick={onSplit}
              className="min-h-[28px] text-[10px] font-bold text-blue-600 opacity-80 hover:opacity-100"
            >
              Separar
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="min-h-[28px] text-[10px] font-bold text-slate-400 sm:opacity-0 sm:transition sm:group-hover:opacity-100 hover:text-red-600 focus-visible:opacity-100"
          >
            Quitar
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ChipGrid({
  variant,
  items,
  prices,
  pricesLoading,
  onRemoveItem,
  onSplitMergedItem,
}: {
  variant: 'pending' | 'completed';
  items: MonthlyPlanProgressItem[];
  prices: FinancePricesMap;
  pricesLoading: boolean;
  onRemoveItem: (id: string) => void;
  onSplitMergedItem?: (id: string, label: string) => void;
}) {
  if (items.length === 0) return null;

  const isPending = variant === 'pending';

  const grid = (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((progressItem) => (
        <PlanChip
          key={progressItem.item.id}
          progressItem={progressItem}
          prices={prices}
          pricesLoading={pricesLoading}
          compact
          onRemove={() => onRemoveItem(progressItem.item.id)}
          onSplit={
            planItemLabelLooksLikeMergedTickers(progressItem.item.label) && onSplitMergedItem
              ? () => onSplitMergedItem(progressItem.item.id, progressItem.item.label)
              : undefined
          }
        />
      ))}
    </div>
  );

  if (!isPending) {
    return (
      <details className="group/completed rounded-xl border border-emerald-200/80 bg-emerald-50/40 open:bg-emerald-50/70">
        <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-emerald-800 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} strokeWidth={2.5} aria-hidden />
            {items.length === 1
              ? '1 activo cubierto este mes'
              : `${items.length} activos cubiertos este mes`}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 group-open/completed:hidden">
            Ver detalle
          </span>
          <span className="hidden text-[11px] font-semibold text-emerald-700 group-open/completed:inline">
            Ocultar
          </span>
        </summary>
        <div className="border-t border-emerald-200/60 px-2.5 py-2.5">{grid}</div>
      </details>
    );
  }

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
        <Clock size={14} strokeWidth={2.25} aria-hidden />
        Pendientes
      </p>
      {grid}
    </div>
  );
}

function ReferenceSummary({
  progress,
  allComplete,
  pricesLoading,
  pricesError,
  onRefresh,
}: {
  progress: ReturnType<typeof getMonthlyPlanProgress>;
  allComplete: boolean;
  pricesLoading: boolean;
  pricesError: string | null;
  onRefresh: () => void;
}) {
  const missingPriceCount = progress.itemsWithoutReferencePrice.length;

  if (pricesLoading && progress.pendingReferenceTotal === 0 && missingPriceCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
        <p className="text-xs font-semibold text-blue-700">Actualizando precios…</p>
      </div>
    );
  }

  if (pricesError && progress.pendingReferenceTotal === 0 && missingPriceCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-xs font-semibold text-red-600">No se pudieron leer precios</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-1 text-[11px] font-bold text-red-600 underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (allComplete && progress.totalCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
          Plan cubierto este mes
        </p>
        {progress.completedReferenceTotal > 0 ? (
          <p className="text-lg font-black tabular-nums text-emerald-700">
            {formatARS(progress.completedReferenceTotal)}
          </p>
        ) : null}
      </div>
    );
  }

  if (progress.pendingReferenceTotal > 0) {
    return (
      <div className="mt-2.5 flex items-end justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">
            Pendiente estimado
          </p>
          <p className="text-xl font-black tabular-nums leading-tight text-amber-700">
            {formatARS(progress.pendingReferenceTotal)}
          </p>
          {missingPriceCount > 0 ? (
            <p className="mt-0.5 text-[10px] font-semibold text-blue-600">
              Sin precio en {missingPriceCount} activo{missingPriceCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-600">
          {progress.completedCount}/{progress.totalCount}
        </span>
      </div>
    );
  }

  if (missingPriceCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
          {pricesLoading ? 'Actualizando precios…' : 'Precios no disponibles'}
        </p>
        {!pricesLoading && pricesError ? (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-1 text-[11px] font-bold text-blue-600 underline underline-offset-2"
          >
            Reintentar
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

export function FinanceMonthlyInvestmentPlan({
  month,
  entries,
  plan,
  onAddItems,
  onRemoveItem,
  onSplitMergedItem,
  onCopyFromPreviousMonth,
  hasPreviousMonthPlan,
}: Props) {
  const [rawInput, setRawInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [prices, setPrices] = useState<FinancePricesMap>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const tickersToFetch = useMemo(
    () => getPlanTickersForPricing(plan, month),
    [plan, month],
  );
  const tickersKey = tickersToFetch.join(',');

  const loadPrices = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) {
      setPrices({});
      setPricesError(null);
      return;
    }
    setPricesLoading(true);
    setPricesError(null);
    const result = await fetchFinancePrices(tickers);
    setPricesLoading(false);
    setPrices(result.prices);
    if (import.meta.env.DEV) {
      for (const [ticker, row] of Object.entries(result.prices)) {
        console.info('[finance-prices] logo found', ticker, Boolean(row.logoUrl));
      }
    }
    if (!result.ok) {
      setPricesError(
        typeof result.error === 'string' ? result.error : 'No se pudieron actualizar precios',
      );
    } else {
      setPricesError(null);
    }
  }, []);

  useEffect(() => {
    if (tickersToFetch.length === 0) return;
    void loadPrices(tickersToFetch);
  }, [tickersKey, loadPrices, tickersToFetch]);

  const progress = useMemo(
    () => getMonthlyPlanProgress({ plan, entries, month, prices }),
    [plan, entries, month, prices],
  );

  const hasPlan = progress.totalCount > 0;
  const hasUserPlanItems = useMemo(() => getMonthlyPlanUserItems(plan, month).length > 0, [plan, month]);
  const allComplete = hasPlan && progress.completedCount === progress.totalCount;
  const shouldShowInput = !hasUserPlanItems || showAddForm;

  useEffect(() => {
    setShowAddForm(false);
    setRawInput('');
    setAddError(null);
  }, [month]);

  const pendingItems = useMemo(
    () => progress.items.filter((p) => !p.completed),
    [progress.items],
  );
  const completedThisMonth = useMemo(
    () => progress.items.filter((p) => p.completed),
    [progress.items],
  );

  const previewLabels = useMemo(() => {
    if (!rawInput.trim()) return [];
    return parseInvestmentPlanInput(rawInput);
  }, [rawInput]);

  const handleAdd = () => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setAddError('Pegá al menos un ticker o activo.');
      return;
    }
    const parsed = parseInvestmentPlanInput(trimmed);
    if (parsed.length === 0) {
      setAddError('No se detectaron tickers válidos.');
      return;
    }
    const newItems = createMonthlyInvestmentPlanItems({
      month,
      rawInput: trimmed,
      existingItems: plan,
    });
    if (newItems.length === 0) {
      setAddError('Esos tickers ya están en el plan de este mes.');
      return;
    }
    onAddItems(trimmed);
    setRawInput('');
    setAddError(null);
    setShowAddForm(false);
    sileo.success({
      title: newItems.length === 1 ? `Se agregó ${newItems[0].label}` : `Se agregaron ${newItems.length} tickers`,
      description: 'Plan del mes actualizado.',
    });
  };

  const hasMergedItem = progress.items.some((p) => planItemLabelLooksLikeMergedTickers(p.item.label));

  return (
    <section
      className={`finance-card-compact p-3 sm:p-3.5 ${
        allComplete ? 'border-emerald-200 bg-emerald-50/30' : ''
      }`}
      aria-labelledby="monthly-plan-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            id="monthly-plan-heading"
            className="finance-section-title flex items-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
              <Target size={16} strokeWidth={2.25} aria-hidden />
            </span>
            Plan del mes
          </h3>
          <p className="finance-section-sub mt-1 pl-10">Activos a cubrir</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasPlan ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black tabular-nums text-slate-700">
              {progress.completedCount}/{progress.totalCount}
            </span>
          ) : null}
          {hasPlan && tickersToFetch.length > 0 ? (
            <button
              type="button"
              disabled={pricesLoading}
              onClick={() => void loadPrices(tickersToFetch)}
              className="finance-secondary-button finance-touch-target inline-flex min-h-[32px] items-center gap-1.5 px-2.5 text-[10px] font-bold disabled:opacity-50"
            >
              <RefreshCcw
                size={14}
                strokeWidth={2.25}
                className={pricesLoading ? 'motion-safe:animate-spin' : ''}
                aria-hidden
              />
              {pricesLoading ? 'Actualizando…' : 'Actualizar precios'}
            </button>
          ) : null}
        </div>
      </div>

      {hasPlan ? (
        <div className="mt-2.5">
          <div
            className="h-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(progress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del plan de foco este mes"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allComplete ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {hasPlan && tickersToFetch.length > 0 && pricesError ? (
        <p className="mt-1.5 text-[10px] font-semibold text-red-600">{pricesError}</p>
      ) : null}

      {hasPlan ? (
        <ReferenceSummary
          progress={progress}
          allComplete={allComplete}
          pricesLoading={pricesLoading}
          pricesError={pricesError}
          onRefresh={() => void loadPrices(tickersToFetch)}
        />
      ) : null}

      {!hasUserPlanItems && hasPreviousMonthPlan && onCopyFromPreviousMonth ? (
        <button
          type="button"
          onClick={onCopyFromPreviousMonth}
          className="finance-secondary-button finance-touch-target mt-3 flex min-h-[44px] w-full items-center justify-center px-4 text-xs font-black"
        >
          Copiar plan del mes anterior
        </button>
      ) : null}

      {hasUserPlanItems && !showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="finance-secondary-button finance-touch-target mt-3 flex min-h-[40px] w-full items-center justify-center px-3 text-xs font-bold"
        >
          Agregar tickers
        </button>
      ) : null}

      {shouldShowInput ? (
        <div className="mt-3">
          {hasUserPlanItems && showAddForm ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">Nuevos tickers</p>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setRawInput('');
                  setAddError(null);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          ) : null}
          <label htmlFor="monthly-plan-input" className="sr-only">
            Lista de tickers o activos
          </label>
          <textarea
            id="monthly-plan-input"
            rows={hasUserPlanItems ? 2 : 3}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="Pegá tickers o activos: GOOGL, MU, NVDA, AVGO, TSLA, TSM"
            className="finance-input-mobile w-full resize-y rounded-2xl px-3 py-2.5 text-sm leading-relaxed"
          />
          {previewLabels.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewLabels.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] font-semibold text-slate-500">Separados por coma o espacio.</p>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="finance-primary-button finance-touch-target mt-2.5 flex w-full items-center justify-center px-4 text-sm active:scale-[0.99]"
          >
            Agregar al plan
          </button>
        </div>
      ) : null}

      {addError ? (
        <p className="mt-2 text-[11px] font-semibold text-red-600" role="alert">
          {addError}
        </p>
      ) : null}

      {hasMergedItem ? (
        <p className="mt-2 text-[10px] font-semibold text-blue-600">
          Hay un ítem con varios tickers juntos. Usá «Separar» para dividirlo.
        </p>
      ) : null}

      {hasPlan ? (
        <div className="mt-3 space-y-3" aria-live="polite">
          <ChipGrid
            variant="pending"
            items={pendingItems}
            prices={prices}
            pricesLoading={pricesLoading}
            onRemoveItem={onRemoveItem}
            onSplitMergedItem={onSplitMergedItem}
          />
          <ChipGrid
            variant="completed"
            items={completedThisMonth}
            prices={prices}
            pricesLoading={pricesLoading}
            onRemoveItem={onRemoveItem}
            onSplitMergedItem={onSplitMergedItem}
          />
        </div>
      ) : null}
    </section>
  );
}
