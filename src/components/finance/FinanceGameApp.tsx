import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Coins,
  Goal,
  Lock,
  LogOut,
} from 'lucide-react';
import type { FinanceEntry, FinanceGoal, FinanceState } from '@/lib/finance/types';
import {
  getCurrentMonthKey,
  hasManualMonthSelection,
  isValidMonthKey,
  markMonthManuallyChanged,
} from '@/lib/finance/monthNavigation';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { FinanceOverviewPanel } from '@/components/finance/FinanceOverviewPanel';
import { FinanceConcentrationPanel } from '@/components/finance/FinanceConcentrationPanel';
import { FinanceTickerHistoryPanel } from '@/components/finance/FinanceTickerHistoryPanel';
import { FinanceRecentInvestments } from '@/components/finance/FinanceRecentInvestments';
import { FinanceEntryLoadSummaryCard } from '@/components/finance/entry';
import { FinanceInstallHint } from '@/components/finance/FinanceInstallHint';
import { FinanceConfettiBurst } from '@/components/finance/FinanceConfettiBurst';
import { FinanceEntryEditModal } from '@/components/finance/FinanceEntryEditModal';
import { FinanceQuickAmountsEditor } from '@/components/finance/FinanceQuickAmountsEditor';
import { FinancePortfolioPanel } from '@/components/finance/portfolio';
import { FinanceToaster } from '@/components/finance/FinanceToaster';
import { FinanceDetailsSummary } from '@/components/finance/FinanceDetailsSummary';
import { formatARS, getEntriesByMonth } from '@/lib/finance/calculations';
import { normalizePreferences } from '@/lib/finance/preferences';
import type { FinancePreferences } from '@/lib/finance/types';
import { FinanceGoals } from '@/components/finance/FinanceGoals';
import { LevelUpOverlay } from '@/components/finance/LevelUpOverlay';
import { getMonthlyMissionView } from '@/lib/finance/levels';
import { useFinancePersistence } from '@/hooks/finance/useFinancePersistence';
import {
  useFinanceCloudSync,
  type FinanceSyncChip,
} from '@/hooks/finance/useFinanceCloudSync';
import { useFinanceMonthlyPlanActions } from '@/hooks/finance/useFinanceMonthlyPlanActions';
import { useFinanceCelebrations } from '@/hooks/finance/useFinanceCelebrations';
import { FocoPrimaryButton, FocoTabs, FOCO_ICON_STROKE } from '@/components/finance/ui';
import { FinanceWelcomeTour } from '@/components/finance/FinanceWelcomeTour';
import { sileo } from 'sileo';

// Reducir el JS inicial: estas funciones se descargan solo cuando se usan.
const FinanceInvestSheet = lazy(() => import('@/components/finance/FinanceInvestSheet').then(m => ({ default: m.FinanceInvestSheet })));
const FinanceBitcoinPanel = lazy(() => import('@/components/finance/bitcoin/FinanceBitcoinPanel').then(m => ({ default: m.FinanceBitcoinPanel })));
const FinanceMonthlyInvestmentPlan = lazy(() => import('@/components/finance/FinanceMonthlyInvestmentPlan').then(m => ({ default: m.FinanceMonthlyInvestmentPlan })));
const FinanceBalanzImporter = lazy(() => import('@/components/finance/FinanceBalanzImporter').then(m => ({ default: m.FinanceBalanzImporter })));
const FinanceInvestmentGrowthChart = lazy(() => import('@/components/finance/FinanceInvestmentGrowthChart').then(m => ({ default: m.FinanceInvestmentGrowthChart })));
const FinanceMarketVolatility = lazy(() => import('@/components/finance/FinanceMarketVolatility').then(m => ({ default: m.FinanceMarketVolatility })));

type FinanceAppSection = 'dashboard' | 'bitcoin';

type FinanceGameAppProps = {
  userId: string;
  email: string;
  onSignOut: () => void;
};

