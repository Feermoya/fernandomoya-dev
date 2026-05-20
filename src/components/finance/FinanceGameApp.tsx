import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FinanceEntry, FinanceGoal, FinanceState } from '@/lib/finance/types';
import {
  getInitialFinanceState,
  saveFinanceState,
  getFinanceSyncId,
  getFinanceLocalSavedAt,
  setFinanceLocalSavedAt,
  resetFinanceSyncIdToDefault,
  DEFAULT_FINANCE_SYNC_ID,
} from '@/lib/finance/storage';
import { isStandalonePwa } from '@/lib/finance/pwa';
import { isFinanceCloudConfigured, upsertFinanceRemote } from '@/lib/finance/cloudSync';
import {
  emptyFinanceStateForCloudMiss,
  prepareFinanceCloudSession,
  pullCanonicalFromCloud,
} from '@/lib/finance/syncBootstrap';
import { FinanceDashboard, type FinanceDashboardCelebration } from '@/components/finance/FinanceDashboard';
import { FinanceQuickMetrics } from '@/components/finance/FinanceQuickMetrics';
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm';
import { FinanceInstallHint } from '@/components/finance/FinanceInstallHint';
import { FinanceMicroToast } from '@/components/finance/FinanceMicroToast';
import { FinanceConfettiBurst } from '@/components/finance/FinanceConfettiBurst';
import { FinanceEntryEditModal } from '@/components/finance/FinanceEntryEditModal';
import { FinanceWhatsAppReminders } from '@/components/finance/FinanceWhatsAppReminders';
import { FinanceQuickAmountsEditor } from '@/components/finance/FinanceQuickAmountsEditor';
import { triggerEntryHaptic } from '@/lib/finance/celebration';
import {
  normalizePreferences,
  shouldShowInAppReminder,
  buildWhatsAppLink,
  reminderMessageForMonth,
  reminderStatusLine,
  DEFAULT_REMINDER_MESSAGE,
} from '@/lib/finance/preferences';
import { getCalendarMonthKey } from '@/lib/finance/calculations';
import { cronReminderRunKey, markCronReminderSent } from '@/lib/finance/preferences';
import { getArgentinaDateParts } from '@/lib/finance/timezone';
import type { FinancePreferences } from '@/lib/finance/types';
import { FinanceGoals } from '@/components/finance/FinanceGoals';
import { FinanceLevels } from '@/components/finance/FinanceLevels';
import { FinanceJsonTools } from '@/components/finance/FinanceJsonTools';
import { LevelUpOverlay } from '@/components/finance/LevelUpOverlay';
import { getEntriesByMonth, formatARS, getMonthlyInvested } from '@/lib/finance/calculations';
import { getMonthlyMissionView, getMonthlyLevel, getLevelProgressPercent } from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

type SyncChip = 'loading' | 'synced' | 'saving' | 'error' | 'solo_local';

function levelUpMessageFor(nextLevel: number): string | undefined {
  if (nextLevel === 2) return 'Ahora estás construyendo repetición, no entusiasmo.';
  return undefined;
}

function initialSyncChip(): SyncChip {
  return isFinanceCloudConfigured() ? 'loading' : 'solo_local';
}

