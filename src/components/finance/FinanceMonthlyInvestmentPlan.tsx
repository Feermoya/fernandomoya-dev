import { useMemo, useState } from 'react';
import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import type { MonthlyPlanProgressItem } from '@/lib/finance/monthlyInvestmentPlan';
import {
  createMonthlyInvestmentPlanItems,
  getMonthlyPlanProgress,
  parseInvestmentPlanInput,
  planItemLabelLooksLikeMergedTickers,
} from '@/lib/finance/monthlyInvestmentPlan';

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

function PlanChip({
  progressItem,
  onRemove,
  onSplit,
}: {
  progressItem: MonthlyPlanProgressItem;
  onRemove: () => void;
  onSplit?: () => void;
}) {
  const { item, completed, historicallyCompleted } = progressItem;
  const pendingOnly = !completed && !historicallyCompleted;
  const pendingWithHistory = !completed && historicallyCompleted;

  const shellClass = completed
    ? 'border-emerald-500/40 bg-emerald-950/30'
    : pendingWithHistory
      ? 'border-cyan-500/35 bg-cyan-950/25'
      : 'border-amber-400/45 bg-gradient-to-br from-amber-950/55 to-slate-950/70 shadow-[0_0_20px_-10px_rgba(251,191,36,0.4)]';

  const statusLabel = completed
    ? 'Comprado este mes'
    : pendingWithHistory
      ? 'Ya comprado antes'
      : 'Pendiente';

  const statusClass = completed
    ? 'text-emerald-300/95'
    : pendingWithHistory
      ? 'text-cyan-300/90'
      : 'text-amber-200/90';

  const checkMark = completed ? '✓' : pendingWithHistory ? '✓' : null;

  return (
    <article
      className={`flex min-w-0 w-full flex-col gap-2 rounded-2xl border px-3 py-3 ${shellClass} ${
        completed ? 'opacity-95' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {checkMark ? (
          <span
            className={`shrink-0 text-sm font-black leading-none ${
              completed ? 'text-emerald-400' : 'text-cyan-400/80'
            }`}
            aria-hidden
          >
            {checkMark}
          </span>
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400/90" aria-hidden />
        )}
        <span
          className={`min-w-0 truncate text-lg font-black leading-tight tracking-tight ${
            pendingOnly ? 'text-white' : completed ? 'text-emerald-50' : 'text-slate-100'
          }`}
        >
          {item.label}
        </span>
      </div>

      <p className={`text-[9px] font-black uppercase leading-tight tracking-wider ${statusClass}`}>
        {statusLabel}
      </p>

      <div className="flex flex-wrap gap-2">
        {onSplit ? (
          <button
            type="button"
            onClick={onSplit}
            className="finance-touch-target min-h-[36px] rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-3 py-2 text-[11px] font-bold text-indigo-200"
          >
            Separar en tickers
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="finance-touch-target min-h-[36px] rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-slate-400 transition hover:border-white/15 hover:bg-white/5 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Quitar
        </button>
      </div>
    </article>
  );
}

function ChipGrid({
  title,
  titleClass,
  items,
  onRemoveItem,
  onSplitMergedItem,
}: {
  title: string;
  titleClass: string;
  items: MonthlyPlanProgressItem[];
  onRemoveItem: (id: string) => void;
  onSplitMergedItem?: (id: string, label: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.16em] ${titleClass}`}>{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((progressItem) => (
          <PlanChip
            key={progressItem.item.id}
            progressItem={progressItem}
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

  const progress = useMemo(
    () => getMonthlyPlanProgress({ plan, entries, month }),
    [plan, entries, month],
  );

  const hasPlan = progress.totalCount > 0;
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
          <p className="mt-0.5 text-xs font-semibold text-slate-400">Qué querés comprar este mes</p>
        </div>
        {hasPlan ? (
          <span
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-black tabular-nums text-slate-200"
            aria-label={`${progress.completedCount} de ${progress.totalCount} comprados este mes`}
          >
            {progress.completedCount}/{progress.totalCount}
          </span>
        ) : null}
      </div>

      {hasPlan ? (
        <div className="mt-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/35"
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

      {!hasPlan && hasPreviousMonthPlan && onCopyFromPreviousMonth ? (
        <button
          type="button"
          onClick={onCopyFromPreviousMonth}
          className="finance-touch-target mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-indigo-400/35 bg-indigo-500/15 px-4 text-xs font-black text-indigo-100 transition hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Copiar plan del mes anterior
        </button>
      ) : null}

      {!hasPlan ? (
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
          Pegá tu lista de CEDEARs, acciones o cripto para tener foco este mes.
        </p>
      ) : null}

      <div className="mt-3">
        <label htmlFor="monthly-plan-input" className="sr-only">
          Lista de tickers o activos
        </label>
        <textarea
          id="monthly-plan-input"
          rows={4}
          value={rawInput}
          onChange={(e) => {
            setRawInput(e.target.value);
            if (addError) setAddError(null);
          }}
          placeholder="Pegá tickers o activos: GOOGL, MU, NVDA, AVGO, TSLA, TSM"
          className="finance-input-mobile w-full resize-y rounded-2xl border border-white/15 bg-black/35 px-3 py-3 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15"
        />
        {previewLabels.length > 0 ? (
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-indigo-300/80">
              Se van a crear {previewLabels.length} tickers:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {previewLabels.map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-black text-indigo-100"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-[10px] font-semibold leading-snug text-slate-500">
            Podés pegar varios separados por coma, espacio o salto de línea.
          </p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="finance-touch-target mt-3 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-indigo-400/40 bg-gradient-to-r from-indigo-600/80 to-violet-600/70 px-4 text-sm font-black text-white shadow-lg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 active:scale-[0.99]"
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
          Hay un ítem con varios tickers juntos. Usá «Separar en tickers» para dividirlo.
        </p>
      ) : null}

      {hasPlan ? (
        <div className="mt-4 space-y-4" aria-live="polite">
          <ChipGrid
            title="Pendientes"
            titleClass="text-amber-300/85"
            items={pendingItems}
            onRemoveItem={onRemoveItem}
            onSplitMergedItem={onSplitMergedItem}
          />
          <ChipGrid
            title="Comprados este mes"
            titleClass="text-emerald-400/70"
            items={completedThisMonth}
            onRemoveItem={onRemoveItem}
            onSplitMergedItem={onSplitMergedItem}
          />
        </div>
      ) : null}

      <p className="mt-3 text-[10px] font-semibold text-slate-600">{month}</p>
    </section>
  );
}
