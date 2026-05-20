import type { FinanceState } from '@/lib/finance/types';
import { DEFAULT_FINANCE_SYNC_ID, importFinanceState } from '@/lib/finance/storage';

const TABLE = 'finance_game_state';

export function isFinanceCloudConfigured(): boolean {
  const url = import.meta.env.PUBLIC_FINANCE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url?.trim() && key?.trim());
}

function headersRead(): HeadersInit {
  const key = import.meta.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };
}

function headersWriteMinimal(): HeadersInit {
  return {
    ...headersRead(),
    'Content-Type': 'application/json',
  };
}

function restBase(): string {
  const url = (import.meta.env.PUBLIC_FINANCE_SUPABASE_URL as string).replace(/\/$/, '');
  return `${url}/rest/v1`;
}

export type RemoteFinanceRow = {
  state: FinanceState;
  updatedAt: string;
};

export async function fetchFinanceRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
  options?: { bustCache?: boolean },
): Promise<RemoteFinanceRow | null> {
  if (!isFinanceCloudConfigured()) return null;
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] fetch start', { syncId });
  }
  const cacheBust = options?.bustCache ? `&_=${Date.now()}` : '';
  const res = await fetch(
    `${restBase()}/${TABLE}?id=eq.${encodeURIComponent(syncId)}&select=body,updated_at&limit=1${cacheBust}`,
    {
      headers: {
        ...headersRead(),
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
      method: 'GET',
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch error', { syncId, status: res.status });
    }
    throw new Error(`Nube: lectura falló (${res.status}).`);
  }
  const rows = (await res.json()) as { body: unknown; updated_at: string }[];
  if (!rows?.length) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch empty row', { syncId });
    }
    return null;
  }
  const body = rows[0].body;
  const parsed = importFinanceState(typeof body === 'string' ? body : JSON.stringify(body));
  if (!parsed.ok) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch parse error', { syncId, error: parsed.error });
    }
    throw new Error(parsed.error);
  }
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] fetch ok', { syncId, updated_at: rows[0].updated_at });
  }
  return { state: parsed.state, updatedAt: rows[0].updated_at };
}

/**
 * Upsert sin `updated_at` en el cuerpo: lo fija el servidor (default + trigger en update).
 * Devuelve el `updated_at` de la fila devuelta por PostgREST.
 */
export async function upsertFinanceRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
  state: FinanceState,
): Promise<string> {
  if (!isFinanceCloudConfigured()) throw new Error('Nube no configurada');
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] upsert start', { syncId });
  }
  const res = await fetch(`${restBase()}/${TABLE}`, {
    method: 'POST',
    headers: {
      ...headersWriteMinimal(),
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify([{ id: syncId, body: state }]),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] upsert error', { syncId, status: res.status, body: t.slice(0, 200) });
    }
    throw new Error(`Nube: guardado falló (${res.status}). ${t.slice(0, 120)}`);
  }
  const rows = (await res.json()) as { updated_at?: string }[];
  const updatedAt = rows?.[0]?.updated_at;
  if (!updatedAt) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] upsert ok but missing updated_at in response', { syncId });
    }
    return new Date().toISOString();
  }
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] upsert ok', { syncId, updated_at: updatedAt });
  }
  return updatedAt;
}
