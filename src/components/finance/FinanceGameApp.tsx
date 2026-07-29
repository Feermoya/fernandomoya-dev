import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FinanceEntry, FinanceGoal, FinanceState } from '@/lib/finance/types';
import { getInitialFinanceState } from '@/lib/finance/storage';
import { isFinanceCloudConfigured } from '@/lib/finance/cloudSync';
import {
  getCurrentMonthKey,
  hasManualMonthSelection,
  isValidMonthKey,
  markMonthManuallyChanged,
} from '@/lib/finance/monthNavigation';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { FinanceOverviewPanel } from '@/components/finance/FinanceOverviewPanel';
import { FinanceMonthlyInsightPanel } from '@/components/finance/FinanceMonthlyInsightPanel';
import { FinanceConcentrationPanel } from '@/components/finance/FinanceConcentrationPanel';
import { FinanceTickerHistoryPanel } from '@/components/finance/FinanceTickerHistoryPanel';
import { FinanceRecentInvestments } from '@/components/finance/FinanceRecentInvestments';
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm';
import { FinanceMonthlyInvestmentPlan } from '@/components/finance/FinanceMonthlyInvestmentPlan';
import { FinanceMarketAlerts } from '@/components/finance/FinanceMarketAlerts';
import { FinanceInstallHint } from '@/components/finance/FinanceInstallHint';
import { FinanceMicroToast } from '@/components/finance/FinanceMicroToast';
import { FinanceConfettiBurst } from '@/components/finance/FinanceConfettiBurst';
import { FinanceEntryEditModal } from '@/components/finance/FinanceEntryEditModal';
import { FinanceWhatsAppReminders } from '@/components/finance/FinanceWhatsAppReminders';
import { FinanceQuickAmountsEditor } from '@/components/finance/FinanceQuickAmountsEditor';
import { formatARS, getEntriesByMonth } from '@/lib/finance/calculations';
import {
  cronReminderRunKey,
  markInAppReminderDismissed,
  normalizePreferences,
  shouldShowInAppReminder,
  reminderStatusLine,
} from '@/lib/finance/preferences';
import { getArgentinaDateParts } from '@/lib/finance/timezone';
import type { FinancePreferences } from '@/lib/finance/types';
import { FinanceGoals } from '@/components/finance/FinanceGoals';
import { FinanceLevels } from '@/components/finance/FinanceLevels';
import { FinanceJsonTools } from '@/components/finance/FinanceJsonTools';
import { LevelUpOverlay } from '@/components/finance/LevelUpOverlay';
import { getMonthlyMissionView } from '@/lib/finance/levels';
import { useFinancePersistence } from '@/hooks/finance/useFinancePersistence';
import {
  useFinanceCloudSync,
  type FinanceSyncChip,
} from '@/hooks/finance/useFinanceCloudSync';
import { useFinanceMonthlyPlanActions } from '@/hooks/finance/useFinanceMonthlyPlanActions';
import { useFinanceCelebrations } from '@/hooks/finance/useFinanceCelebrations';

