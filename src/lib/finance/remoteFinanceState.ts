import { site } from '@/data/site';
import { financeGameStateSelectUrl } from '@/lib/finance/postgrest';
import { DEFAULT_FINANCE_SYNC_ID, importFinanceState } from '@/lib/finance/storage';
import type { FinanceState } from '@/lib/finance/types';

const TABLE = 'finance_game_state';
const revisions = new WeakMap<FinanceState, string>();

export function phoneDigitsFromWaUrl(url: string): string {
  const m = url.match(/wa\.me\/(\d+)/i);
  return m?.[1] ?? '';
}

export function resolveWhatsAppPhone(_reminderPhone?: string): string {
  return site.social.whatsappPhoneDigits || phoneDigitsFromWaUrl(site.social.whatsapp);
}

function supabaseRestBase(): string | null {
  const url = (process.env.PUBLIC_FINANCE_SUPABASE_URL ?? process.env.FINANCE_SUPABASE_URL)?.replace(
    /\/$/,
    '',
  );
  if (!url) return null;
  return `${url}/rest/v1`;
}

function supabaseHeaders(): HeadersInit | null {
  const key = process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY ?? process.env.FINANCE_SUPABASE_ANON_KEY;
  if (!key?.trim()) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export function isFinanceRemoteConfigured(): boolean {
  return Boolean(supabaseRestBase() && supabaseHeaders());
}

export async function fetchFinanceStateRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
): Promise<FinanceState | null> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) return null;

  const res = await fetch(financeGameStateSelectUrl(base, syncId, 'body,updated_at'), {
    headers,
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Supabase read failed (${res.status})`);
  }
  const rows = (await res.json()) as { body: unknown; updated_at: string }[];
  if (!rows?.length) return null;
  const body = rows[0].body;
  const parsed = importFinanceState(typeof body === 'string' ? body : JSON.stringify(body));
  if (!parsed.ok) throw new Error(parsed.error);
  revisions.set(parsed.state, rows[0].updated_at);
  return parsed.state;
}

export async function upsertFinanceStateRemote(
  syncId: string,
  state: FinanceState,
  originalState: FinanceState,
): Promise<void> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) throw new Error('Supabase not configured');

  const revision = revisions.get(originalState);
  if (!revision) throw new Error('Missing remote revision');
  const res = await fetch(`${financeGameStateSelectUrl(base, syncId).replace('&limit=1', '')}&updated_at=eq.${encodeURIComponent(revision)}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ body: state }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Supabase write failed (${res.status}): ${t.slice(0, 120)}`);
  }
  const written = await res.json();
  if (!written?.length) throw new Error('Remote version conflict');
  revisions.set(originalState, written[0].updated_at);
}

/** Ping liviano para keep-alive del plan Free de Supabase. */
export async function pingFinanceRemote(syncId: string = DEFAULT_FINANCE_SYNC_ID): Promise<{
  ok: boolean;
  rows: number;
  error?: string;
  detail?: string;
}> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) {
    return { ok: false, rows: 0, error: 'Supabase no configurado en el hosting.' };
  }

  const res = await fetch(financeGameStateSelectUrl(base, syncId, 'id,updated_at'), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, rows: 0, error: `Supabase respondió ${res.status}`, detail: text.slice(0, 200) };
  }

  let rows = 0;
  try {
    const parsed = JSON.parse(text) as unknown;
    rows = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    rows = 0;
  }

  return { ok: true, rows };
}
