import type { FinanceState } from '@/lib/finance/types';
import { importFinanceState } from '@/lib/finance/storage';

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

function headersWrite(): HeadersInit {
  return {
    ...headersRead(),
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
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

export async function fetchFinanceRemote(syncId: string): Promise<RemoteFinanceRow | null> {
  if (!isFinanceCloudConfigured()) return null;
  const res = await fetch(
    `${restBase()}/${TABLE}?id=eq.${encodeURIComponent(syncId)}&select=body,updated_at&limit=1`,
    { headers: headersRead(), method: 'GET' },
  );
  if (!res.ok) {
    throw new Error(`Nube: lectura falló (${res.status}).`);
  }
  const rows = (await res.json()) as { body: unknown; updated_at: string }[];
  if (!rows?.length) return null;
  const body = rows[0].body;
  const parsed = importFinanceState(typeof body === 'string' ? body : JSON.stringify(body));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return { state: parsed.state, updatedAt: rows[0].updated_at };
}

export async function upsertFinanceRemote(syncId: string, state: FinanceState): Promise<string> {
  if (!isFinanceCloudConfigured()) throw new Error('Nube no configurada');
  const updated_at = new Date().toISOString();
  const res = await fetch(`${restBase()}/${TABLE}`, {
    method: 'POST',
    headers: {
      ...headersWrite(),
      Prefer: 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify([{ id: syncId, body: state, updated_at }]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Nube: guardado falló (${res.status}). ${t.slice(0, 120)}`);
  }
  return updated_at;
}
