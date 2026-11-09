import { assertFinanceSessionUser, FinanceAuthError } from '@/lib/finance/authClient';
import { markStateRevision } from '@/lib/finance/stateRevision';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  clearFinancePendingCloudPush,
  isFinancePendingCloudPush,
  markFinancePendingCloudPush,
  saveFinanceState,
  loadFinanceState,
  setFinanceLocalSavedAt,
} from '@/lib/finance/storage';
import {
  FINANCE_CLOUD_UNREACHABLE_MESSAGE,
  FINANCE_OFFLINE_USER_MESSAGE,
  isBrowserOnline,
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  upsertFinanceRemote,
} from '@/lib/finance/cloudSync';
import { prepareFinanceCloudSession, pullSessionBook } from '@/lib/finance/syncBootstrap';
import { isStandalonePwa } from '@/lib/finance/pwa';

export type FinanceSyncChip = 'loading' | 'synced' | 'saving' | 'error' | 'solo_local' | 'offline';

function initialSyncChip(): FinanceSyncChip {
  if (!isFinanceCloudConfigured()) return 'solo_local';
  if (typeof navigator !== 'undefined' && !isBrowserOnline()) return 'offline';
  return 'loading';
}

type Options = {
  userId: string;
  bookReadyRef: MutableRefObject<boolean>;
  stateRef: MutableRefObject<FinanceState>;
  setState: Dispatch<SetStateAction<FinanceState>>;
  onUnauthorized?: () => void;
};

