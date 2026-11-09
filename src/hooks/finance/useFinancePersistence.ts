import { assertFinanceSessionUser, FinanceAuthError } from '@/lib/finance/authClient';
import { markStateRevision, stateRevision } from '@/lib/finance/stateRevision';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { getInitialFinanceState } from '@/lib/finance/storage';
import {
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  upsertFinanceRemote,
} from '@/lib/finance/cloudSync';

type PersistenceOptions = {
  userId: string;
  bookReadyRef: MutableRefObject<boolean>;
  onRemoteSaved?: (iso: string) => void;
  onRemoteError?: (message: string) => void;
  onRemoteOffline?: () => void;
  onSaving?: () => void;
  onSoloLocal?: () => void;
};

/**
 * Supabase is the sole persistent store for financial data.
 * Drafts remain in React memory while a write is in flight. Never silently
 * report a failed write as saved. The beforeunload guard warns about drafts.
 */
export function useFinancePersistence(options: PersistenceOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const pendingSaveRef = useRef<FinanceState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const saveRef = useRef<() => Promise<boolean>>(async () => false);
  const scheduleRef = useRef<(delay: number) => void>(() => undefined);

  const flushRemoteSave = useCallback(async (): Promise<boolean> => {
    if (savingRef.current || !pendingSaveRef.current) return false;
    const userId = optionsRef.current.userId;
    if (!userId || !isFinanceCloudConfigured() || !optionsRef.current.bookReadyRef.current) {
      return false;
    }

    const snapshot = pendingSaveRef.current;
    savingRef.current = true;
    let success = false;
    let retryable = false;
    try {
      await assertFinanceSessionUser(userId);
      if (optionsRef.current.userId !== userId) return false;
      const updatedAt = await upsertFinanceRemote(snapshot, stateRevision(snapshot));
      if (optionsRef.current.userId !== userId) return false;
      success = true;
      if (pendingSaveRef.current === snapshot) {
        pendingSaveRef.current = null;
        optionsRef.current.onRemoteSaved?.(updatedAt);
      } else if (pendingSaveRef.current) {
        // A second edit was queued while the first one was being saved.
        markStateRevision(pendingSaveRef.current, updatedAt);
        optionsRef.current.onSaving?.();
      }
    } catch (error) {
      if (optionsRef.current.userId !== userId) return false;
      retryable = isFinanceCloudNetworkError(error);
      if (retryable) {
        optionsRef.current.onRemoteOffline?.();
      } else {
        const message = error instanceof FinanceAuthError
          ? 'La sesión expiró. Volvé a ingresar antes de registrar nuevas inversiones.'
          : error instanceof Error ? error.message : 'No se pudo guardar el movimiento.';
        optionsRef.current.onRemoteError?.(message);
      }
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current && optionsRef.current.userId === userId) {
        if (success) scheduleRef.current(0);
        else if (retryable) scheduleRef.current(15000);
      }
    }
    return success;
  }, []);

  saveRef.current = flushRemoteSave;

  const schedule = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, delay);
  }, []);

  scheduleRef.current = schedule;

  const persist = useCallback((updater: (prev: FinanceState) => FinanceState) => {
    const owner = optionsRef.current.userId;
    if (!owner || !optionsRef.current.bookReadyRef.current || !isFinanceCloudConfigured()) return;
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      const revision = stateRevision(prev);
      if (revision) markStateRevision(next, revision);
      pendingSaveRef.current = next;
      optionsRef.current.onSaving?.();
      schedule(300);
      return next;
    });
  }, [schedule]);

  const retryPendingSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!pendingSaveRef.current) return true;
    return flushRemoteSave();
  }, [flushRemoteSave]);

  useEffect(() => {
    const warnOnClose = (event: BeforeUnloadEvent) => {
      if (!pendingSaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const retryOnReconnect = () => {
      if (pendingSaveRef.current) void saveRef.current();
    };
    window.addEventListener('beforeunload', warnOnClose);
    window.addEventListener('online', retryOnReconnect);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeunload', warnOnClose);
      window.removeEventListener('online', retryOnReconnect);
    };
  }, []);

  const replaceState = useCallback((next: FinanceState) => persist(() => next), [persist]);
  const patchState = useCallback((partial: Partial<FinanceState>) => {
    persist(prev => ({ ...prev, ...partial }));
  }, [persist]);

  return { state, setState, stateRef, persist, replaceState, patchState, pendingSaveRef, retryPendingSave };
}