function SyncStatusChip({ status }: { status: SyncChip }) {
  const label =
    status === 'loading'
      ? 'Cargando nube…'
      : status === 'synced'
        ? 'Guardado en la nube'
        : status === 'saving'
          ? 'Guardando…'
          : status === 'error'
            ? 'No se pudo guardar'
            : 'Solo en este dispositivo';
  const cls =
    status === 'synced'
      ? 'border-emerald-500/35 bg-emerald-950/50 text-emerald-200/95'
      : status === 'error'
        ? 'border-rose-500/40 bg-rose-950/45 text-rose-200/95'
        : status === 'loading'
          ? 'border-cyan-500/35 bg-cyan-950/40 text-cyan-100/90'
          : 'border-amber-500/35 bg-amber-950/40 text-amber-100/90';

  return (
    <span
      role="status"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${cls}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function FinanceGameApp() {
  const cloudOn = isFinanceCloudConfigured();

  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [cloudReady, setCloudReady] = useState(() => !cloudOn);
  const [syncChip, setSyncChip] = useState<SyncChip>(() => initialSyncChip());
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(null);
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
  const [microToast, setMicroToast] = useState<{ message: string; sub?: string } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pullInFlight = useRef(false);
  const bootGenRef = useRef(0);

  const activeSyncId = useMemo(
    () => getFinanceSyncId(),
    [syncIdTick],
  );

  useEffect(() => {
    prepareFinanceCloudSession();
    setLastRemoteAt(getFinanceLocalSavedAt());
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(() => setCelebration(null), 1800);
    return () => clearTimeout(t);
  }, [celebration?.key]);

  useEffect(() => {
    if (!microToast) return;
    const t = window.setTimeout(() => setMicroToast(null), 2600);
    return () => clearTimeout(t);
  }, [microToast?.message]);

  const applyCloudState = useCallback((next: FinanceState, updatedAt: string) => {
    setState(next);
    saveFinanceState(next);
    setLastRemoteAt(updatedAt);
    setCloudErr(null);
    setSyncChip('synced');
  }, []);

  /** Pull: siempre el libro canónico en Supabase (mismo en Safari, PWA y desktop). */
  const pullFromCloudImmediate = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    if (pullInFlight.current) return;
    pullInFlight.current = true;
    setSyncChip((prev) => (prev === 'loading' ? 'loading' : 'saving'));
    try {
      const result = await pullCanonicalFromCloud();
      if (result.ok) {
        applyCloudState(result.state, result.updatedAt);
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] pull ok', { updated_at: result.updatedAt });
        }
        return;
      }
      if (result.reason === 'empty') {
        const empty = emptyFinanceStateForCloudMiss();
        applyCloudState(empty, new Date().toISOString());
        setCloudErr('No hay inversiones en la nube. Si tenías datos, probá Forzar subir desde el PC.');
        setSyncChip('error');
        return;
      }
      const msg = result.message ?? 'Error al leer la nube.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pull failed', msg);
      }
      throw new Error(msg);
    } finally {
      pullInFlight.current = false;
    }
  }, [applyCloudState]);

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
          scheduleRemoteSave(DEFAULT_FINANCE_SYNC_ID, next);
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
    setSyncChip('saving');
    setCloudErr(null);
    try {
      const iso = await upsertFinanceRemote(DEFAULT_FINANCE_SYNC_ID, stateRef.current);
      setFinanceLocalSavedAt(iso);
      setLastRemoteAt(iso);
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push ok', { syncId: DEFAULT_FINANCE_SYNC_ID, updated_at: iso });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al subir.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push fail', { syncId: DEFAULT_FINANCE_SYNC_ID, error: msg });
      }
      throw e;
    }
  }, []);

  const handleResetSyncIdToDefault = useCallback(() => {
    resetFinanceSyncIdToDefault();
    setSyncIdTick((n) => n + 1);
  }, []);

  const handleRefreshFromCloud = useCallback(() => {
    void pullFromCloudImmediate();
  }, [pullFromCloudImmediate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isFinanceCloudConfigured()) {
      setCloudReady(true);
      setSyncChip('solo_local');
      return;
    }

    const gen = ++bootGenRef.current;
    setCloudReady(false);
    setSyncChip('loading');
    setCloudErr(null);

    async function boot() {
      try {
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] boot start', {
            syncId: DEFAULT_FINANCE_SYNC_ID,
            pwa: isStandalonePwa(),
          });
        }
        const result = await pullCanonicalFromCloud();
        if (gen !== bootGenRef.current) return;

        if (result.ok) {
          applyCloudState(result.state, result.updatedAt);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] boot ok', { updated_at: result.updatedAt });
          }
          return;
        }

        if (result.reason === 'empty') {
          const empty = emptyFinanceStateForCloudMiss();
          applyCloudState(empty, new Date().toISOString());
          setCloudErr('No hay inversiones en la nube todavía.');
          setSyncChip('error');
          return;
        }

        setCloudErr(result.message ?? 'Error al leer la nube.');
        setSyncChip('error');
      } finally {
        if (gen === bootGenRef.current) {
          setCloudReady(true);
        }
      }
    }

    void boot();
  }, [applyCloudState, syncIdTick]);

  useEffect(() => {
    if (!isFinanceCloudConfigured()) return;

    const onVis = () => {
      if (document.visibilityState === 'visible') void pullFromCloudImmediate();
    };
    const onFocus = () => {
      void pullFromCloudImmediate();
    };
    const onOnline = () => {
      void pullFromCloudImmediate();
    };
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) void pullFromCloudImmediate();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [pullFromCloudImmediate]);

  useEffect(() => {
    if (!isFinanceCloudConfigured() || !cloudReady) return;
    if (!isStandalonePwa()) return;

    const tick = () => {
      if (document.visibilityState === 'visible') void pullFromCloudImmediate();
    };
    const id = window.setInterval(tick, 45_000);
    return () => clearInterval(id);
  }, [cloudReady, pullFromCloudImmediate]);

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

  const preferences = useMemo(() => normalizePreferences(state.preferences), [state.preferences]);

  const patchPreferences = useCallback(
    (prefs: FinancePreferences) => {
      persist((prev) => ({ ...prev, preferences: prefs }));
    },
    [persist],
  );

  const month = state.currentMonth;
  const todayMonth = getCalendarMonthKey();
  const investedTodayMonth = getMonthlyInvested(state.entries, todayMonth);
  const monthEntries = useMemo(() => getEntriesByMonth(state.entries, month), [state.entries, month]);
  const mission = useMemo(() => getMonthlyMissionView(state, month), [state, month]);

  const showReminderBanner = useMemo(
    () => shouldShowInAppReminder(preferences.reminder, investedTodayMonth),
    [preferences.reminder, investedTodayMonth],
  );

  const todayMonthLabel = useMemo(() => {
    const [y, m] = todayMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }, [todayMonth]);

  const reminderBannerCopy = useMemo(
    () => reminderStatusLine(investedTodayMonth),
    [investedTodayMonth],
  );

  const reminderWaLink = useMemo(() => {
    const r = preferences.reminder;
    const text = reminderMessageForMonth(
      r.messageTemplate ?? DEFAULT_REMINDER_MESSAGE,
      todayMonthLabel,
      investedTodayMonth,
    );
    return buildWhatsAppLink(r.phoneDigits, text);
  }, [preferences.reminder, todayMonthLabel, investedTodayMonth]);

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
      let toast: { message: string; sub?: string } | null = null;

      persist((prev) => {
        const m = entry.month;
        const prevLevel = getMonthlyLevel(prev, m).level;
        const next: FinanceState = { ...prev, entries: [...prev.entries, entry] };
        const newLevel = getMonthlyLevel(next, m).level;
        const inv = getMonthlyInvested(next.entries, m);
        const mv = getMonthlyMissionView(next, m);
        toast = {
          message: `+${formatARS(entry.amount)} sumado`,
          sub: `${formatARS(inv)} este mes · ${mv.percent.toFixed(0)}% del objetivo`,
        };
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
        if (toast) setMicroToast(toast);
        setConfettiKey((k) => k + 1);
        triggerEntryHaptic();
        if (overlay) setLevelUp(overlay);
        if (dash) setCelebration(dash);
      });
    },
    [persist],
  );

  const updateEntry = useCallback(
    (updated: FinanceEntry) => {
      persist((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === updated.id ? updated : e)),
      }));
      setMicroToast({ message: 'Inversión actualizada', sub: formatARS(updated.amount) });
    },
    [persist],
  );

  const dismissReminderBanner = useCallback(() => {
    const { day, monthKey } = getArgentinaDateParts();
    const runKey = cronReminderRunKey(monthKey, day);
    patchPreferences({
      ...preferences,
      reminder: markCronReminderSent(preferences.reminder, runKey),
    });
  }, [patchPreferences, preferences]);

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
    <div className="finance-app-shell relative isolate min-w-0 overflow-x-hidden sm:pt-2">
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

      <div className="container-page relative z-[1] mx-auto min-w-0 max-w-lg py-3 sm:max-w-2xl sm:py-6">
        {cloudErr && cloudReady ? (
          <div
            className="mb-2 flex flex-col gap-2 rounded-xl border border-rose-500/35 bg-rose-950/40 p-3 sm:mb-3"
            role="alert"
          >
            <p className="text-xs font-bold text-rose-200">{cloudErr}</p>
            <button
              type="button"
              onClick={() => void pullFromCloudImmediate()}
              className="min-h-[40px] self-start rounded-xl bg-rose-600/25 px-3 text-xs font-black text-rose-50"
            >
              Reintentar sincronización
            </button>
          </div>
        ) : null}

        <header className="finance-app-header mb-3 flex items-start justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">Foco financiero</h1>
            <p className="text-xs font-semibold text-white/45">Cargá, mirá el nivel, seguí la racha</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFinanceCloudConfigured() ? (
              <button
                type="button"
                onClick={handleRefreshFromCloud}
                disabled={syncChip === 'loading' || !cloudReady}
                className="finance-touch-target inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/12 bg-white/5 px-2.5 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                title="Traer últimos datos de la nube"
              >
                ↻
              </button>
            ) : null}
            <SyncStatusChip status={syncChip} />
          </div>
        </header>

        {!cloudReady ? (
          <div
            className="mb-4 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-950/25 px-4 py-8"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-black text-cyan-100">Sincronizando con la nube…</p>
            <p className="max-w-xs text-center text-xs font-semibold text-cyan-200/70">
              Traemos siempre los últimos datos guardados. Si tarda, revisá la conexión.
            </p>
          </div>
        ) : null}

        {cloudReady ? (
          <>
        <FinanceInstallHint />

        {showReminderBanner && reminderWaLink ? (
          <div className="mb-4 rounded-2xl border border-amber-400/35 bg-amber-950/40 p-4">
            <p className="text-sm font-black text-amber-100">{reminderBannerCopy.title}</p>
            <p className="mt-1 text-xs font-semibold text-amber-200/80">{reminderBannerCopy.detail}</p>
            <p className="mt-1 text-[10px] text-amber-200/60">
              Solo te avisamos si no llegaste al mínimo del mes. Hoy toca recordatorio programado.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={reminderWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#25D366] px-4 text-xs font-black text-white"
              >
                WhatsApp
              </a>
              <a
                href="#inversion"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-black text-white"
              >
                Cargar ahora
              </a>
              <button
                type="button"
                onClick={dismissReminderBanner}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-bold text-slate-300"
              >
                Después
              </button>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/90">Primer paso</p>
            <p className="mt-2 text-sm font-bold text-white">Tu primera carga desbloquea el tablero del mes.</p>
          </div>
        ) : null}

        <section id="dashboard-financiero" className="scroll-mt-20">
          <FinanceDashboard
            state={state}
            mission={mission}
            onMonthChange={(m) => patchState({ currentMonth: m })}
            celebration={celebration}
          />
        </section>

        <section id="inversion" className="mt-4 scroll-mt-24 min-w-0 sm:mt-5">
          <FinanceEntryForm
            month={month}
            entries={state.entries}
            quickAmounts={preferences.quickAmounts}
            onAddEntry={handleAddEntry}
          />
        </section>

        <section className="mt-5 md:mt-6">
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
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="finance-touch-target rounded-lg border border-transparent px-2 py-2 text-xs font-bold text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
                          onClick={() => setEditingEntry(e)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="finance-touch-target rounded-lg border border-transparent px-2 py-2 text-xs font-bold text-slate-500 transition hover:border-white/10 hover:bg-white/5 hover:text-rose-300"
                          onClick={() => removeEntry(e.id)}
                        >
                          Borrar
                        </button>
                      </div>
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
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              className="finance-touch-target rounded-lg border border-transparent px-2 py-2 text-xs font-bold text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
                              onClick={() => setEditingEntry(e)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="finance-touch-target rounded-lg border border-transparent px-2 py-2 text-xs font-bold text-slate-500 transition hover:border-white/10 hover:bg-white/5 hover:text-rose-300"
                              onClick={() => removeEntry(e.id)}
                            >
                              Borrar
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
            </div>
          )}
        </section>

        <div className="mt-5 flex min-w-0 flex-col gap-2.5 md:mt-6">
          <details className="rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Ver más métricas
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceQuickMetrics state={state} month={month} compact />
            </div>
          </details>

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
              Recordatorios WhatsApp
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceWhatsAppReminders state={state} onPreferencesChange={patchPreferences} />
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Montos rápidos
            </summary>
            <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
              <FinanceQuickAmountsEditor preferences={preferences} onChange={patchPreferences} />
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-slate-950/40 shadow-lg open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
              Ajustes avanzados
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
          </>
        ) : null}
      </div>

      {cloudReady ? (
      <div className="finance-mobile-cta fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#06111f]/95 backdrop-blur-md sm:hidden">
        <a
          href="#inversion"
          className="mx-auto flex min-h-[52px] max-w-lg items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 text-base font-black text-slate-950 shadow-lg active:scale-[0.99]"
        >
          Cargar inversión
        </a>
      </div>
      ) : null}

      {confettiKey > 0 ? <FinanceConfettiBurst burstKey={confettiKey} /> : null}
      {microToast ? <FinanceMicroToast message={microToast.message} sub={microToast.sub} /> : null}

      <FinanceEntryEditModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={updateEntry}
      />

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