function SyncStatusChip({ status }: { status: FinanceSyncChip }) {
  const label =
    status === 'loading'
      ? 'Cargando nube…'
      : status === 'synced'
        ? 'Guardado en la nube'
        : status === 'saving'
          ? 'Guardando…'
          : status === 'offline'
            ? 'Nube no disponible'
            : status === 'error'
              ? 'No se pudo guardar'
              : 'Solo en este dispositivo';
  const cls =
    status === 'synced'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : status === 'offline'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : status === 'loading'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-amber-200 bg-amber-50 text-amber-700';

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
  const cloudSyncRef = useRef<{
    setSyncChip: (value: FinanceSyncChip | ((prev: FinanceSyncChip) => FinanceSyncChip)) => void;
    setLastRemoteAt: (value: string | null) => void;
    setCloudErr: (value: string | null) => void;
    markOffline?: () => void;
  } | null>(null);

  const { state, setState, stateRef, persist, replaceState, patchState } = useFinancePersistence({
    onSaving: () => cloudSyncRef.current?.setSyncChip('saving'),
    onSoloLocal: () => cloudSyncRef.current?.setSyncChip('solo_local'),
    onRemoteSaved: (iso) => {
      cloudSyncRef.current?.setLastRemoteAt(iso);
      cloudSyncRef.current?.setCloudErr(null);
      cloudSyncRef.current?.setSyncChip('synced');
    },
    onRemoteOffline: () => {
      cloudSyncRef.current?.markOffline?.();
    },
    onRemoteError: (msg) => {
      cloudSyncRef.current?.setCloudErr(msg);
      cloudSyncRef.current?.setSyncChip('error');
    },
  });

  const {
    cloudOn,
    cloudReady,
    syncChip,
    lastRemoteAt,
    cloudErr,
    activeSyncId,
    pullFromCloudImmediate,
    handleForcePush,
    handleRefreshFromCloud,
    handleResetSyncIdToDefault,
    setSyncChip,
    setLastRemoteAt,
    setCloudErr,
    markOffline,
  } = useFinanceCloudSync({ stateRef, setState });

  cloudSyncRef.current = { setSyncChip, setLastRemoteAt, setCloudErr, markOffline };

  const {
    levelUp,
    celebration,
    microToast,
    confettiKey,
    setMicroToast,
    dismissLevelUp,
    handleAddEntry,
  } = useFinanceCelebrations({ persist });

  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  const month = state.currentMonth;

  const {
    pendingPlanLabels,
    hasPreviousMonthPlan,
    addMonthlyPlanItems,
    copyMonthlyPlanFromPreviousMonth,
    removeMonthlyPlanItem,
    splitMergedMonthlyPlanItem,
  } = useFinanceMonthlyPlanActions({ state, month, persist });

  const preferences = useMemo(() => normalizePreferences(state.preferences), [state.preferences]);

  const patchPreferences = useCallback(
    (prefs: FinancePreferences) => {
      persist((prev) => ({ ...prev, preferences: prefs }));
    },
    [persist],
  );

  const monthEntries = useMemo(() => getEntriesByMonth(state.entries, month), [state.entries, month]);
  const mission = useMemo(() => getMonthlyMissionView(state, month), [state, month]);

  const showReminderBanner = useMemo(
    () => shouldShowInAppReminder(preferences.reminder, state),
    [preferences.reminder, state],
  );

  const reminderBannerCopy = useMemo(() => reminderStatusLine(state), [state]);

  const sortedMonthInvestments = useMemo(() => {
    return [...monthEntries]
      .filter((e) => e.type === 'investment')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [monthEntries]);

  const updateEntry = useCallback(
    (updated: FinanceEntry) => {
      persist((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === updated.id ? updated : e)),
      }));
      setMicroToast({ message: 'Inversión actualizada', sub: formatARS(updated.amount) });
    },
    [persist, setMicroToast],
  );

  const dismissReminderBanner = useCallback(() => {
    const { day, monthKey } = getArgentinaDateParts();
    const runKey = cronReminderRunKey(monthKey, day);
    patchPreferences({
      ...preferences,
      reminder: markInAppReminderDismissed(preferences.reminder, runKey),
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

  const handleMonthChange = useCallback(
    (nextMonth: string) => {
      markMonthManuallyChanged();
      patchState({ currentMonth: nextMonth });
    },
    [patchState],
  );

  useEffect(() => {
    if (!cloudReady) return;
    if (hasManualMonthSelection()) return;
    const now = getCurrentMonthKey();
    if (!isValidMonthKey(state.currentMonth) || state.currentMonth !== now) {
      patchState({ currentMonth: now });
    }
  }, [cloudReady, syncChip, patchState, state.currentMonth]);

  const hasInvestments = state.entries.some((e) => e.type === 'investment');
  const isEmpty = !hasInvestments && state.goals.length === 0;

  return (
    <div className="finance-app-shell relative isolate min-w-0 overflow-x-hidden sm:pt-2">
      <div className="finance-page-container relative z-[1] mx-auto min-w-0 px-4 py-4 sm:px-5 sm:py-6 lg:px-6">
        {cloudErr && cloudReady && syncChip === 'error' ? (
          <div
            className="mb-2 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 sm:mb-3"
            role="status"
          >
            <p className="text-xs font-bold text-red-700">{cloudErr}</p>
            <button
              type="button"
              onClick={() => void pullFromCloudImmediate()}
              className="finance-secondary-button min-h-[40px] self-start px-3 text-xs"
            >
              Reintentar sincronización
            </button>
          </div>
        ) : null}

        <header className="finance-app-header mb-4 flex items-start justify-between gap-3 sm:mb-5">
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Foco financiero</h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Seguimiento mensual de inversión</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFinanceCloudConfigured() ? (
              <button
                type="button"
                onClick={handleRefreshFromCloud}
                disabled={syncChip === 'loading' || !cloudReady}
                className="finance-touch-target inline-flex min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
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
            className="mb-4 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-8"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-black text-blue-800">Sincronizando con la nube…</p>
            <p className="max-w-xs text-center text-xs font-semibold text-blue-600">
              Traemos siempre los últimos datos guardados. Si tarda, revisá la conexión.
            </p>
          </div>
        ) : null}

        {cloudReady ? (
          <>
        <FinanceInstallHint />

        {showReminderBanner ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">{reminderBannerCopy.title}</p>
            <p className="mt-1 text-xs font-semibold text-amber-800">{reminderBannerCopy.detail}</p>
            <p className="mt-1 text-[10px] text-amber-700">
              Si tenés WhatsApp automático activado, el cron también te avisa sin abrir la app.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="#inversion"
                className="finance-primary-button inline-flex min-h-[44px] items-center justify-center px-4 text-xs"
              >
                Cargar ahora
              </a>
              <button
                type="button"
                onClick={dismissReminderBanner}
                className="finance-secondary-button inline-flex min-h-[44px] items-center justify-center px-3 text-xs"
              >
                Después
              </button>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="finance-card-compact mb-4 p-4">
            <p className="finance-label">Primer paso</p>
            <p className="mt-2 text-sm font-bold text-slate-900">Tu primera carga desbloquea el tablero del mes.</p>
          </div>
        ) : null}

        <main className="finance-page-grid">
          <div className="finance-main-column">
            <section id="dashboard-financiero" className="order-1 scroll-mt-20 lg:order-none">
              <FinanceDashboard
                state={state}
                mission={mission}
                onMonthChange={handleMonthChange}
                celebration={celebration}
              />
            </section>

            <section className="order-2 min-w-0 scroll-mt-20 lg:order-none">
              <FinanceMonthlyInvestmentPlan
                month={month}
                entries={state.entries}
                plan={state.monthlyInvestmentPlan}
                onAddItems={addMonthlyPlanItems}
                onRemoveItem={removeMonthlyPlanItem}
                onSplitMergedItem={splitMergedMonthlyPlanItem}
                hasPreviousMonthPlan={hasPreviousMonthPlan}
                onCopyFromPreviousMonth={copyMonthlyPlanFromPreviousMonth}
              />
            </section>

            <section className="order-3 min-w-0 scroll-mt-20 lg:order-none lg:hidden">
              <FinanceMarketAlerts entries={state.entries} />
            </section>

            <section className="order-7 min-w-0 lg:order-none">
              <FinanceRecentInvestments
                month={month}
                investments={sortedMonthInvestments}
                onEdit={setEditingEntry}
                onRemove={removeEntry}
              />
            </section>

            <section className="order-8 min-w-0 lg:order-none">
              <FinanceTickerHistoryPanel entries={state.entries} />
            </section>
          </div>

          <aside className="finance-side-column">
            <section id="inversion" className="order-4 scroll-mt-24 min-w-0 lg:order-none">
              <FinanceEntryForm
                month={month}
                entries={state.entries}
                quickAmounts={preferences.quickAmounts}
                pendingPlanLabels={pendingPlanLabels}
                onAddEntry={handleAddEntry}
              />
            </section>

            <section className="order-3 hidden min-w-0 lg:order-none lg:block">
              <FinanceMarketAlerts entries={state.entries} />
            </section>

            <section className="order-5 min-w-0 lg:order-none">
              <FinanceMonthlyInsightPanel state={state} month={month} mission={mission} />
            </section>

            <section className="order-6 min-w-0 lg:order-none">
              <FinanceConcentrationPanel entries={state.entries} month={month} />
            </section>

            <section className="order-8 scroll-mt-20 lg:order-none">
              <FinanceOverviewPanel state={state} month={month} variant="compact" />
            </section>
          </aside>

          <div className="finance-advanced-section flex min-w-0 flex-col gap-2 sm:gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
          <details className="finance-details group open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
              Ver ruta de niveles
            </summary>
            <div className="px-3 pb-4 pt-3 sm:px-4">
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

          <details className="finance-details open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
              Ver objetivos
            </summary>
            <div className="px-3 pb-4 pt-3 sm:px-4">
              <FinanceGoals goals={state.goals} onAdd={addGoal} onUpdate={updateGoal} onRemove={removeGoal} />
            </div>
          </details>

          <details className="finance-details open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
              Avisos WhatsApp
            </summary>
            <div className="px-3 pb-4 pt-3 sm:px-4">
              <FinanceWhatsAppReminders state={state} onPreferencesChange={patchPreferences} />
            </div>
          </details>

          <details className="finance-details open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
              Montos rápidos
            </summary>
            <div className="px-3 pb-4 pt-3 sm:px-4">
              <FinanceQuickAmountsEditor preferences={preferences} onChange={patchPreferences} />
            </div>
          </details>

          <details className="finance-details open:pb-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
              Ajustes avanzados
            </summary>
            <div className="px-3 pb-4 pt-3 sm:px-4">
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

          <details className="finance-details open:pb-1 border-red-200 bg-red-50">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 text-sm font-bold text-red-800 [&::-webkit-details-marker]:hidden">
              Zona peligrosa
            </summary>
            <div className="border-t border-red-200 px-4 pb-4 pt-3">
              <p className="text-xs font-medium text-red-700">
                {isFinanceCloudConfigured()
                  ? 'Borrá todo en la nube y en este navegador. Exportá JSON antes si querés un archivo de respaldo.'
                  : 'Borrá todo en este navegador. Exportá o copiá el JSON antes si querés conservarlo.'}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-red-300 bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                onClick={clearAll}
              >
                Borrar todo
              </button>
            </div>
          </details>
          </div>
        </main>
          </>
        ) : null}
      </div>

      {cloudReady ? (
      <div className="finance-mobile-cta fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <a
          href="#inversion"
          className="finance-primary-button mx-auto flex min-h-[52px] max-w-lg items-center justify-center px-5 text-base shadow-sm active:scale-[0.99]"
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