export function useFinanceCloudSync({ userId, bookReadyRef, stateRef, setState, onUnauthorized }: Options) {
  const cloudOn = isFinanceCloudConfigured();

  const [bookOpen, setBookOpen] = useState(false);
  const [cloudReady, setCloudReady] = useState(() => !cloudOn);
  const [syncChip, setSyncChip] = useState<FinanceSyncChip>(() => initialSyncChip());
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(null);
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(
    () => typeof navigator !== 'undefined' && !isBrowserOnline(),
  );
  const pullInFlight = useRef(false);
  const bootGenRef = useRef(0);
  const flushInFlight = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;
  const lastResumePullRef = useRef(0);

  useEffect(() => {
    prepareFinanceCloudSession();
    setLastRemoteAt(null);
  }, []);

  const applyCloudState = useCallback(
    (next: FinanceState, updatedAt: string) => {
      const owner = userIdRef.current;
      if (!owner) return;
      markStateRevision(next, updatedAt);
      bookReadyRef.current = true;
      setBookOpen(true);
      setState(next);
      saveFinanceState(owner, next);
      setLastRemoteAt(updatedAt);
    },
    [bookReadyRef, setState],
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

  const rejectBook = useCallback(
    (message: string, reason: 'unauthorized' | 'unlinked' | 'error') => {
      bookReadyRef.current = false;
      setBookOpen(false);
      setCloudErr(message);
      setSyncChip('error');
      if (reason === 'unauthorized') onUnauthorizedRef.current?.();
    },
    [bookReadyRef],
  );

  const flushPendingCloudPush = useCallback(async () => {
    const owner = userIdRef.current;
    if (!isFinanceCloudConfigured() || !owner || !bookReadyRef.current) return;
    if (!isFinancePendingCloudPush(owner)) return;
    if (flushInFlight.current) return;
    flushInFlight.current = true;
    setSyncChip('saving');
    try {
      await assertFinanceSessionUser(owner);
      const iso = await upsertFinanceRemote(stateRef.current);
      if (userIdRef.current !== owner) return;
      setFinanceLocalSavedAt(owner, iso);
      setLastRemoteAt(iso);
      clearFinancePendingCloudPush(owner);
      clearSoftOffline();
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pending push flushed', { updated_at: iso });
      }
    } catch (e) {
      if (e instanceof FinanceAuthError || userIdRef.current !== owner) return;
      if (isFinanceCloudNetworkError(e)) {
        markFinancePendingCloudPush(owner);
        markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline');
      } else {
        const msg = e instanceof Error ? e.message : 'Error al subir.';
        setCloudErr(msg);
        setSyncChip('error');
      }
    } finally {
      flushInFlight.current = false;
    }
  }, [bookReadyRef, clearSoftOffline, markCloudIssue, stateRef]);

  const pullFromCloudImmediate = useCallback(async () => {
    const owner = userIdRef.current;
    if (!isFinanceCloudConfigured() || !owner) return;
    if (pullInFlight.current) return;
    pullInFlight.current = true;
    setSyncChip((prev) => (prev === 'loading' ? 'loading' : 'saving'));
    try {
      const result = await pullSessionBook(owner);
      if (userIdRef.current !== owner) return;
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
      rejectBook(result.message ?? 'No se pudo leer tu cuenta.', result.reason === 'unauthorized' ? 'unauthorized' : result.reason === 'unlinked' || result.reason === 'empty' ? 'unlinked' : 'error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] pull failed', result.message);
      }
      throw new Error(result.message ?? 'No se pudo leer tu cuenta.');
    } finally {
      pullInFlight.current = false;
    }
  }, [applyCloudState, clearSoftOffline, flushPendingCloudPush, markCloudIssue, rejectBook]);

  const handleForcePush = useCallback(async () => {
    const owner = userIdRef.current;
    if (!isFinanceCloudConfigured() || !owner || !bookReadyRef.current) return;
    setSyncChip('saving');
    setCloudErr(null);
    try {
      await assertFinanceSessionUser(owner);
      const iso = await upsertFinanceRemote(stateRef.current);
      if (userIdRef.current !== owner) return;
      setFinanceLocalSavedAt(owner, iso);
      setLastRemoteAt(iso);
      clearFinancePendingCloudPush(owner);
      clearSoftOffline();
      setSyncChip('synced');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push ok', { updated_at: iso });
      }
    } catch (e) {
      if (e instanceof FinanceAuthError || userIdRef.current !== owner) return;
      if (isFinanceCloudNetworkError(e)) {
        markFinancePendingCloudPush(owner);
        markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline');
        return;
      }
      const msg = e instanceof Error ? e.message : 'Error al subir.';
      setCloudErr(msg);
      setSyncChip('error');
      if (import.meta.env.DEV) {
        console.debug('[finance-sync] force push fail', { error: msg });
      }
      throw e;
    }
  }, [bookReadyRef, clearSoftOffline, markCloudIssue, stateRef]);

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
    bookReadyRef.current = false;
    setCloudReady(false);
    setSyncChip('loading');
    setCloudErr(null);

    // Mostrar el caché privado de esta cuenta mientras se comprueba la nube.
    // Nunca habilitar escrituras antes de obtener el libro remoto.
    const cached = loadFinanceState(userId);
    if (cached) {
      setState(cached);
      setBookOpen(true);
    }

    async function boot() {
      try {
        const owner = userIdRef.current;
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] boot start', {
            pwa: isStandalonePwa(),
            online: isBrowserOnline(),
          });
        }

        const result = await pullSessionBook(owner);
        if (gen !== bootGenRef.current || userIdRef.current !== owner) return;

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

        bookReadyRef.current = false;
        setBookOpen(false);
        setCloudErr(result.message ?? 'No se pudo leer tu cuenta.');
        setSyncChip('error');
        if (result.reason === 'unauthorized') onUnauthorizedRef.current?.();
      } catch (error) {
        if (gen !== bootGenRef.current) return;
        setBookOpen(false);
        setCloudErr(error instanceof Error ? error.message : 'No se pudo abrir tu cuenta.');
        setSyncChip('error');
      } finally {
        if (gen === bootGenRef.current) {
          setCloudReady(true);
        }
      }
    }

    void boot();
  }, [applyCloudState, bookReadyRef, clearSoftOffline, flushPendingCloudPush, markCloudIssue, userId, setState]);

  useEffect(() => {
    if (!isFinanceCloudConfigured()) return;

    const onResume = () => {
      if (document.visibilityState !== 'visible' || !bookReadyRef.current) return;
      const now = Date.now();
      if (now - lastResumePullRef.current < 30_000) return;
      lastResumePullRef.current = now;
      void pullFromCloudImmediate();
    };
    const onVis = onResume;
    const onFocus = onResume;
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
      if (ev.persisted) onResume();
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
      if (document.visibilityState !== 'visible' || !bookReadyRef.current) return;
      void pullFromCloudImmediate();
    };
    const id = window.setInterval(tick, isStandalonePwa() ? 45_000 : 5 * 60_000);
    return () => clearInterval(id);
  }, [cloudReady, pullFromCloudImmediate]);

  return {
    cloudOn,
    bookOpen,
    cloudReady,
    syncChip,
    setSyncChip,
    lastRemoteAt,
    setLastRemoteAt,
    cloudErr,
    setCloudErr,
    isOfflineMode,
    pullFromCloudImmediate,
    handleForcePush,
    handleRefreshFromCloud,
    applyCloudState,
    markOffline: () => markCloudIssue(isBrowserOnline() ? 'unreachable' : 'offline'),
    markPendingCloudPush: markFinancePendingCloudPush,
  };
}
