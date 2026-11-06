import { assertFinanceSessionUser, FinanceAuthError } from '@/lib/finance/authClient';
import {
  fetchFinanceRemote,
  FinanceCloudHttpError,
  FINANCE_CLOUD_UNREACHABLE_MESSAGE,
  FINANCE_OFFLINE_USER_MESSAGE,
  FinanceCloudNetworkError,
  isBrowserOnline,
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
  type RemoteFinanceRow,
} from '@/lib/finance/cloudSync';
import { withPreferences } from '@/lib/finance/preferences';
import type { FinanceState } from '@/lib/finance/types';
import {
  ensureFinanceAppDataVersion,
  getFinanceLocalSavedAt,
  loadFinanceState,
  saveFinanceState,
  setFinanceLocalSavedAt,
} from '@/lib/finance/storage';

export type CloudPullResult =
  | {
      ok: true;
      state: FinanceState;
      updatedAt: string;
      sourceId: string;
      migrated: boolean;
      offline?: boolean;
      cloudIssue?: 'offline' | 'unreachable';
      warning?: string;
    }
  | {
      ok: false;
      reason: 'not_configured' | 'empty' | 'error' | 'unauthorized' | 'unlinked';
      message?: string;
    };

/** Prepara la versión de la app. No elige ni reescribe el id del libro. */
export function prepareFinanceCloudSession(): void {
  ensureFinanceAppDataVersion();
}

function accessFailure(error: unknown): CloudPullResult | null {
  if (error instanceof FinanceAuthError) {
    return {
      ok: false,
      reason: error.status === 403 ? 'unlinked' : 'unauthorized',
      message: error.message,
    };
  }
  if (error instanceof FinanceCloudHttpError) {
    if (error.status === 401) {
      return { ok: false, reason: 'unauthorized', message: error.message };
    }
    if (error.code === 'profile_missing' || error.code === 'book_missing' || error.status === 403) {
      return { ok: false, reason: 'unlinked', message: error.message };
    }
  }
  return null;
}

/**
 * Lee únicamente el libro de la sesión. No consulta la fila canónica ni la legacy,
 * y no copia un documento dentro de otra cuenta.
 */
export async function pullSessionBook(userId: string): Promise<CloudPullResult> {
  if (!isFinanceCloudConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  prepareFinanceCloudSession();

  try {
    await assertFinanceSessionUser(userId);
    const remote: RemoteFinanceRow | null = await fetchFinanceRemote();
    if (!remote) {
      return { ok: false, reason: 'empty', message: 'Esta cuenta no tiene un libro financiero.' };
    }
    const state = withPreferences(remote.state);
    saveFinanceState(userId, state);
    setFinanceLocalSavedAt(userId, remote.updatedAt);
    return { ok: true, state, updatedAt: remote.updatedAt, sourceId: 'session', migrated: false };
  } catch (e) {
    const denied = accessFailure(e);
    if (denied) return denied;

    const local = loadFinanceState(userId);
    const isNetwork = e instanceof FinanceCloudNetworkError || isFinanceCloudNetworkError(e);
    if (isNetwork && local) {
      const state = withPreferences(local);
      saveFinanceState(userId, state);
      const cloudIssue =
        e instanceof FinanceCloudNetworkError
          ? e.kind
          : isBrowserOnline()
            ? 'unreachable'
            : 'offline';
      const warning =
        e instanceof FinanceCloudNetworkError
          ? e.message
          : cloudIssue === 'offline'
            ? FINANCE_OFFLINE_USER_MESSAGE
            : FINANCE_CLOUD_UNREACHABLE_MESSAGE;
      return {
        ok: true,
        state,
        updatedAt: getFinanceLocalSavedAt(userId) ?? new Date().toISOString(),
        sourceId: 'local-cache',
        migrated: false,
        offline: true,
        cloudIssue,
        warning,
      };
    }

    if (isNetwork) {
      return {
        ok: false,
        reason: 'error',
        message: e instanceof FinanceCloudNetworkError ? e.message : FINANCE_CLOUD_UNREACHABLE_MESSAGE,
      };
    }

    const message = e instanceof Error ? e.message : 'Error al leer la nube.';
    return { ok: false, reason: 'error', message };
  }
}
