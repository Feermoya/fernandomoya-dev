import type { FinanceState } from '@/lib/finance/types';
import { financeGameStateSelectUrl } from '@/lib/finance/postgrest';
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

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= 200) return trimmed;
    return `${trimmed.slice(0, 200)}…`;
  } catch {
    return '';
  }
}

export type RemoteFinanceRow = {
  state: FinanceState;
  updatedAt: string;
};

export async function fetchFinanceRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
): Promise<RemoteFinanceRow | null> {
  if (!isFinanceCloudConfigured()) return null;
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] fetch start', { syncId });
  }

  const url = financeGameStateSelectUrl(restBase(), syncId);

  const res = await fetch(url, {
    headers: {
      ...headersRead(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch error', { syncId, status: res.status, detail, url });
    }
    const suffix = detail ? ` ${detail}` : '';
    throw new Error(`Nube: lectura falló (${res.status}).${suffix}`);
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
    const detail = await readErrorDetail(res);
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] upsert error', { syncId, status: res.status, detail });
    }
    throw new Error(`Nube: guardado falló (${res.status}). ${detail}`.trim());
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
