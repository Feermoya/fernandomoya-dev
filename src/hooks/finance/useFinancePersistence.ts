import { assertFinanceSessionUser, FinanceAuthError } from '@/lib/finance/authClient';
import { markStateRevision, stateRevision } from '@/lib/finance/stateRevision';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import {
  getInitialFinanceState,
  markFinancePendingCloudPush,
  saveFinanceState,
  setFinanceLocalSavedAt,
  clearFinancePendingCloudPush,
} from '@/lib/finance/storage';
import {
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  upsertFinanceRemote,
} from '@/lib/finance/cloudSync';

type PersistenceOptions = {
  userId: string;
  /** Solo se escribe después de cargar el libro de esta sesión. */
  bookReadyRef: MutableRefObject<boolean>;
  onRemoteSaved?: (iso: string) => void;
  onRemoteError?: (message: string) => void;
  /** Red caída: datos locales ok, sync pendiente. */
  onRemoteOffline?: () => void;
  onSaving?: () => void;
  onSoloLocal?: () => void;
};

export function useFinancePersistence(options: PersistenceOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRemoteSave = useCallback((userId: string, next: FinanceState) => {
    if (!isFinanceCloudConfigured() || !userId) return;
    if (remoteTimer.current) clearTimeout(remoteTimer.current);
    const expectedUpdatedAt = stateRevision(next);
    remoteTimer.current = setTimeout(() => {
      remoteTimer.current = null;
      if (!optionsRef.current.bookReadyRef.current) return;
      if (optionsRef.current.userId !== userId) return;

      void assertFinanceSessionUser(userId)
        .then(() => upsertFinanceRemote(next, expectedUpdatedAt))
        .then((iso) => {
          setFinanceLocalSavedAt(userId, iso);
          clearFinancePendingCloudPush(userId);
          optionsRef.current.onRemoteSaved?.(iso);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist ok', { updated_at: iso });
          }
        })
        .catch((e: unknown) => {
          if (optionsRef.current.userId !== userId) return;
          if (e instanceof FinanceAuthError) return;
          if (isFinanceCloudNetworkError(e)) {
            markFinancePendingCloudPush(userId);
            optionsRef.current.onRemoteOffline?.();
            if (import.meta.env.DEV) {
              console.debug('[finance-sync] upsert persist offline');
            }
            return;
          }
          const msg = e instanceof Error ? e.message : 'Error al guardar en la nube.';
          optionsRef.current.onRemoteError?.(msg);
          if (import.meta.env.DEV) {
            console.debug('[finance-sync] upsert persist fail', { error: msg });
          }
        });
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
    };
  }, []);

  const persist = useCallback(
    (updater: (prev: FinanceState) => FinanceState) => {
      if (!optionsRef.current.bookReadyRef.current) return;
      const userId = optionsRef.current.userId;
      if (!userId) return;
      setState((prev) => {
        const next = updater(prev);
        const revision = stateRevision(prev);
        if (revision) markStateRevision(next, revision);
        saveFinanceState(userId, next);
        if (typeof window !== 'undefined' && isFinanceCloudConfigured()) {
          optionsRef.current.onSaving?.();
          scheduleRemoteSave(userId, next);
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
