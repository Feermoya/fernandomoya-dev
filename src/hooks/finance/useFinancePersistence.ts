import { useCallback, useRef, useState } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  DEFAULT_FINANCE_SYNC_ID,
  getInitialFinanceState,
  saveFinanceState,
  setFinanceLocalSavedAt,
} from '@/lib/finance/storage';
import { isFinanceCloudConfigured, upsertFinanceRemote } from '@/lib/finance/cloudSync';

type PersistenceOptions = {
  onRemoteSaved?: (iso: string) => void;
  onRemoteError?: (message: string) => void;
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
      void upsertFinanceRemote(syncId, next)
        .then((iso) => {
          setFinanceLocalSavedAt(iso);
          optionsRef.current.onRemoteSaved?.(iso);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist ok', { syncId, updated_at: iso });
          }
        })
        .catch((e: unknown) => {
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
