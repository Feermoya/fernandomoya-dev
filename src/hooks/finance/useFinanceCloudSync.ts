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
  getFinanceLocalSavedAt,
  getFinanceSyncId,
  resetFinanceSyncIdToDefault,
  saveFinanceState,
  setFinanceLocalSavedAt,
} from '@/lib/finance/storage';
import { isFinanceCloudConfigured, upsertFinanceRemote } from '@/lib/finance/cloudSync';
import {
  emptyFinanceStateForCloudMiss,
  prepareFinanceCloudSession,
  pullCanonicalFromCloud,
} from '@/lib/finance/syncBootstrap';
import { isStandalonePwa } from '@/lib/finance/pwa';

export type FinanceSyncChip = 'loading' | 'synced' | 'saving' | 'error' | 'solo_local';

function initialSyncChip(): FinanceSyncChip {
  return isFinanceCloudConfigured() ? 'loading' : 'solo_local';
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
  const [syncIdTick, setSyncIdTick] = useState(0);

  const pullInFlight = useRef(false);
  const bootGenRef = useRef(0);

  const activeSyncId = useMemo(() => getFinanceSyncId(), [syncIdTick]);

  useEffect(() => {
    prepareFinanceCloudSession();
    setLastRemoteAt(getFinanceLocalSavedAt());
  }, []);

  const applyCloudState = useCallback(
    (next: FinanceState, updatedAt: string) => {
      setState(next);
      saveFinanceState(next);
      setLastRemoteAt(updatedAt);
      setCloudErr(null);
      setSyncChip('synced');
    },
    [setState],
  );

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
  }, [stateRef]);

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

  return {
    cloudOn,
    cloudReady,
    syncChip,
    setSyncChip,
    lastRemoteAt,
    setLastRemoteAt,
    cloudErr,
    setCloudErr,
    activeSyncId,
    pullFromCloudImmediate,
    handleForcePush,
    handleRefreshFromCloud,
    handleResetSyncIdToDefault,
    applyCloudState,
  };
}
