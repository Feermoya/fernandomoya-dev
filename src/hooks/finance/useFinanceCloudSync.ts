import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  DEFAULT_FINANCE_SYNC_ID,
  clearFinancePendingCloudPush,
  getFinanceLocalSavedAt,
  getFinanceSyncId,
  isFinancePendingCloudPush,
  loadFinanceState,
  markFinancePendingCloudPush,
  resetFinanceSyncIdToDefault,
  saveFinanceState,
  setFinanceLocalSavedAt,
} from '@/lib/finance/storage';
import {
  FINANCE_CLOUD_UNREACHABLE_MESSAGE,
  FINANCE_OFFLINE_USER_MESSAGE,
  isBrowserOnline,
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  pingFinanceCloudKeepalive,
  upsertFinanceRemote,
} from '@/lib/finance/cloudSync';
import {
  emptyFinanceStateForCloudMiss,
  prepareFinanceCloudSession,
  pullCanonicalFromCloud,
} from '@/lib/finance/syncBootstrap';
import { isStandalonePwa } from '@/lib/finance/pwa';

export type FinanceSyncChip = 'loading' | 'synced' | 'saving' | 'error' | 'solo_local' | 'offline';

function initialSyncChip(): FinanceSyncChip {
  if (!isFinanceCloudConfigured()) return 'solo_local';
  if (typeof navigator !== 'undefined' && !isBrowserOnline()) return 'offline';
  return 'loading';
}

type Options = {
  stateRef: MutableRefObject<FinanceState>;
  setState: Dispatch<SetStateAction<FinanceState>>;
};

