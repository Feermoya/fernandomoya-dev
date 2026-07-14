import type { FinanceState } from '@/lib/finance/types';
import { DEFAULT_FINANCE_SYNC_ID, importFinanceState } from '@/lib/finance/storage';

/**
 * Sync vía same-origin `/api/finance-cloud`.
 * El browser NO habla con supabase.co (Vercel sí → estable).
 */

export function isFinanceCloudConfigured(): boolean {
  const url = import.meta.env.PUBLIC_FINANCE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url?.trim() && key?.trim());
}

export type RemoteFinanceRow = {
  state: FinanceState;
  updatedAt: string;
};

export const FINANCE_OFFLINE_USER_MESSAGE =
  'Sin conexión a internet. Trabajás con los datos de este dispositivo. Al volver la red se sincroniza solo.';

export const FINANCE_CLOUD_UNREACHABLE_MESSAGE =
  'No se pudo sincronizar con la nube. Tus datos siguen en este dispositivo; se reintenta al recargar.';

export class FinanceCloudNetworkError extends Error {
  readonly kind: 'offline' | 'unreachable';

  constructor(
    message: string = FINANCE_CLOUD_UNREACHABLE_MESSAGE,
    kind: 'offline' | 'unreachable' = 'unreachable',
  ) {
    super(message);
    this.name = 'FinanceCloudNetworkError';
    this.kind = kind;
  }
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isFinanceCloudNetworkError(error: unknown): boolean {
  return error instanceof FinanceCloudNetworkError || isNetworkFetchError(error);
}

function isNetworkFetchError(error: unknown): boolean {
  if (error instanceof FinanceCloudNetworkError) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('internet') ||
      msg.includes('disconnected') ||
      msg.includes('offline') ||
      msg.includes('err_name_not_resolved') ||
      msg.includes('enotfound') ||
      msg.includes('err_internet_disconnected') ||
      msg.includes('err_network') ||
      msg.includes('err_connection')
    );
  }
  return false;
}

function cloudFetchErrorForContext(): FinanceCloudNetworkError {
  if (!isBrowserOnline()) {
    return new FinanceCloudNetworkError(FINANCE_OFFLINE_USER_MESSAGE, 'offline');
  }
  return new FinanceCloudNetworkError(FINANCE_CLOUD_UNREACHABLE_MESSAGE, 'unreachable');
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

function proxyReadUrl(syncId: string): string {
  return `/api/finance-cloud?id=${encodeURIComponent(syncId)}`;
}

/**
 * Siempre intenta el proxy same-origin (si la página cargó, suele funcionar).
 * No abortamos por navigator.onLine: es poco fiable y era la causa del falso “Sin conexión”.
 */
async function financeCloudFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] network error', { url, error });
    }
    throw cloudFetchErrorForContext();
  }
}

/** Ping vía API propia (Vercel → Supabase). */
export async function pingFinanceCloudKeepalive(
  _syncId: string = DEFAULT_FINANCE_SYNC_ID,
): Promise<boolean> {
  if (!isFinanceCloudConfigured()) return false;
  try {
    const res = await fetch('/api/finance-keepalive', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
    });
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] keepalive', { status: res.status, ok: res.ok });
    }
    return res.ok;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] keepalive fail', error);
    }
    return false;
  }
}

export async function fetchFinanceRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
): Promise<RemoteFinanceRow | null> {
  if (!isFinanceCloudConfigured()) return null;
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] fetch start', { syncId });
  }

  const res = await financeCloudFetch(proxyReadUrl(syncId), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch error', { syncId, status: res.status, detail });
    }
    if (res.status === 502 || res.status === 503 || res.status >= 500) {
      throw cloudFetchErrorForContext();
    }
    throw new Error(`Nube: lectura falló (${res.status}).${detail ? ` ${detail}` : ''}`);
  }

  const payload = (await res.json()) as {
    ok?: boolean;
    row?: { body: unknown; updated_at: string } | null;
    error?: string;
  };

  if (!payload.ok) {
    throw new Error(payload.error || 'Nube: lectura falló.');
  }

  if (!payload.row) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch empty row', { syncId });
    }
    return null;
  }

  const body = payload.row.body;
  const parsed = importFinanceState(typeof body === 'string' ? body : JSON.stringify(body));
  if (!parsed.ok) {
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] fetch parse error', { syncId, error: parsed.error });
    }
    throw new Error(parsed.error);
  }
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] fetch ok', { syncId, updated_at: payload.row.updated_at });
  }
  return { state: parsed.state, updatedAt: payload.row.updated_at };
}

export async function upsertFinanceRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
  state: FinanceState,
): Promise<string> {
  if (!isFinanceCloudConfigured()) throw new Error('Nube no configurada');
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] upsert start', { syncId });
  }

  const res = await financeCloudFetch('/api/finance-cloud', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: syncId, state }),
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    if (import.meta.env.DEV) {
      console.debug('[finance-sync] upsert error', { syncId, status: res.status, detail });
    }
    if (res.status === 502 || res.status === 503 || res.status >= 500) {
      throw cloudFetchErrorForContext();
    }
    throw new Error(`Nube: guardado falló (${res.status}). ${detail}`.trim());
  }

  const payload = (await res.json()) as { ok?: boolean; updated_at?: string; error?: string };
  if (!payload.ok) {
    throw new Error(payload.error || 'Nube: guardado falló.');
  }

  const updatedAt = payload.updated_at || new Date().toISOString();
  if (import.meta.env.DEV) {
    console.debug('[finance-sync] upsert ok', { syncId, updated_at: updatedAt });
  }
  return updatedAt;
}
