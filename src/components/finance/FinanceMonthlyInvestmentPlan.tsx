import { useMemo, useState } from 'react';
import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import {
  createMonthlyInvestmentPlanItem,
  formatPlanMissingMessage,
  getMonthlyPlanProgress,
  normalizePlanLabel,
} from '@/lib/finance/monthlyInvestmentPlan';

type Props = {
  month: string;
  entries: FinanceEntry[];
  plan: MonthlyInvestmentPlanItem[] | undefined;
  onAddItem: (item: MonthlyInvestmentPlanItem) => void;
  onRemoveItem: (id: string) => void;
};

export function FinanceMonthlyInvestmentPlan({ month, entries, plan, onAddItem, onRemoveItem }: Props) {
  const [labelInput, setLabelInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const progress = useMemo(
    () => getMonthlyPlanProgress({ plan, entries, month }),
    [plan, entries, month],
  );

  const monthItems = progress.items;
  const hasPlan = progress.totalCount > 0;
  const allComplete = hasPlan && progress.completedCount === progress.totalCount;
  const noneComplete = hasPlan && progress.completedCount === 0;
  const missingMessage = formatPlanMissingMessage(progress.missingLabels);

  const existingLabels = useMemo(
    () => new Set(monthItems.map((p) => normalizePlanLabel(p.item.label))),
    [monthItems],
  );

  const handleAdd = () => {
    const trimmed = labelInput.trim();
    if (!trimmed) {
      setAddError('Escribí un ticker o nombre.');
      return;
    }
    const norm = normalizePlanLabel(trimmed);
    if (existingLabels.has(norm)) {
      setAddError('Ya está en el plan de este mes.');
      return;
    }
    onAddItem(createMonthlyInvestmentPlanItem({ month, label: trimmed }));
    setLabelInput('');
    setAddError(null);
  };

  return (
    <section
      className={`rounded-2xl border p-3.5 shadow-lg backdrop-blur-md sm:p-4 ${
        allComplete
          ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-950/50 via-slate-950/40 to-slate-950/60'
          : 'border-white/10 bg-slate-950/40'
      }`}
      aria-labelledby="monthly-plan-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="monthly-plan-heading" className="text-sm font-black tracking-tight text-white sm:text-base">
            Plan mensual
          </h3>
          {!hasPlan ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Anotá qué querés comprar este mes para no improvisar.
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{month}</p>
          )}
        </div>
        {hasPlan ? (
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {progress.completedCount} de {progress.totalCount} cumplidos
          </p>
        ) : null}
      </div>

      {hasPlan ? (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-black/35"
            role="progressbar"
            aria-valuenow={Math.round(progress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del plan mensual"
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

      {allComplete ? (
        <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
          Plan del mes completo
        </p>
      ) : null}

      {!allComplete && noneComplete && hasPlan ? (
        <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-950/35 px-3 py-2 text-xs font-semibold text-amber-100/90">
          Todavía no cumpliste ningún activo del plan.
        </p>
      ) : null}

      {!allComplete && missingMessage && progress.completedCount > 0 ? (
        <p
          className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-100"
          aria-live="polite"
        >
          {missingMessage}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="monthly-plan-label">
          Activo o idea de compra
        </label>
        <input
          id="monthly-plan-label"
          type="text"
          value={labelInput}
          onChange={(e) => {
            setLabelInput(e.target.value);
            if (addError) setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Ej. MELI, TSLA, BTC, CEDEARs"
          className="finance-input-mobile min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="finance-touch-target shrink-0 rounded-xl border border-indigo-400/35 bg-indigo-500/20 px-4 text-xs font-black text-indigo-100 transition hover:bg-indigo-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Agregar
        </button>
      </div>
      {addError ? (
        <p className="mt-1.5 text-[11px] font-semibold text-rose-300/90" role="alert">
          {addError}
        </p>
      ) : null}

      {monthItems.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {monthItems.map(({ item, completed }) => (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                completed
                  ? 'border-emerald-500/35 bg-emerald-950/35'
                  : 'border-amber-500/25 bg-amber-950/20'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    completed
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'border border-amber-400/40 text-amber-300/80'
                  }`}
                  aria-hidden
                >
                  {completed ? '✓' : '·'}
                </span>
                <span className="truncate text-sm font-bold text-white">{item.label}</span>
                <span
                  className={`shrink-0 text-[10px] font-black uppercase tracking-wide ${
                    completed ? 'text-emerald-300/90' : 'text-amber-200/80'
                  }`}
                >
                  {completed ? 'Listo' : 'Pendiente'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="finance-touch-target shrink-0 rounded-lg border border-transparent px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
