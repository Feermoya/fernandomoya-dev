import { useCallback, useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  DEFAULT_FINANCE_SYNC_ID,
  getInitialFinanceState,
  markFinancePendingCloudPush,
  saveFinanceState,
  setFinanceLocalSavedAt,
  clearFinancePendingCloudPush,
} from '@/lib/finance/storage';
import {
  isBrowserOnline,
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  upsertFinanceRemote,
} from '@/lib/finance/cloudSync';

type PersistenceOptions = {
  onRemoteSaved?: (iso: string) => void;
  onRemoteError?: (message: string) => void;
  /** Red caída: datos locales ok, sync pendiente. */
  onRemoteOffline?: () => void;
  onSaving?: () => void;
  onSoloLocal?: () => void;
};

export function useFinancePersistence(options: PersistenceOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRemoteSave = useCallback((syncId: string, next: FinanceState) => {
    if (!isFinanceCloudConfigured()) return;
    if (remoteTimer.current) clearTimeout(remoteTimer.current);
    remoteTimer.current = setTimeout(() => {
      remoteTimer.current = null;

      if (!isBrowserOnline()) {
        markFinancePendingCloudPush();
        optionsRef.current.onRemoteOffline?.();
        return;
      }

      void upsertFinanceRemote(syncId, next)
        .then((iso) => {
          setFinanceLocalSavedAt(iso);
          clearFinancePendingCloudPush();
          optionsRef.current.onRemoteSaved?.(iso);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist ok', { syncId, updated_at: iso });
          }
        })
        .catch((e: unknown) => {
          if (isFinanceCloudNetworkError(e)) {
            markFinancePendingCloudPush();
            optionsRef.current.onRemoteOffline?.();
            if (import.meta.env.DEV) {
              console.debug('[finance-sync] upsert persist offline', { syncId });
            }
            return;
          }
          const msg = e instanceof Error ? e.message : 'Error al guardar en la nube.';
          optionsRef.current.onRemoteError?.(msg);
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
          optionsRef.current.onSaving?.();
          scheduleRemoteSave(DEFAULT_FINANCE_SYNC_ID, next);
        } else if (typeof window !== 'undefined') {
          optionsRef.current.onSoloLocal?.();
        }
        return next;
      });
    },
    [scheduleRemoteSave],
  );

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

  return {
    state,
    setState,
    stateRef,
    persist,
    replaceState,
    patchState,
  };
}
