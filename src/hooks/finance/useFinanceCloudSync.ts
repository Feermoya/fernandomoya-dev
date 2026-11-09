import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { FinanceState } from '@/lib/finance/types';
import { markStateRevision } from '@/lib/finance/stateRevision';
import { isFinanceCloudConfigured, isFinanceCloudNetworkError, isBrowserOnline } from '@/lib/finance/cloudSync';
import { pullSessionBook } from '@/lib/finance/syncBootstrap';
import { isStandalonePwa } from '@/lib/finance/pwa';

export type FinanceSyncChip = 'loading' | 'synced' | 'saving' | 'error' | 'solo_local' | 'offline';

type Options = {
  userId: string;
  bookReadyRef: MutableRefObject<boolean>;
  pendingSaveRef: MutableRefObject<FinanceState | null>;
  stateRef: MutableRefObject<FinanceState>;
  setState: Dispatch<SetStateAction<FinanceState>>;
  onUnauthorized?: () => void;
};

/**
 * Financial data is read from Supabase, never from localStorage.
 * Pulls do not replace optimistic edits while a cloud write is outstanding.
 */
export function useFinanceCloudSync({userId, bookReadyRef, pendingSaveRef, setState, onUnauthorized}: Options) {
  const configured = isFinanceCloudConfigured();
  const [bookOpen, setBookOpen] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncChip, setSyncChip] = useState<FinanceSyncChip>('loading');
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(null);
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const bootGenRef = useRef(0);
  const readingRef = useRef(false);
  const ownerRef = useRef(userId);
  ownerRef.current = userId;
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;
  const resumeRef = useRef(0);

  const applyCloudState = useCallback((next: FinanceState, updatedAt: string) => {
    if (!ownerRef.current) return;
    if (pendingSaveRef.current) return; // Unsaved edits always win in this tab until confirmed.
    markStateRevision(next, updatedAt);
    bookReadyRef.current = true;
    setState(next);
    setBookOpen(true);
    setCloudErr(null);
    setLastRemoteAt(updatedAt);
    setSyncChip('synced');
  }, [bookReadyRef, pendingSaveRef, setState]);

  const pullFromCloudImmediate = useCallback(async () => {
    const owner = ownerRef.current;
    if (!configured || !owner || readingRef.current || pendingSaveRef.current) return;
    readingRef.current = true;
    try {
      const result = await pullSessionBook(owner);
      if (ownerRef.current !== owner) return;
      if (result.ok) {
        applyCloudState(result.state, result.updatedAt);
      } else {
        setCloudErr(result.message ?? 'No se pudo leer la cuenta. Reintentá.');
        setSyncChip(result.reason === 'error' ? 'offline' : 'error');
        if (result.reason === 'unauthorized') {
          bookReadyRef.current = false;
          setBookOpen(false);
          unauthorizedRef.current?.();
        }
      }
    } catch (error) {
      if (ownerRef.current !== owner) return;
      setCloudErr(error instanceof Error ? error.message : 'No se pudo conectar con Supabase.');
      setSyncChip(isFinanceCloudNetworkError(error) ? 'offline' : 'error');
    } finally {
      readingRef.current = false;
    }
  }, [applyCloudState, bookReadyRef, configured, pendingSaveRef]);

  useEffect(() => {
    const generation = ++bootGenRef.current;
    bookReadyRef.current = false;
    setBookOpen(false);
    setCloudReady(false);
    setCloudErr(null);
    setSyncChip('loading');
    if (!configured) {
      setCloudErr('No está configurada la conexión a Supabase.');
      setSyncChip('error');
      setCloudReady(true);
      return;
    }
    void (async () => {
      try { await pullFromCloudImmediate(); }
      finally { if (bootGenRef.current === generation) setCloudReady(true); }
    })();
    return () => { bootGenRef.current += 1; };
  }, [bookReadyRef, configured, pullFromCloudImmediate, userId]);

  useEffect(() => {
    if (!configured) return;
    const onResume = () => {
      if (document.visibilityState !== 'visible' || !bookReadyRef.current || pendingSaveRef.current) return;
      const now = Date.now();
      if (now - resumeRef.current < 30000) return;
      resumeRef.current = now;
      void pullFromCloudImmediate();
    };
    const onOnline = () => {
      if (!pendingSaveRef.current) void pullFromCloudImmediate();
    };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) onResume(); };
    const onOffline = () => {
      if (!isBrowserOnline()) {
        setCloudErr('No hay conexión. Las operaciones nuevas requieren Supabase.');
        setSyncChip('offline');
      }
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pageshow', onPageShow);
    const interval = window.setInterval(onResume, isStandalonePwa() ? 60000 : 5 * 60000);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pageshow', onPageShow);
      clearInterval(interval);
    };
  }, [bookReadyRef, configured, pendingSaveRef, pullFromCloudImmediate]);

  return {
    cloudOn: configured,
    bookOpen,
    cloudReady,
    syncChip,
    setSyncChip,
    lastRemoteAt,
    setLastRemoteAt,
    cloudErr,
    setCloudErr,
    pullFromCloudImmediate,
    applyCloudState,
    markOffline: () => {
      setCloudErr('No se pudieron guardar los cambios. No cierres hasta que se confirmen.');
      setSyncChip('offline');
    },
  };
}