export function useFinanceCloudSync({ stateRef, setState }: Options) {
  const cloudOn = isFinanceCloudConfigured();

  const [cloudReady, setCloudReady] = useState(() => !cloudOn);
  const [syncChip, setSyncChip] = useState<FinanceSyncChip>(() => initialSyncChip());
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(null);
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(
    () => typeof navigator !== 'undefined' && !isBrowserOnline(),
  );
  const [syncIdTick, setSyncIdTick] = useState(0);

  const pullInFlight = useRef(false);
  const bootGenRef = useRef(0);
  const flushInFlight = useRef(false);

  const activeSyncId = useMemo(() => getFinanceSyncId(), [syncIdTick]);

  useEffect(() => {
    prepareFinanceCloudSession();
    setLastRemoteAt(getFinanceLocalSavedAt());
    /** Cada visita/recarga cuenta como actividad en Supabase (anti-pausa Free). */
    if (isFinanceCloudConfigured()) {
      void pingFinanceCloudKeepalive();
    }
  }, []);

  useEffect(() => {
    if (!isFinanceCloudConfigured()) return;

    const pulse = () => {
      if (document.visibilityState === 'visible') {
        void pingFinanceCloudKeepalive();
      }
    };

    document.addEventListener('visibilitychange', pulse);
    window.addEventListener('focus', pulse);
    return () => {
      document.removeEventListener('visibilitychange', pulse);
      window.removeEventListener('focus', pulse);
    };
  }, []);

  const applyCloudState = useCallback(
    (next: FinanceState, updatedAt: string) => {
      setState(next);
      saveFinanceState(next);
      setLastRemoteAt(updatedAt);
    },
    [setState],
  );

  const markOffline = useCallback((message = FINANCE_OFFLINE_USER_MESSAGE) => {
    setIsOfflineMode(true);
    setCloudErr(message);
    setSyncChip('offline');
  }, []);

  const markCloudUnreachable = useCallback((message = FINANCE_CLOUD_UNREACHABLE_MESSAGE) => {
    setIsOfflineMode(false);
    setCloudErr(message);
    setSyncChip('offline');
  }, []);

  const markCloudIssue = useCallback(
    (issue: 'offline' | 'unreachable' = 'unreachable', message?: string) => {
      if (issue === 'offline') {
        markOffline(message ?? FINANCE_OFFLINE_USER_MESSAGE);
      } else {
        markCloudUnreachable(message ?? FINANCE_CLOUD_UNREACHABLE_MESSAGE);
      }
    },
    [markCloudUnreachable, markOffline],
  );

  const clearSoftOffline = useCallback(() => {
    setIsOfflineMode(false);
    setCloudErr(null);
  }, []);

  const flushPendingCloudPush = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    if (!isFinancePendingCloudPush()) return;
    if (flushInFlight.current) return;
    flushInFlight.current = true;
    setSyncChip('saving');
    try {
      const iso = await upsertFinanceRemote(DEFAULT_FINANCE_SYNC_ID, stateRef.current);
      setFinanceLocalSavedAt(iso);
      setLastRemoteAt(iso);
      clearFinancePendingCloudPush();
      clearSoftOffline();
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pending push flushed', { updated_at: iso });
      }
    } catch (e) {
      if (isFinanceCloudNetworkError(e)) {
        markFinancePendingCloudPush();
        markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline');
      } else {
        const msg = e instanceof Error ? e.message : 'Error al subir.';
        setCloudErr(msg);
        setSyncChip('error');
      }
    } finally {
      flushInFlight.current = false;
    }
  }, [clearSoftOffline, markCloudIssue, stateRef]);

  const pullFromCloudImmediate = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    if (pullInFlight.current) return;
    pullInFlight.current = true;
    setSyncChip((prev) => (prev === 'loading' ? 'loading' : 'saving'));
    try {
      const result = await pullCanonicalFromCloud();
      if (result.ok) {
        applyCloudState(result.state, result.updatedAt);
        if (result.offline) {
          markCloudIssue(result.cloudIssue ?? 'unreachable', result.warning);
          return;
        }
        clearSoftOffline();
        setSyncChip('synced');
        if (result.warning) {
          setCloudErr(result.warning);
          setSyncChip('error');
        }
        await flushPendingCloudPush();
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] pull ok', { updated_at: result.updatedAt, warning: result.warning });
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
  }, [applyCloudState, clearSoftOffline, flushPendingCloudPush, markCloudIssue]);

  const handleForcePush = useCallback(async () => {
    if (!isFinanceCloudConfigured()) return;
    setSyncChip('saving');
    setCloudErr(null);
    try {
      const iso = await upsertFinanceRemote(DEFAULT_FINANCE_SYNC_ID, stateRef.current);
      setFinanceLocalSavedAt(iso);
      setLastRemoteAt(iso);
      clearFinancePendingCloudPush();
      clearSoftOffline();
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push ok', { syncId: DEFAULT_FINANCE_SYNC_ID, updated_at: iso });
      }
    } catch (e) {
      if (isFinanceCloudNetworkError(e)) {
        markFinancePendingCloudPush();
        markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline');
        return;
      }
      const msg = e instanceof Error ? e.message : 'Error al subir.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push fail', { syncId: DEFAULT_FINANCE_SYNC_ID, error: msg });
      }
      throw e;
    }
  }, [clearSoftOffline, markCloudIssue, stateRef]);

  const handleRefreshFromCloud = useCallback(() => {
    void pullFromCloudImmediate();
  }, [pullFromCloudImmediate]);

  const handleResetSyncIdToDefault = useCallback(() => {
    resetFinanceSyncIdToDefault();
    setSyncIdTick((n) => n + 1);
  }, []);

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
            online: isBrowserOnline(),
          });
        }

        /** Siempre intentar sync vía /api (same-origin). No abortar por navigator.onLine. */
        const result = await pullCanonicalFromCloud();
        if (gen !== bootGenRef.current) return;

        if (result.ok) {
          applyCloudState(result.state, result.updatedAt);
          if (result.offline) {
            markCloudIssue(result.cloudIssue ?? 'unreachable', result.warning);
            return;
          }
          clearSoftOffline();
          setSyncChip('synced');
          if (result.warning) {
            setCloudErr(result.warning);
            setSyncChip('error');
          }
          await flushPendingCloudPush();
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] boot ok', { updated_at: result.updatedAt, warning: result.warning });
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
        const local = loadFinanceState();
        applyCloudState(local, getFinanceLocalSavedAt() ?? new Date().toISOString());
      } finally {
        if (gen === bootGenRef.current) {
          setCloudReady(true);
        }
      }
    }

    void boot();
  }, [applyCloudState, clearSoftOffline, flushPendingCloudPush, markCloudIssue, syncIdTick]);

  useEffect(() => {
    if (!isFinanceCloudConfigured()) return;

    const onVis = () => {
      if (document.visibilityState === 'visible') void pullFromCloudImmediate();
    };
    const onFocus = () => {
      void pullFromCloudImmediate();
    };
    const onOnline = () => {
      setIsOfflineMode(false);
      void (async () => {
        await pullFromCloudImmediate();
        await flushPendingCloudPush();
      })();
    };
    const onOffline = () => {
      markCloudIssue('offline');
    };
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) void pullFromCloudImmediate();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [flushPendingCloudPush, markCloudIssue, pullFromCloudImmediate]);

  /** Reintento periódico (navegador y PWA): si Supabase vuelve, se reconecta solo.
   * Además, un pull liviano al mantener la pestaña abierta cuenta como actividad
   * (el Free de Supabase pausa ~7 días sin queries). El keep-alive de GitHub Actions
   * cubre las semanas en que no entres. */
  useEffect(() => {
    if (!isFinanceCloudConfigured() || !cloudReady) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void pullFromCloudImmediate();
    };
    const id = window.setInterval(tick, isStandalonePwa() ? 45_000 : 5 * 60_000);
    return () => clearInterval(id);
  }, [cloudReady, pullFromCloudImmediate]);

  return {
    cloudOn,
    cloudReady,
    syncChip,
    setSyncChip,
    lastRemoteAt,
    setLastRemoteAt,
    cloudErr,
    setCloudErr,
    isOfflineMode,
    activeSyncId,
    pullFromCloudImmediate,
    handleForcePush,
    handleRefreshFromCloud,
    handleResetSyncIdToDefault,
    applyCloudState,
    markOffline: () => markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline'),
    markPendingCloudPush: markFinancePendingCloudPush,
  };
}
