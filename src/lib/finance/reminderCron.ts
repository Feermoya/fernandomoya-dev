import { site } from '@/data/site';
import { getMonthlyInvested, needsMonthlyInvestmentReminder } from '@/lib/finance/calculations';
import { sendCallMeBotWhatsAppServer } from '@/lib/finance/callMeBotServer';
import {
  cronReminderRunKey,
  DEFAULT_REMINDER_MESSAGE,
  markCronReminderSent,
  normalizePreferences,
  reminderMessageForMonth,
} from '@/lib/finance/preferences';
import { DEFAULT_FINANCE_SYNC_ID, importFinanceState } from '@/lib/finance/storage';
import { getArgentinaDateParts, monthLabelEsFromKey } from '@/lib/finance/timezone';
import type { FinanceReminderSettings, FinanceState } from '@/lib/finance/types';

const TABLE = 'finance_game_state';

export function phoneDigitsFromWaUrl(url: string): string {
  const m = url.match(/wa\.me\/(\d+)/i);
  return m?.[1] ?? '';
}

export function resolveReminderPhone(reminderPhone: string): string {
  const fromPrefs = reminderPhone.replace(/\D/g, '');
  if (fromPrefs) return fromPrefs;
  const fromEnv = (process.env.FINANCE_REMINDER_PHONE ?? '').replace(/\D/g, '');
  if (fromEnv) return fromEnv;
  return site.social.whatsappPhoneDigits || phoneDigitsFromWaUrl(site.social.whatsapp);
}

function supabaseRestBase(): string | null {
  const url = (process.env.PUBLIC_FINANCE_SUPABASE_URL ?? process.env.FINANCE_SUPABASE_URL)?.replace(/\/$/, '');
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

export async function fetchFinanceStateRemote(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
): Promise<FinanceState | null> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) return null;

  const res = await fetch(
    `${base}/${TABLE}?id=eq.${encodeURIComponent(syncId)}&select=body&limit=1`,
    { headers, method: 'GET' },
  );
  if (!res.ok) {
    throw new Error(`Supabase read failed (${res.status})`);
  }
  const rows = (await res.json()) as { body: unknown }[];
  if (!rows?.length) return null;
  const body = rows[0].body;
  const parsed = importFinanceState(typeof body === 'string' ? body : JSON.stringify(body));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.state;
}

export async function upsertFinanceStateRemote(
  syncId: string,
  state: FinanceState,
): Promise<void> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) throw new Error('Supabase not configured');

  const res = await fetch(`${base}/${TABLE}`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify([{ id: syncId, body: state }]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Supabase write failed (${res.status}): ${t.slice(0, 120)}`);
  }
}

export function wasCronReminderSent(reminder: FinanceReminderSettings, runKey: string): boolean {
  return reminder.lastCronReminderKeys?.includes(runKey) ?? false;
}

export type CronReminderSkipReason =
  | 'supabase_not_configured'
  | 'callmebot_not_configured'
  | 'reminders_disabled'
  | 'not_scheduled_day'
  | 'investment_sufficient'
  | 'already_sent_today'
  | 'no_remote_state'
  | 'no_phone';

export type CronReminderResult = {
  ok: boolean;
  action: 'sent' | 'skipped' | 'error';
  skipReason?: CronReminderSkipReason;
  runKey?: string;
  callMeBotDetail?: string;
  invested?: number;
  error?: string;
};

export async function runFinanceReminderCron(): Promise<CronReminderResult> {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) {
    return { ok: true, action: 'skipped', skipReason: 'supabase_not_configured' };
  }

  const apiKey =
    process.env.CALLMEBOT_API_KEY?.trim() ||
    process.env.FINANCE_CALLMEBOT_API_KEY?.trim() ||
    '';
  if (!apiKey) {
    return { ok: true, action: 'skipped', skipReason: 'callmebot_not_configured' };
  }

  const { day, monthKey } = getArgentinaDateParts();
  const runKey = cronReminderRunKey(monthKey, day);

  let state: FinanceState | null;
  try {
    state = await fetchFinanceStateRemote();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    return { ok: false, action: 'error', error: msg };
  }

  if (!state) {
    return { ok: true, action: 'skipped', skipReason: 'no_remote_state', runKey };
  }

  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;

  const cronForced = process.env.FINANCE_REMINDER_CRON_ENABLED === '1';
  if (!reminder.enabled && !cronForced) {
    return { ok: true, action: 'skipped', skipReason: 'reminders_disabled', runKey };
  }

  if (!reminder.daysOfMonth.includes(day)) {
    return { ok: true, action: 'skipped', skipReason: 'not_scheduled_day', runKey };
  }

  const invested = getMonthlyInvested(state.entries, monthKey);
  if (!needsMonthlyInvestmentReminder(invested)) {
    return { ok: true, action: 'skipped', skipReason: 'investment_sufficient', runKey, invested };
  }

  if (wasCronReminderSent(reminder, runKey)) {
    return { ok: true, action: 'skipped', skipReason: 'already_sent_today', runKey, invested };
  }

  const phone = resolveReminderPhone(reminder.phoneDigits);
  if (!phone) {
    return { ok: true, action: 'skipped', skipReason: 'no_phone', runKey };
  }

  const message = reminderMessageForMonth(
    reminder.messageTemplate ?? DEFAULT_REMINDER_MESSAGE,
    monthLabelEsFromKey(monthKey),
    invested,
  );

  const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
  if (!send.ok) {
    return {
      ok: false,
      action: 'error',
      runKey,
      callMeBotDetail: send.detail,
      invested,
      error: 'CallMeBot rejected the message',
    };
  }

  const nextReminder = markCronReminderSent(reminder, runKey);
  const nextState: FinanceState = {
    ...state,
    preferences: { ...prefs, reminder: nextReminder },
  };

  try {
    await upsertFinanceStateRemote(DEFAULT_FINANCE_SYNC_ID, nextState);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upsert failed';
    return {
      ok: false,
      action: 'error',
      runKey,
      callMeBotDetail: send.detail,
      invested,
      error: `Sent but failed to save state: ${msg}`,
    };
  }

  return {
    ok: true,
    action: 'sent',
    runKey,
    callMeBotDetail: send.detail,
    invested,
  };
}
