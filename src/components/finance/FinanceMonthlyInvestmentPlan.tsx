import { useCallback, useEffect, useMemo, useState } from 'react';
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

function tickerLogoUrl(ticker: string, prices: FinancePricesMap): string | undefined {
  const label = normalizePlanLabel(ticker);
  const base = label.split(' ')[0] ?? label;
  return prices[label]?.logoUrl ?? prices[base]?.logoUrl ?? getCryptoLogoFallbackUrl(base);
}

function TickerAvatar({ ticker, logoUrl }: { ticker: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (ticker.trim().charAt(0) || '?').toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        className="h-6 w-6 shrink-0 rounded-full border border-white/10 bg-black/30 object-contain p-0.5"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/35 text-[10px] font-black text-slate-200"
      aria-hidden
    >
      {initial}
    </span>
  );
}

function PlanChip({
  progressItem,
  prices,
  pricesLoading,
  onRemove,
  onSplit,
}: {
  progressItem: MonthlyPlanProgressItem;
  prices: FinancePricesMap;
  pricesLoading: boolean;
  onRemove: () => void;
  onSplit?: () => void;
}) {
  const {
    item,
    completed,
    historicallyCompleted,
    hasReferencePrice,
    referencePrice,
    referenceCurrency,
  } = progressItem;
  const pendingOnly = !completed && !historicallyCompleted;
  const pendingWithHistory = !completed && historicallyCompleted;

  const shellClass = completed
    ? 'border-emerald-500/30 bg-emerald-950/25'
    : pendingWithHistory
      ? 'border-cyan-500/25 bg-cyan-950/20'
      : 'border-amber-400/35 bg-amber-950/30';

  const statusLabel = completed
    ? 'Comprado este mes'
    : pendingWithHistory
      ? 'Ya comprado antes'
      : 'Pendiente';

  const statusClass = completed
    ? 'text-emerald-300/85'
    : pendingWithHistory
      ? 'text-cyan-300/80'
      : 'text-amber-200/85';

  const checkMark = completed ? '✓' : pendingWithHistory ? '✓' : null;

  let priceLine = 'Sin precio';
  if (pricesLoading && !hasReferencePrice) {
    priceLine = '…';
  } else if (hasReferencePrice) {
    priceLine = formatFinancePrice(referencePrice, referenceCurrency);
  }

  const logoUrl = tickerLogoUrl(item.label, prices);
  const anchor = getMonthlyPlanAnchorDef(item);

  return (
    <article
      className={`flex min-h-0 w-full min-w-0 flex-col gap-0.5 rounded-xl border p-2.5 ${shellClass} ${
        completed ? 'opacity-90' : ''
      } ${anchor ? 'border-violet-400/25 bg-violet-950/15' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <TickerAvatar ticker={item.label} logoUrl={logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span
              className={`min-w-0 truncate text-sm font-black leading-tight ${
                pendingOnly ? 'text-white' : 'text-slate-100'
              }`}
            >
              {item.label}
            </span>
            {anchor ? (
              <span className="shrink-0 rounded-md border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-violet-200/90">
                {anchor.badge}
              </span>
            ) : null}
          </div>
          {anchor ? (
            <p className="mt-0.5 text-[9px] font-semibold leading-tight text-violet-300/75">{anchor.hint}</p>
          ) : null}
        </div>
        {checkMark ? (
          <span
            className={`ml-auto shrink-0 text-[10px] font-black ${completed ? 'text-emerald-400' : 'text-cyan-400/70'}`}
            aria-hidden
          >
            {checkMark}
          </span>
        ) : null}
      </div>

      <p className={`text-[9px] font-black uppercase tracking-[0.14em] leading-none ${statusClass}`}>
        {statusLabel}
      </p>

      <p className="text-xs font-bold tabular-nums leading-tight text-slate-200">{priceLine}</p>

      {!anchor ? (
        <div className="mt-0.5 flex flex-wrap gap-x-2">
          {onSplit ? (
            <button
              type="button"
              onClick={onSplit}
              className="min-h-[28px] text-[10px] font-bold text-indigo-300/90"
            >
              Separar
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="min-h-[28px] text-[10px] font-bold text-slate-500 hover:text-rose-300"
          >
            Quitar
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ChipGrid({
  title,
  titleClass,
  items,
  prices,
  pricesLoading,
  onRemoveItem,
  onSplitMergedItem,
}: {
  title: string;
  titleClass: string;
  items: MonthlyPlanProgressItem[];
  prices: FinancePricesMap;
  pricesLoading: boolean;
  onRemoveItem: (id: string) => void;
  onSplitMergedItem?: (id: string, label: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${titleClass}`}>{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((progressItem) => (
          <PlanChip
            key={progressItem.item.id}
            progressItem={progressItem}
            prices={prices}
            pricesLoading={pricesLoading}
            onRemove={() => onRemoveItem(progressItem.item.id)}
            onSplit={
              planItemLabelLooksLikeMergedTickers(progressItem.item.label) && onSplitMergedItem
                ? () => onSplitMergedItem(progressItem.item.id, progressItem.item.label)
                : undefined
            }
          />
        ))}
      </div>
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
      <div className="mt-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/15 px-3 py-2">
        <p className="text-xs font-semibold text-indigo-200/90">Actualizando precios…</p>
      </div>
    );
  }

  if (pricesError && progress.pendingReferenceTotal === 0 && missingPriceCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-rose-500/25 bg-rose-950/20 px-3 py-2">
        <p className="text-xs font-semibold text-rose-200/90">No se pudieron leer precios</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-1 text-[11px] font-bold text-rose-100 underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (allComplete && progress.totalCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/80">
          Plan cubierto este mes
        </p>
        {progress.completedReferenceTotal > 0 ? (
          <p className="text-lg font-black tabular-nums text-emerald-100">
            {formatARS(progress.completedReferenceTotal)}
          </p>
        ) : null}
      </div>
    );
  }

  if (progress.pendingReferenceTotal > 0) {
    return (
      <div className="mt-2.5 flex items-end justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/75">
            Pendiente estimado
          </p>
          <p className="text-xl font-black tabular-nums leading-tight text-amber-50">
            {formatARS(progress.pendingReferenceTotal)}
          </p>
          {missingPriceCount > 0 ? (
            <p className="mt-0.5 text-[10px] font-semibold text-indigo-300/80">
              Sin precio en {missingPriceCount} activo{missingPriceCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-300">
          {progress.completedCount}/{progress.totalCount}
        </span>
      </div>
    );
  }

  if (missingPriceCount > 0) {
    return (
      <div className="mt-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/15 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200/80">
          {pricesLoading ? 'Actualizando precios…' : 'Precios no disponibles'}
        </p>
        {!pricesLoading && pricesError ? (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-1 text-[11px] font-bold text-indigo-200 underline underline-offset-2"
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
  const [addInfo, setAddInfo] = useState<string | null>(null);

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
      setAddInfo(null);
      return;
    }
    const parsed = parseInvestmentPlanInput(trimmed);
    if (parsed.length === 0) {
      setAddError('No se detectaron tickers válidos.');
      setAddInfo(null);
      return;
    }
    const newItems = createMonthlyInvestmentPlanItems({
      month,
      rawInput: trimmed,
      existingItems: plan,
    });
    if (newItems.length === 0) {
      setAddError('Esos tickers ya están en el plan de este mes.');
      setAddInfo(null);
      return;
    }
    onAddItems(trimmed);
    setRawInput('');
    setAddError(null);
    setAddInfo(
      newItems.length === 1
        ? `Se agregó ${newItems[0].label}.`
        : `Se agregaron ${newItems.length} tickers al plan.`,
    );
    window.setTimeout(() => setAddInfo(null), 2800);
  };

  const hasMergedItem = progress.items.some((p) => planItemLabelLooksLikeMergedTickers(p.item.label));
  const refreshLabel = pricesLoading ? 'Actualizando…' : 'Actualizar precios';

  return (
    <section
      className={`rounded-2xl border p-3.5 shadow-lg backdrop-blur-md sm:p-4 ${
        allComplete
          ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-950/45 via-slate-950/40 to-slate-950/60'
          : 'border-white/10 bg-slate-950/40'
      }`}
      aria-labelledby="monthly-plan-heading"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 id="monthly-plan-heading" className="text-base font-black tracking-tight text-white">
            Plan de foco
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">SPY fijo + tus tickers del mes</p>
        </div>
        {hasPlan && progress.pendingReferenceTotal === 0 && !allComplete ? (
          <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-black tabular-nums text-slate-200">
            {progress.completedCount}/{progress.totalCount}
          </span>
        ) : null}
      </div>

      {hasPlan ? (
        <div className="mt-2.5">
          <div
            className="h-1 overflow-hidden rounded-full bg-black/35"
            role="progressbar"
            aria-valuenow={Math.round(progress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del plan de foco este mes"
          >
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                allComplete ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-emerald-500'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {hasPlan && tickersToFetch.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pricesLoading}
            onClick={() => void loadPrices(tickersToFetch)}
            className="finance-touch-target min-h-[36px] rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-3 text-[11px] font-bold text-indigo-100 disabled:opacity-50"
          >
            {refreshLabel}
          </button>
          {pricesError ? (
            <span className="text-[10px] font-semibold text-rose-300/85">{pricesError}</span>
          ) : null}
        </div>
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
          className="finance-touch-target mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-indigo-400/35 bg-indigo-500/15 px-4 text-xs font-black text-indigo-100"
        >
          Copiar plan del mes anterior
        </button>
      ) : null}

      <div className="mt-3">
        <label htmlFor="monthly-plan-input" className="sr-only">
          Lista de tickers o activos
        </label>
        <textarea
          id="monthly-plan-input"
          rows={3}
          value={rawInput}
          onChange={(e) => {
            setRawInput(e.target.value);
            if (addError) setAddError(null);
          }}
          placeholder="Pegá tickers o activos: GOOGL, MU, NVDA, AVGO, TSLA, TSM"
          className="finance-input-mobile w-full resize-y rounded-2xl border border-white/15 bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15"
        />
        {previewLabels.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {previewLabels.map((t) => (
              <span
                key={t}
                className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black text-indigo-100"
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
          className="finance-touch-target mt-2.5 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-indigo-400/40 bg-gradient-to-r from-indigo-600/80 to-violet-600/70 px-4 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
        >
          Agregar al plan
        </button>
      </div>

      {addError ? (
        <p className="mt-2 text-[11px] font-semibold text-rose-300/90" role="alert">
          {addError}
        </p>
      ) : null}
      {addInfo ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-300/90" role="status">
          {addInfo}
        </p>
      ) : null}

      {hasMergedItem ? (
        <p className="mt-2 text-[10px] font-semibold text-indigo-300/85">
          Hay un ítem con varios tickers juntos. Usá «Separar» para dividirlo.
        </p>
      ) : null}

      {hasPlan ? (
        <div className="mt-3 space-y-3" aria-live="polite">
          <ChipGrid
            title="Pendientes"
            titleClass="text-amber-300/85"
            items={pendingItems}
            prices={prices}
            pricesLoading={pricesLoading}
            onRemoveItem={onRemoveItem}
            onSplitMergedItem={onSplitMergedItem}
          />
          <ChipGrid
            title="Comprados este mes"
            titleClass="text-emerald-400/70"
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
