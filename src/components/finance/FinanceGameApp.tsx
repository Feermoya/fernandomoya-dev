import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FinanceEntry, FinanceGoal, FinanceState } from '@/lib/finance/types';
import {
  getInitialFinanceState,
  loadFinanceState,
  saveFinanceState,
  getFinanceSyncId,
  setFinanceLocalSavedAt,
  getFinanceLocalSavedAt,
  resetFinanceSyncIdToDefault,
  DEFAULT_FINANCE_SYNC_ID,
} from '@/lib/finance/storage';
import { fetchFinanceRemote, isFinanceCloudConfigured, upsertFinanceRemote } from '@/lib/finance/cloudSync';
import { FinanceDashboard, type FinanceDashboardCelebration } from '@/components/finance/FinanceDashboard';
import { FinanceMissionCard } from '@/components/finance/FinanceMissionCard';
import { FinanceQuickMetrics } from '@/components/finance/FinanceQuickMetrics';
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm';
import { FinanceGoals } from '@/components/finance/FinanceGoals';
import { FinanceLevels } from '@/components/finance/FinanceLevels';
import { FinanceJsonTools } from '@/components/finance/FinanceJsonTools';
import { LevelUpOverlay } from '@/components/finance/LevelUpOverlay';
import { getEntriesByMonth, formatARS, getTotalInvested, getMonthlyInvested } from '@/lib/finance/calculations';
import {
  addMonths,
  getMonthlyMissionView,
  getMonthlyLevel,
  getLevelProgressPercent,
} from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

type SyncChip = 'synced' | 'saving' | 'error' | 'solo_local';

function levelUpMessageFor(nextLevel: number): string | undefined {
  if (nextLevel === 2) return 'Ahora estás construyendo repetición, no entusiasmo.';
  return undefined;
}

function initialSyncChip(): SyncChip {
  if (typeof window === 'undefined') return 'solo_local';
  return isFinanceCloudConfigured() ? 'saving' : 'solo_local';
}