export default function FinanceGameApp({ userId, email, onSignOut }: FinanceGameAppProps) {
  const bookReadyRef = useRef(false);
  const cloudSyncRef = useRef<{
    setSyncChip: (value: FinanceSyncChip | ((prev: FinanceSyncChip) => FinanceSyncChip)) => void;
    setLastRemoteAt: (value: string | null) => void;
    setCloudErr: (value: string | null) => void;
    markOffline?: () => void;
  } | null>(null);

  const { state, setState, stateRef, persist, patchState } = useFinancePersistence({
    userId,
    bookReadyRef,
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
    bookOpen,
    cloudReady,
    syncChip,
    cloudErr,
    pullFromCloudImmediate,
    setSyncChip,
    setLastRemoteAt,
    setCloudErr,
    markOffline,
    applyCloudState,
  } = useFinanceCloudSync({ userId, bookReadyRef, stateRef, setState, onUnauthorized: onSignOut });

  cloudSyncRef.current = { setSyncChip, setLastRemoteAt, setCloudErr, markOffline };

  const {
    levelUp,
    celebration,
    confettiKey,
    loadSummary,
    dismissLevelUp,
    dismissLoadSummary,
    handleAddEntry,
  } = useFinanceCelebrations({ persist });

  const [balanzBusy, setBalanzBusy] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [section, setSection] = useState<FinanceAppSection>('dashboard');
  const [planVisited, setPlanVisited] = useState(false);
  const [balanzVisited, setBalanzVisited] = useState(false);

  const month = state.currentMonth;

  const {
    pendingPlanLabels,
    hasPreviousMonthPlan,
    addMonthlyPlanItems,
    copyMonthlyPlanFromPreviousMonth,
    removeMonthlyPlanItem,
    editMonthlyPlanItem,
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

  const sortedMonthInvestments = useMemo(() => {
    return [...monthEntries]
      .filter((e) => e.type === 'investment' || e.type === 'investment_sale')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [monthEntries]);

  const pendingPlanCount = pendingPlanLabels.length;

  const updateEntry = useCallback(
    (updated: FinanceEntry) => {
      persist((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === updated.id ? updated : e)),
      }));
      sileo.success({
        title: 'Cambios guardados',
        description: `La inversión fue actualizada · ${formatARS(updated.amount)}`,
      });
    },
    [persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));
      sileo.info({ title: 'Inversión eliminada' });
    },
    [persist],
  );

  const addGoal = useCallback(
    (goal: FinanceGoal) => {
      persist((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
      sileo.success({ title: 'Objetivo guardado' });
    },
    [persist],
  );

  const updateGoal = useCallback(
    (goal: FinanceGoal) => {
      persist((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
      }));
      sileo.success({ title: 'Objetivo actualizado' });
    },
    [persist],
  );

  const removeGoal = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
      sileo.info({ title: 'Objetivo eliminado' });
    },
    [persist],
  );

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
    <div
      inert={balanzBusy}
      aria-busy={balanzBusy}
      className="finance-app-shell relative isolate min-w-0 overflow-x-hidden sm:pt-2"
    >
      <FinanceToaster />
      <div className="finance-page-container relative z-[1] mx-auto min-w-0 px-4 pb-4 pt-0 sm:px-5 sm:py-6 lg:px-6">
        {cloudErr && cloudReady && (syncChip === 'error' || syncChip === 'offline') ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3" role="alert">
            <p className="min-w-0 flex-1 text-xs font-semibold text-amber-950">
              No se pudieron confirmar los últimos cambios. {cloudErr}
            </p>
            <button type="button" onClick={() => {
              void sileo.promise(pullFromCloudImmediate(), {
                loading: { title: 'Reintentando conexión…' },
                success: { title: 'Datos actualizados' },
                error: { title: 'No se pudo actualizar', description: 'Revisá la conexión y reintentá.' },
              });
            }} className="min-h-10 shrink-0 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900">
              Reintentar
            </button>
          </div>
        ) : null}

        <header className="finance-app-header mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
          <div className="flex min-w-0 items-start gap-3">
            <img src="/foco/icon-192.png" width="48" height="48" alt=""
              className="h-12 w-12 shrink-0 rounded-2xl shadow-sm" />
            <div className="min-w-0">
              <h1 className="finance-brand-title">Foco financiero</h1>
              <p className="finance-brand-sub mt-1">Inversión mensual con claridad</p>
              <p className="mt-1 max-w-[16rem] truncate text-xs font-semibold text-[var(--text-muted)]">{email}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <a
              href="/admin"
              className="foco-chip foco-chip--neutral"
              aria-label="Admin"
            >
              <Lock size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
              Admin
            </a>
            <FinanceInstallHint variant="button" />
            <button type="button" className="foco-chip foco-chip--neutral" onClick={onSignOut}>
              <LogOut size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
              Salir
            </button>
          </div>
        </header>

        {bookOpen ? (
          <div className="mb-4">
            <FocoTabs
              aria-label="Secciones de Foco financiero"
              value={section}
              onChange={(id) => { if (cloudReady) setSection(id as FinanceAppSection); }}
              items={[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'bitcoin', label: 'Bitcoin' },
              ]}
            />
          </div>
        ) : null}

        {!cloudReady ? (
          <div
            className="mb-4 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-8"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-black text-blue-900">Sincronizando con la nube…</p>
            <p className="max-w-xs text-center text-xs font-semibold text-blue-800">
              Traemos siempre los últimos datos guardados. Si tarda, revisá la conexión.
            </p>
          </div>
        ) : null}

        {bookOpen && section === 'bitcoin' ? (
          <div inert={!cloudReady}>
            <Suspense fallback={<p className="p-5 text-sm font-semibold text-slate-600" role="status">Abriendo Bitcoin…</p>}>
              <FinanceBitcoinPanel
                entries={state.entries}
                holdings={state.portfolioHoldings ?? []}
                bitcoin={state.bitcoin}
                onChange={(bitcoin) => persist((prev) => ({ ...prev, bitcoin }))}
              />
            </Suspense>
          </div>
        ) : null}

        {bookOpen && section === 'dashboard' ? (
          <>
            {isEmpty ? (
              <div className="finance-card-compact mb-4 p-4">
                <p className="finance-label">Primer paso</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  Tu primera carga desbloquea el tablero del mes.
                </p>
              </div>
            ) : null}

            <main className="finance-page-grid" inert={!cloudReady} aria-busy={!cloudReady}>
              <section
                id="dashboard-financiero"
                className="order-1 scroll-mt-20 lg:col-span-2 lg:order-none"
              >
                <FinanceDashboard
                  state={state}
                  mission={mission}
                  onMonthChange={handleMonthChange}
                  celebration={celebration}
                  hasPersonalTarget={Boolean(state.monthlyInvestmentTargets?.[month])}
                  onMonthTargetChange={(value) => persist(prev => {
                    const nextTargets = { ...(prev.monthlyInvestmentTargets ?? {}) };
                    if (value === null) delete nextTargets[month];
                    else nextTargets[month] = value;
                    return { ...prev, monthlyInvestmentTargets: nextTargets };
                  })}
                />
              </section>

              <section className="order-2 min-w-0 lg:col-span-2 lg:order-none">
                <Suspense fallback={<div role="status" className="h-40 animate-pulse rounded-2xl bg-blue-50" aria-label="Preparando la evolución histórica" />}>
                  <FinanceInvestmentGrowthChart entries={state.entries} throughMonth={month} />
                </Suspense>
              </section>

              <section className="order-3 min-w-0 lg:order-none">
                <Suspense fallback={<div role="status" className="h-40 animate-pulse rounded-2xl bg-slate-50" aria-label="Consultando volatilidad" />}>
                  <FinanceMarketVolatility />
                </Suspense>
              </section>

              <section className="order-4 min-w-0 lg:order-none">
                <FinanceConcentrationPanel entries={state.entries} month={month} />
              </section>

              <section className="order-5 scroll-mt-20 lg:order-none">
                <FinanceOverviewPanel state={state} month={month} variant="compact" />
              </section>

              <section className="order-6 min-w-0 lg:order-none">
                <FinanceRecentInvestments
                  month={month}
                  investments={sortedMonthInvestments}
                  onEdit={setEditingEntry}
                  onRemove={removeEntry}
                />
              </section>

              <section className="order-7 min-w-0 lg:order-none">
                <FinancePortfolioPanel
                  holdings={state.portfolioHoldings ?? []}
                  onChange={(portfolioHoldings) =>
                    persist((prev) => ({ ...prev, portfolioHoldings }))
                  }
                />
              </section>

              <section className="order-8 min-w-0 lg:col-span-2 lg:order-none">
                <FinanceTickerHistoryPanel entries={state.entries} />
              </section>

              <section className="order-9 min-w-0 scroll-mt-20 lg:col-span-2 lg:order-none">
                <details className="finance-details group open:pb-1"
                  onToggle={(event) => { if (event.currentTarget.open) setPlanVisited(true); }}>
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-bold text-slate-900">Plan del mes</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black tabular-nums text-slate-700">
                      {pendingPlanCount > 0
                        ? `${pendingPlanCount} pendiente${pendingPlanCount === 1 ? '' : 's'}`
                        : 'Sin pendientes'}
                    </span>
                  </summary>
                  {planVisited ? (
                    <div className="border-t border-slate-100 p-2 sm:p-3">
                      <Suspense fallback={<p role="status" className="p-3 text-xs text-slate-500">Abriendo plan…</p>}>
                        <FinanceMonthlyInvestmentPlan
                          embedded
                          month={month}
                          entries={state.entries}
                          plan={state.monthlyInvestmentPlan}
                          onAddItems={addMonthlyPlanItems}
                          onRemoveItem={removeMonthlyPlanItem}
                          onEditItem={editMonthlyPlanItem}
                          onSplitMergedItem={splitMergedMonthlyPlanItem}
                          hasPreviousMonthPlan={hasPreviousMonthPlan}
                          onCopyFromPreviousMonth={copyMonthlyPlanFromPreviousMonth}
                        />
                      </Suspense>
                    </div>
                  ) : null}
                </details>
              </section>

              <div className="finance-advanced-section flex min-w-0 flex-col gap-2 sm:gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
                <details className="finance-details open:pb-1" data-tour="goals">
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <FinanceDetailsSummary icon={Goal} label="Objetivos" />
                  </summary>
                  <div className="px-3 pb-4 pt-3 sm:px-4">
                    <FinanceGoals
                      goals={state.goals}
                      onAdd={addGoal}
                      onUpdate={updateGoal}
                      onRemove={removeGoal}
                    />
                  </div>
                </details>

                <details className="finance-details open:pb-1">
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <FinanceDetailsSummary icon={Coins} label="Montos rápidos" />
                  </summary>
                  <div className="px-3 pb-4 pt-3 sm:px-4">
                    <FinanceQuickAmountsEditor
                      preferences={preferences}
                      onChange={patchPreferences}
                    />
                  </div>
                </details>

                <details className="finance-details order-last open:pb-1 lg:col-span-2"
                  onToggle={(event) => { if (event.currentTarget.open) setBalanzVisited(true); }}>
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-bold text-slate-700">Importar PDF de Balanz</span>
                  </summary>
                  {balanzVisited ? (
                    <div className="border-t border-slate-100 px-3 pb-4 pt-3 sm:px-4">
                      <Suspense fallback={<p role="status" className="p-3 text-xs text-slate-500">Abriendo importador…</p>}>
                        <FinanceBalanzImporter
                          onBusyChange={setBalanzBusy}
                          disabled={!cloudReady || syncChip !== 'synced'}
                          onImported={(next, iso) => {
                            applyCloudState(next, iso);
                            setLastRemoteAt(iso);
                            setSyncChip('synced');
                            setCloudErr(null);
                          }}
                        />
                      </Suspense>
                    </div>
                  ) : null}
                </details>
              </div>
            </main>
          </>
        ) : null}
      </div>

      {bookOpen && cloudReady && section === 'dashboard' && !investOpen ? (
        <div className="finance-mobile-cta fixed inset-x-0 bottom-0 z-40">
          <FocoPrimaryButton
            data-tour="invest"
            onClick={() => setInvestOpen(true)}
            className="mx-auto w-full max-w-lg"
          >
            Cargar inversión
          </FocoPrimaryButton>
        </div>
      ) : null}

      {bookOpen && loadSummary && !investOpen ? (
        <div className="finance-load-toast fixed inset-x-0 z-50 px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[min(100%,22rem)] lg:px-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
          <FinanceEntryLoadSummaryCard summary={loadSummary} onDismiss={dismissLoadSummary} />
        </div>
      ) : null}

      {investOpen && bookOpen && cloudReady ? (
        <Suspense fallback={<p role="status" className="p-3 text-xs text-slate-600">Abriendo formulario…</p>}>
          <FinanceInvestSheet
            open
            month={month}
            entries={state.entries}
            quickAmounts={preferences.quickAmounts}
            pendingPlanLabels={pendingPlanLabels}
            onAddEntry={handleAddEntry}
            onClose={() => setInvestOpen(false)}
          />
        </Suspense>
      ) : null}

      {bookOpen && cloudReady && section === 'dashboard' && !investOpen ? <FinanceWelcomeTour userId={userId} /> : null}

      {confettiKey > 0 ? <FinanceConfettiBurst burstKey={confettiKey} /> : null}

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
