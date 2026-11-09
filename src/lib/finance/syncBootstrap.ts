import { assertFinanceSessionUser, FinanceAuthError } from '@/lib/finance/authClient';
import {
  fetchFinanceRemote,
  FinanceCloudHttpError,
  FINANCE_CLOUD_UNREACHABLE_MESSAGE,
  isFinanceCloudConfigured,
  isFinanceCloudNetworkError,
} from '@/lib/finance/cloudSync';
import { withPreferences } from '@/lib/finance/preferences';
import type { FinanceState } from '@/lib/finance/types';
import { clearLegacyFinanceCacheAfterCloudRead } from '@/lib/finance/storage';

export type CloudPullResult =
  | { ok: true; state: FinanceState; updatedAt: string; sourceId: string; migrated: boolean }
  | { ok: false; reason: 'not_configured' | 'empty' | 'error' | 'unauthorized' | 'unlinked'; message?: string };

/** No local finance book, version flags or fallback are needed for cloud-only access. */
export function prepareFinanceCloudSession(): void { /* session is managed by Supabase Auth */ }

function accessFailure(error: unknown): CloudPullResult | null {
  if (error instanceof FinanceAuthError) {
    return { ok: false, reason: error.status === 403 ? 'unlinked' : 'unauthorized', message: error.message };
  }
  if (error instanceof FinanceCloudHttpError) {
    if (error.status === 401) return { ok: false, reason: 'unauthorized', message: error.message };
    if (error.code === 'profile_missing' || error.code === 'book_missing' || error.status === 403) {
      return { ok: false, reason: 'unlinked', message: error.message };
    }
  }
  return null;
}

/** Reads only the Supabase book owned by the authenticated user. */
export async function pullSessionBook(userId: string): Promise<CloudPullResult> {
  if (!isFinanceCloudConfigured()) {
    return { ok: false, reason: 'not_configured', message: 'No se pudo configurar el acceso a la cuenta.' };
  }
  try {
    await assertFinanceSessionUser(userId);
    const remote = await fetchFinanceRemote();
    if (!remote) return { ok: false, reason: 'empty', message: 'Esta cuenta no tiene un libro financiero.' };
    const state = withPreferences(remote.state);
    // Clean up older device copies only after a verified Supabase read, and
    // never remove older offline drafts that are still flagged as unsynced.
    clearLegacyFinanceCacheAfterCloudRead(userId);
    return { ok: true, state, updatedAt: remote.updatedAt, sourceId: 'session', migrated: false };
  } catch (error) {
    const denied = accessFailure(error);
    if (denied) return denied;
    const message = isFinanceCloudNetworkError(error)
      ? FINANCE_CLOUD_UNREACHABLE_MESSAGE
      : error instanceof Error ? error.message : 'No se pudieron leer los datos.';
    return { ok: false, reason: 'error', message };
  }
}
