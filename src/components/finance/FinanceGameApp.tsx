import { useCallback, useMemo, useState } from 'react';
import type { FinanceEntry, FinanceGoal, FinanceState } from '@/lib/finance/types';
import { getInitialFinanceState, loadFinanceState, saveFinanceState } from '@/lib/finance/storage';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { FinanceMissionCard } from '@/components/finance/FinanceMissionCard';
import { FinanceQuickMetrics } from '@/components/finance/FinanceQuickMetrics';
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm';
import { FinanceGoals } from '@/components/finance/FinanceGoals';
import { FinanceLevels } from '@/components/finance/FinanceLevels';
import { FinanceJsonTools } from '@/components/finance/FinanceJsonTools';
import { getEntriesByMonth, formatARS } from '@/lib/finance/calculations';
import { getMonthlyMissionView } from '@/lib/finance/levels';

const INV_TIMELINE = { icon: '📈', bar: 'bg-emerald-500' } as const;

export default function FinanceGameApp() {
  const [state, setState] = useState<FinanceState>(() =>
    typeof window !== 'undefined' ? loadFinanceState() : getInitialFinanceState(),
  );

  const persist = useCallback((updater: (prev: FinanceState) => FinanceState) => {
    setState((prev) => {
      const next = updater(prev);
      saveFinanceState(next);
      return next;
    });
  }, []);

  const replaceState = useCallback(
    (next: FinanceState) => {
      persist(() => next);
    },
    [persist],
  );

  const patchState = useCallback(
    (partial: Partial<FinanceState>) => {
      persist((prev) => ({ ...prev, ...partial }));
    },
    [persist],
  );

  const month = state.currentMonth;
  const monthEntries = useMemo(() => getEntriesByMonth(state.entries, month), [state.entries, month]);
  const mission = useMemo(() => getMonthlyMissionView(state, month), [state, month]);

  const sortedMonthInvestments = useMemo(() => {
    return [...monthEntries]
      .filter((e) => e.type === 'investment')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [monthEntries]);

  const addEntry = useCallback(
    (entry: FinanceEntry) => {
      persist((prev) => ({ ...prev, entries: [...prev.entries, entry] }));
    },
    [persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));
    },
    [persist],
  );

  const addGoal = useCallback(
    (goal: FinanceGoal) => {
      persist((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
    },
    [persist],
  );

  const updateGoal = useCallback(
    (goal: FinanceGoal) => {
      persist((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
      }));
    },
    [persist],
  );

  const removeGoal = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        '¿Borrar todas las inversiones registradas, objetivos y retos en este dispositivo? No se puede deshacer.',
      )
    ) {
      return;
    }
    persist((prev) => {
      const fresh = getInitialFinanceState();
      fresh.currentMonth = prev.currentMonth;
      return fresh;
    });
  }, [persist]);

  const hasInvestments = state.entries.some((e) => e.type === 'investment');
  const isEmpty = !hasInvestments && state.goals.length === 0;

  return (
    <div className="finance-app-shell relative isolate min-w-0 overflow-x-hidden pb-20 pt-6 sm:pb-28 sm:pt-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -20%, rgba(99, 102, 241, 0.35), transparent 50%),
            radial-gradient(ellipse 80% 50% at 100% 50%, rgba(34, 211, 238, 0.12), transparent 45%),
            radial-gradient(ellipse 60% 40% at 0% 80%, rgba(167, 139, 250, 0.15), transparent 40%),
            linear-gradient(180deg, #020617 0%, #0f172a 45%, #020617 100%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" aria-hidden />

      <div className="container-page relative z-[1] min-w-0">
        {isEmpty ? (
          <div className="mb-8 rounded-3xl border border-amber-500/30 bg-amber-950/40 p-5 shadow-lg sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/90">Arranque</p>
            <p className="mt-2 text-base font-bold text-white">
              No estás ahorrando por miedo. Estás comprando opciones.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-100/85">
              Cargá la primera inversión del mes: datos en tu navegador. Exportá JSON si cambiás de equipo.
            </p>
          </div>
        ) : null}

        {/* A — Hero full width */}
        <FinanceDashboard state={state} onMonthChange={(m) => patchState({ currentMonth: m })} />

        <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-8">
            {/* B — Misión */}
            <FinanceMissionCard mission={mission} />

            {/* C — Métricas */}
            <FinanceQuickMetrics state={state} month={month} />

            {/* D — Formulario */}
            <section id="inversion" className="scroll-mt-28">
              <FinanceEntryForm month={month} onAddEntry={addEntry} />
            </section>

            {/* E — Timeline inversiones del mes */}
            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 shadow-xl backdrop-blur-md sm:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300/90">Timeline</p>
                  <h3 className="text-lg font-black text-white">Inversiones del mes</h3>
                </div>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                  {month}
                </span>
              </div>

              {sortedMonthInvestments.length === 0 ? (
                <p className="text-sm font-medium text-slate-400">
                  La plata sin dirección se va sola. Sumá la primera inversión de {month}.
                </p>
              ) : (
                <ul className="flex flex-col gap-0">
                  {sortedMonthInvestments.map((e) => {
                    const t = INV_TIMELINE;
                    return (
                      <li key={e.id} className="flex gap-3 border-b border-white/5 py-3 last:border-0">
                        <span className={`mt-1 w-1 shrink-0 rounded-full ${t.bar}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">
                            <span className="mr-1.5" aria-hidden>
                              {t.icon}
                            </span>
                            Inversión
                            {e.category ? (
                              <span className="font-medium text-slate-400"> · {e.category}</span>
                            ) : null}
                            {e.asset ? (
                              <span className="font-medium text-slate-500"> · {e.asset}</span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-lg font-black tabular-nums text-white">{formatARS(e.amount)}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {e.platform ? `${e.platform} · ` : ''}
                            {new Date(e.createdAt).toLocaleString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {e.note ? <p className="mt-1 text-xs text-slate-400">{e.note}</p> : null}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 self-start rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-300"
                          onClick={() => removeEntry(e.id)}
                        >
                          Borrar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-8 xl:sticky xl:top-24">
            <FinanceLevels
              state={state}
              month={month}
              onWealthTargetChange={(n) =>
                patchState({
                  wealthTarget: n === undefined || n === null || Number.isNaN(n) ? undefined : n,
                })
              }
            />
            <FinanceGoals goals={state.goals} onAdd={addGoal} onUpdate={updateGoal} onRemove={removeGoal} />
            <FinanceJsonTools state={state} onImport={replaceState} />
            <div className="rounded-2xl border border-red-500/25 bg-red-950/30 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-300/90">Zona peligrosa</p>
              <p className="mt-2 text-xs font-medium text-red-100/80">
                Borrá todo en este dispositivo. Exportá JSON antes.
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-red-500/40 bg-red-600/20 py-3 text-sm font-bold text-red-100 transition hover:bg-red-600/30"
                onClick={clearAll}
              >
                Borrar todo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