function SyncStatusChip({ status }: { status: SyncChip }) {
  const label =
    status === 'synced'
      ? 'Sincronizado'
      : status === 'saving'
        ? 'Guardando...'
        : status === 'error'
          ? 'Error al sincronizar'
          : 'Solo local';
  const cls =
    status === 'synced'
      ? 'border-emerald-500/35 bg-emerald-950/50 text-emerald-200/95'
      : status === 'error'
        ? 'border-rose-500/40 bg-rose-950/45 text-rose-200/95'
        : 'border-amber-500/35 bg-amber-950/40 text-amber-100/90';

  return (
    <span
      role="status"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function FinanceGameApp() {
  const [state, setState] = useState<FinanceState>(() =>
    typeof window !== 'undefined' ? loadFinanceState() : getInitialFinanceState(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const [syncChip, setSyncChip] = useState<SyncChip>(() => initialSyncChip());
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getFinanceLocalSavedAt() : null,
  );
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const [syncIdTick, setSyncIdTick] = useState(0);

  const [levelUp, setLevelUp] = useState<{
    level: number;
    title: string;
    icon: string;
    message?: string;
  } | null>(null);
  const [celebration, setCelebration] = useState<FinanceDashboardCelebration | null>(null);
  const celebrationKeyRef = useRef(0);

  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pullInFlight = useRef(false);
  const pullDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSyncId = useMemo(
    () => (typeof window !== 'undefined' ? getFinanceSyncId() : DEFAULT_FINANCE_SYNC_ID),
    [syncIdTick],
  );

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(() => setCelebration(null), 1800);
    return () => clearTimeout(t);
  }, [celebration?.key]);

  const applyRemoteRow = useCallback((remote: { state: FinanceState; updatedAt: string }) => {
    setState(remote.state);
    saveFinanceState(remote.state);
    setFinanceLocalSavedAt(remote.updatedAt);
    setLastRemoteAt(remote.updatedAt);
    setCloudErr(null);
    setSyncChip('synced');
  }, []);

  /** Pull: si hay fila remota, gana la nube. Si no hay fila, no hace seed (eso solo en boot). */
  const pullFromCloudImmediate = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    if (pullInFlight.current) return;
    const sid = getFinanceSyncId();
    pullInFlight.current = true;
    try {
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pull immediate', { syncId: sid });
      }
      const remote = await fetchFinanceRemote(sid);
      if (remote) {
        applyRemoteRow(remote);
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] pull winner', 'cloud', { updated_at: remote.updatedAt });
        }
      } else if (import.meta.env.DEV) {
        console.debug('[finance-sync] pull no row', { syncId: sid });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al leer la nube.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pull failed', { syncId: sid, error: msg });
      }
    } finally {
      pullInFlight.current = false;
    }
  }, [applyRemoteRow]);

  const scheduleDebouncedPull = useCallback(() => {
    if (!isFinanceCloudConfigured()) return;
    if (pullDebounceTimer.current) clearTimeout(pullDebounceTimer.current);
    pullDebounceTimer.current = setTimeout(() => {
      pullDebounceTimer.current = null;
      void pullFromCloudImmediate();
    }, 650);
  }, [pullFromCloudImmediate]);

  const scheduleRemoteSave = useCallback((syncId: string, next: FinanceState) => {
    if (!isFinanceCloudConfigured()) return;
    if (remoteTimer.current) clearTimeout(remoteTimer.current);
    remoteTimer.current = setTimeout(() => {
      remoteTimer.current = null;
      void upsertFinanceRemote(syncId, next)
        .then((iso) => {
          setFinanceLocalSavedAt(iso);
          setLastRemoteAt(iso);
          setCloudErr(null);
          setSyncChip('synced');
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist ok', { syncId, updated_at: iso });
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Error al guardar en la nube.';
          setCloudErr(msg);
          setSyncChip('error');
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist fail', { syncId, error: msg });
          }
        });
    }, 600);
  }, []);

  const persist = useCallback(
    (updater: (prev: FinanceState) => FinanceState) => {
      setState((prev) => {
        const next = updater(prev);
        saveFinanceState(next);
        if (typeof window !== 'undefined' && isFinanceCloudConfigured()) {
          setSyncChip('saving');
          scheduleRemoteSave(getFinanceSyncId(), next);
        } else if (typeof window !== 'undefined') {
          setSyncChip('solo_local');
        }
        return next;
      });
    },
    [scheduleRemoteSave],
  );

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  const handleForcePush = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    const sid = getFinanceSyncId();
    setSyncChip('saving');
    setCloudErr(null);
    try {
      const iso = await upsertFinanceRemote(sid, stateRef.current);
      setFinanceLocalSavedAt(iso);
      setLastRemoteAt(iso);
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push ok', { syncId: sid, updated_at: iso });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al subir.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push fail', { syncId: sid, error: msg });
      }
      throw e;
    }
  }, []);

  const handleResetSyncIdToDefault = useCallback(() => {
    resetFinanceSyncIdToDefault();
    setSyncIdTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (typeof window === 'undefined') return;

      if (!isFinanceCloudConfigured()) {
        setSyncChip('solo_local');
        return;
      }

      const sid = getFinanceSyncId();
      setSyncChip('saving');

      try {
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] boot start', { syncId: sid });
        }
        const remote = await fetchFinanceRemote(sid);
        if (cancelled) return;

        if (remote) {
          applyRemoteRow(remote);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] boot winner', 'cloud', { updated_at: remote.updatedAt });
          }
          return;
        }

        const local = loadFinanceState();
        const iso = await upsertFinanceRemote(sid, local);
        if (cancelled) return;
        setFinanceLocalSavedAt(iso);
        setLastRemoteAt(iso);
        setCloudErr(null);
        setSyncChip('synced');
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] boot winner', 'local_seed', { updated_at: iso });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error al leer la nube.';
          setCloudErr(msg);
          setSyncChip('error');
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] boot error', { syncId: sid, error: msg });
          }
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyRemoteRow]);

  useEffect(() => {
    if (!isFinanceCloudConfigured()) return;

    const onVis = () => {
      if (document.visibilityState === 'visible') scheduleDebouncedPull();
    };
    const onFocus = () => scheduleDebouncedPull();
    const onOnline = () => {
      void pullFromCloudImmediate();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [pullFromCloudImmediate, scheduleDebouncedPull]);

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
  const investedMonth = getMonthlyInvested(state.entries, month);
  const investedTotal = getTotalInvested(state.entries);
  const prevMonth = addMonths(month, -1);
  const investedPrev = getMonthlyInvested(state.entries, prevMonth);
  const activeMonths = new Set(
    state.entries.filter((e) => e.type === 'investment' && e.amount > 0).map((e) => e.month),
  ).size;
  const monthEntries = useMemo(() => getEntriesByMonth(state.entries, month), [state.entries, month]);
  const mission = useMemo(() => getMonthlyMissionView(state, month), [state, month]);

  const sortedMonthInvestments = useMemo(() => {
    return [...monthEntries]
      .filter((e) => e.type === 'investment')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [monthEntries]);

  const latestInvestments = useMemo(() => sortedMonthInvestments.slice(0, 3), [sortedMonthInvestments]);
  const moreInvestments = useMemo(() => sortedMonthInvestments.slice(3), [sortedMonthInvestments]);

  const handleAddEntry = useCallback(
    (entry: FinanceEntry) => {
      let overlay: { level: number; title: string; icon: string; message?: string } | null = null;
      let dash: FinanceDashboardCelebration | null = null;

      persist((prev) => {
        const m = entry.month;
        const prevLevel = getMonthlyLevel(prev, m).level;
        const next: FinanceState = { ...prev, entries: [...prev.entries, entry] };
        const newLevel = getMonthlyLevel(next, m).level;
        if (newLevel > prevLevel) {
          const info = getMonthlyLevel(next, m);
          const th = getLevelTheme(newLevel);
          overlay = {
            level: newLevel,
            title: info.title,
            icon: th.icon,
            message: levelUpMessageFor(newLevel),
          };
          if (m === prev.currentMonth) {
            celebrationKeyRef.current += 1;
            dash = {
              key: celebrationKeyRef.current,
              barFrom: getLevelProgressPercent(prev, m, prevLevel),
              barTo: getLevelProgressPercent(next, m, newLevel),
            };
          }
        }
        return next;
      });

      queueMicrotask(() => {
        if (overlay) setLevelUp(overlay);
        if (dash) setCelebration(dash);
      });
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
        isFinanceCloudConfigured()
          ? '¿Borrar todo en este navegador y en la nube (mismo libro)? No se puede deshacer.'
          : '¿Borrar todas las inversiones registradas, objetivos y retos en este dispositivo? No se puede deshacer.',
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
    <div className="finance-app-shell relative isolate min-w-0 overflow-x-hidden pt-3 sm:pt-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -20%, rgba(99, 102, 241, 0.28), transparent 50%),
            radial-gradient(ellipse 80% 50% at 100% 50%, rgba(34, 211, 238, 0.1), transparent 45%),
            radial-gradient(ellipse 60% 40% at 0% 80%, rgba(167, 139, 250, 0.12), transparent 40%),
            linear-gradient(180deg, #06111f 0%, #020617 42%, #0f172a 100%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" aria-hidden />

      <div className="container-page relative z-[1] mx-auto min-w-0 max-w-6xl py-4 sm:py-10">
        {isEmpty ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/90">Primer paso</p>
            <p className="mt-2 text-sm font-bold text-white sm:text-base">Cada carga suma al nivel del mes.</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400 sm:text-sm">
              Cargá la primera inversión del mes acá abajo.
              {isFinanceCloudConfigured()
                ? ' Con nube, los datos se sincronizan solos entre dispositivos.'
                : ' Sin nube, todo queda en este navegador: el respaldo JSON está en “Respaldo y sincronización”.'}
            </p>
          </div>
        ) : null}

        <section id="dashboard-financiero" className="scroll-mt-24">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <SyncStatusChip status={syncChip} />
          </div>
          <FinanceDashboard
            state={state}
            onMonthChange={(m) => patchState({ currentMonth: m })}
            celebration={celebration}
          />

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:block">
              <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 sm:mb-2">
                Este mes
              </p>
              <div className="min-w-0 text-right sm:text-left">
              <p className="text-2xl font-black tabular-nums leading-none text-white sm:text-[1.5rem]">
                {formatARS(investedMonth)}
              </p>
              {investedPrev > 0 && (
                <p
                  className={`mt-1 text-xs font-semibold tabular-nums sm:text-[11px] ${
                    investedMonth >= investedPrev ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {investedMonth >= investedPrev ? '▲' : '▼'} vs {formatARS(investedPrev)}
                </p>
              )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:block">
              <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 sm:mb-2">
                Acumulado
              </p>
              <div className="min-w-0 text-right sm:text-left">
                <p className="text-2xl font-black tabular-nums leading-none text-white sm:text-[1.5rem]">
                  {formatARS(investedTotal)}
                </p>
                <p className="mt-1 text-xs text-white/40 sm:mt-1.5 sm:text-[11px]">histórico total</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:block">
              <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 sm:mb-2">
                Meses activos
              </p>
              <div className="min-w-0 text-right sm:text-left">
                <p className="text-2xl font-black tabular-nums leading-none text-white sm:text-[1.5rem]">
                  {activeMonths}
                </p>
                <p className="mt-1 text-xs text-white/40 sm:mt-1.5 sm:text-[11px]">con inversión</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex min-w-0 flex-col gap-4 md:mt-6 md:grid md:grid-cols-2 md:items-stretch md:gap-5">
          <section id="inversion" className="order-1 scroll-mt-24 min-w-0 pb-2 md:order-2 md:scroll-mt-28 md:pb-0">
            <FinanceEntryForm month={month} entries={state.entries} onAddEntry={handleAddEntry} />
          </section>
          <div className="order-2 min-w-0 md:order-1">
            <FinanceMissionCard mission={mission} />
          </div>
        </div>

        <div className="mt-6 md:mt-7">
          <FinanceQuickMetrics state={state} month={month} compact />
        </div>

        <section className="mt-6 md:mt-7">
          {sortedMonthInvestments.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
              Todavía no cargaste inversiones este mes.
            </p>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 shadow-md backdrop-blur-md sm:px-5 sm:py-4">
              <div className="mb-3">
                <h3 className="text-sm font-black text-white sm:text-base">Últimas inversiones</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Lo cargado este mes</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{month}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {latestInvestments.map((e) => {
                  const dateStr = new Date(e.createdAt).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <li
                      key={e.id}
                      className="group flex items-start justify-between gap-3 border-l-2 border-emerald-400/70 bg-white/[0.025] px-3 py-3 transition hover:bg-white/[0.045]"
                    >
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                        <p className="text-lg font-black tabular-nums leading-tight text-white sm:text-xl">
                          {formatARS(e.amount)}
                        </p>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {e.asset ? (
                              <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                                {e.asset}
                              </span>
                            ) : null}
                            {e.platform ? (
                              <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                {e.platform}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{dateStr}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="finance-touch-target shrink-0 rounded-lg border border-transparent px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-200 active:scale-[0.98]"
                        onClick={() => removeEntry(e.id)}
                      >
                        Borrar
                      </button>
                    </li>
                  );
                })}
              </ul>
              {moreInvestments.length > 0 ? (
                <details className="mt-2 border-t border-white/5 pt-2">
                  <summary className="cursor-pointer list-none text-center text-xs font-bold text-indigo-300/90 hover:text-indigo-200 [&::-webkit-details-marker]:hidden">
                    Ver todas las inversiones del mes ({sortedMonthInvestments.length})
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {moreInvestments.map((e) => {
                      const dateStr = new Date(e.createdAt).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <li
                          key={e.id}
                          className="group flex items-start justify-between gap-3 border-l-2 border-emerald-400/70 bg-white/[0.025] px-3 py-3 transition hover:bg-white/[0.045]"
                        >
                          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                            <p className="text-base font-black tabular-nums text-white">{formatARS(e.amount)}</p>
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {e.asset ? (
                                  <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                                    {e.asset}
                                  </span>
                                ) : null}
                                {e.platform ? (
                                  <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                    {e.platform}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[10px] font-semibold text-slate-500">{dateStr}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg border border-transparent px-2 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-200"
                            onClick={() => removeEntry(e.id)}
                          >
                            Borrar
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
            </div>
          )}
        </section>

        <div className="mt-6 flex min-w-0 flex-col gap-3 md:mt-8">
          <details className="group rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Ver ruta de niveles
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceLevels
                compact
                state={state}
                month={month}
                onWealthTargetChange={(n) =>
                  patchState({
                    wealthTarget: n === undefined || n === null || Number.isNaN(n) ? undefined : n,
                  })
                }
              />
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Ver objetivos
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceGoals goals={state.goals} onAdd={addGoal} onUpdate={updateGoal} onRemove={removeGoal} />
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Respaldo y sincronización
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceJsonTools
                state={state}
                onImport={replaceState}
                cloudAutoSync={isFinanceCloudConfigured()}
                activeSyncId={activeSyncId}
                cloudError={cloudErr}
                lastSyncIso={lastRemoteAt}
                onForcePull={pullFromCloudImmediate}
                onForcePush={handleForcePush}
                onResetSyncIdToDefault={handleResetSyncIdToDefault}
              />
            </div>
          </details>

          <details className="rounded-2xl border border-red-500/20 bg-red-950/20 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-red-200/95 transition hover:bg-red-950/30 [&::-webkit-details-marker]:hidden">
              Zona peligrosa
            </summary>
            <div className="border-t border-red-500/15 px-4 pb-4 pt-3">
              <p className="text-xs font-medium text-red-100/75">
                {isFinanceCloudConfigured()
                  ? 'Borrá todo en la nube y en este navegador. Exportá JSON antes si querés un archivo de respaldo.'
                  : 'Borrá todo en este navegador. Exportá o copiá el JSON antes si querés conservarlo.'}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-red-500/35 bg-red-600/15 py-2.5 text-sm font-bold text-red-100 transition hover:bg-red-600/25"
                onClick={clearAll}
              >
                Borrar todo
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="finance-mobile-cta fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#06111f]/95 backdrop-blur-md sm:hidden">
        <a
          href="#inversion"
          className="mx-auto flex min-h-[52px] max-w-lg items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 text-base font-black text-slate-950 shadow-lg active:scale-[0.99]"
        >
          Cargar inversión
        </a>
      </div>

      {levelUp ? (
        <LevelUpOverlay
          open
          level={levelUp.level}
          title={levelUp.title}
          icon={levelUp.icon}
          message={levelUp.message}
          onClose={dismissLevelUp}
        />
      ) : null}
    </div>
  );
}
