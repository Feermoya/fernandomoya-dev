import {
  fetchFinanceRemote,
  isFinanceCloudConfigured,
  upsertFinanceRemote,
  type RemoteFinanceRow,
} from '@/lib/finance/cloudSync';
import { withPreferences } from '@/lib/finance/preferences';
import type { FinanceState } from '@/lib/finance/types';
import {
  DEFAULT_FINANCE_SYNC_ID,
  captureLegacySyncId,
  ensureFinanceAppDataVersion,
  getInitialFinanceState,
  loadFinanceState,
  resetFinanceSyncIdToDefault,
  saveFinanceState,
  setFinanceLocalSavedAt,
  listCloudSyncCandidateIds,
} from '@/lib/finance/storage';

export type CloudPullResult =
  | { ok: true; state: FinanceState; updatedAt: string; sourceId: string; migrated: boolean }
  | { ok: false; reason: 'not_configured' | 'empty' | 'error'; message?: string };

function investmentCount(state: FinanceState): number {
  return state.entries.filter((e) => e.type === 'investment').length;
}

function hasMeaningfulData(state: FinanceState): boolean {
  return investmentCount(state) > 0 || state.entries.length > 0 || state.goals.length > 0;
}

function scoreRemote(row: RemoteFinanceRow): number {
  const inv = investmentCount(row.state);
  const ts = Date.parse(row.updatedAt) || 0;
  return inv * 1_000_000 + row.state.entries.length * 100 + (Number.isFinite(ts) ? ts / 1000 : 0);
}

async function fetchBestCloudRow(): Promise<{ id: string; remote: RemoteFinanceRow } | null> {
  const ids = listCloudSyncCandidateIds();
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const remote = await fetchFinanceRemote(id);
        return remote ? { id, remote } : null;
      } catch {
        return null;
      }
    }),
  );

  const rows = results.filter((r): r is { id: string; remote: RemoteFinanceRow } => r !== null);
  if (rows.length === 0) return null;

  let best = rows[0];
  for (const row of rows.slice(1)) {
    if (scoreRemote(row.remote) > scoreRemote(best.remote)) {
      best = row;
    }
  }
  return best;
}

/** Prepara sesión: versión + ID canónico (sin borrar datos locales). */
export function prepareFinanceCloudSession(): void {
  captureLegacySyncId();
  ensureFinanceAppDataVersion();
  resetFinanceSyncIdToDefault();
}

/**
 * Lee la mejor fila en Supabase (canónica + IDs viejos) y unifica en el libro principal.
 */
export async function pullCanonicalFromCloud(): Promise<CloudPullResult> {
  if (!isFinanceCloudConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  prepareFinanceCloudSession();

  try {
    const best = await fetchBestCloudRow();
    if (!best || !hasMeaningfulData(best.remote.state)) {
      const local = loadFinanceState();
      if (hasMeaningfulData(local)) {
        const state = withPreferences(local);
        saveFinanceState(state);
        return {
          ok: true,
          state,
          updatedAt: new Date().toISOString(),
          sourceId: 'local-cache',
          migrated: false,
        };
      }
      return { ok: false, reason: 'empty' };
    }

    let state = withPreferences(best.remote.state);
    let updatedAt = best.remote.updatedAt;
    let migrated = false;

    if (best.id !== DEFAULT_FINANCE_SYNC_ID && hasMeaningfulData(state)) {
      try {
        updatedAt = await upsertFinanceRemote(DEFAULT_FINANCE_SYNC_ID, state);
        migrated = true;
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] migrated legacy row to canonical', {
            from: best.id,
            to: DEFAULT_FINANCE_SYNC_ID,
          });
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.debug('[finance-sync] migrate to canonical failed', e);
        }
      }
    }

    saveFinanceState(state);
    setFinanceLocalSavedAt(updatedAt);
    return { ok: true, state, updatedAt, sourceId: best.id, migrated };
  } catch (e) {
    const local = loadFinanceState();
    if (hasMeaningfulData(local)) {
      const state = withPreferences(local);
      saveFinanceState(state);
      return {
        ok: true,
        state,
        updatedAt: new Date().toISOString(),
        sourceId: 'local-cache',
        migrated: false,
      };
    }
    const message = e instanceof Error ? e.message : 'Error al leer la nube.';
    return { ok: false, reason: 'error', message };
  }
}

export function emptyFinanceStateForCloudMiss(): FinanceState {
  return getInitialFinanceState();
}
