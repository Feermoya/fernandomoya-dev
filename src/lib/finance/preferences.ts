import { site } from '@/data/site';
import type { FinancePreferences, FinanceReminderSettings, FinanceState } from '@/lib/finance/types';

export const DEFAULT_QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

/** Ventana anti-spam del recordatorio de inversión (1 = días 1–3, 2 = 4–6, …). */
export const INVESTMENT_REMINDER_DAYS_PER_WINDOW = 3;

const DEFAULT_REMINDER_DAYS = [5, 15, 25];

export function getDefaultPreferences(): FinancePreferences {
  return {
    quickAmounts: [...DEFAULT_QUICK_AMOUNTS],
    reminder: {
      enabled: true,
      phoneDigits: site.social.whatsappPhoneDigits,
      daysOfMonth: [...DEFAULT_REMINDER_DAYS],
      marketWhatsAppEnabled: true,
    },
  };
}

export function normalizePreferences(raw?: FinancePreferences): FinancePreferences {
  const base = getDefaultPreferences();
  if (!raw) return base;

  const quickAmounts = Array.isArray(raw.quickAmounts)
    ? raw.quickAmounts.filter((n) => Number.isFinite(n) && n > 0).slice(0, 8)
    : base.quickAmounts;
  const reminder = raw.reminder ?? base.reminder;

  return {
    quickAmounts: quickAmounts.length > 0 ? quickAmounts : base.quickAmounts,
    reminder: {
      enabled: reminder.enabled !== false,
      phoneDigits: site.social.whatsappPhoneDigits,
      daysOfMonth: normalizeReminderDays(reminder.daysOfMonth),
      messageTemplate: undefined,
      callMeBotApiKey: reminder.callMeBotApiKey?.trim() || undefined,
      lastCronReminderKeys: Array.isArray(reminder.lastCronReminderKeys)
        ? reminder.lastCronReminderKeys.filter((k) => typeof k === 'string').slice(-36)
        : undefined,
      marketWhatsAppEnabled: reminder.marketWhatsAppEnabled !== false,
      lastMarketAlertKeys: Array.isArray(reminder.lastMarketAlertKeys)
        ? reminder.lastMarketAlertKeys.filter((k) => typeof k === 'string').slice(-64)
        : undefined,
      lastMarketAlertSentAt: normalizeSentAtMap(reminder.lastMarketAlertSentAt),
    },
  };
}

function normalizeSentAtMap(raw: unknown): Record<string, string> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && typeof v === 'string' && k && v) out[k] = v;
  }
  const entries = Object.entries(out).slice(-64);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function withPreferences(state: FinanceState): FinanceState {
  return {
    ...state,
    preferences: normalizePreferences(state.preferences),
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? [],
    portfolioHoldings: state.portfolioHoldings ?? [],
    monitorStatus: state.monitorStatus,
  };
}

function normalizeReminderDays(days: number[] | undefined): number[] {
  if (!Array.isArray(days) || days.length === 0) return [...DEFAULT_REMINDER_DAYS];
  const uniq = [...new Set(days.map((d) => Math.round(d)).filter((d) => d >= 1 && d <= 28))];
  return uniq.length > 0 ? uniq.sort((a, b) => a - b) : [...DEFAULT_REMINDER_DAYS];
}

/** Clave de ventana ~cada 3 días dentro del mes. */
export function cronReminderRunKey(monthKey: string, day: number): string {
  const window = Math.max(1, Math.ceil(day / INVESTMENT_REMINDER_DAYS_PER_WINDOW));
  return `${monthKey}-w${window}`;
}

export function markCronReminderSent(
  reminder: FinanceReminderSettings,
  runKey: string,
): FinanceReminderSettings {
  const keys = [...(reminder.lastCronReminderKeys ?? [])];
  if (!keys.includes(runKey)) keys.push(runKey);
  return {
    ...reminder,
    lastCronReminderKeys: keys.slice(-36),
  };
}

export function markMarketAlertsSent(
  reminder: FinanceReminderSettings,
  fingerprints: string[],
  activeFingerprints: string[],
): FinanceReminderSettings {
  const kept = (reminder.lastMarketAlertKeys ?? []).filter((key) => activeFingerprints.includes(key));
  const next = new Set(kept);
  for (const fp of fingerprints) next.add(fp);
  return {
    ...reminder,
    lastMarketAlertKeys: [...next].slice(-64),
  };
}

export function whatsappAutomationReadiness(reminder: FinanceReminderSettings): {
  phoneOk: boolean;
  apiKeyOk: boolean;
  anyJobEnabled: boolean;
  ready: boolean;
} {
  const phoneOk = site.social.whatsappPhoneDigits.replace(/\D/g, '').length >= 10;
  const apiKeyOk = Boolean(reminder.callMeBotApiKey?.trim());
  const anyJobEnabled = Boolean(reminder.enabled || reminder.marketWhatsAppEnabled);
  return {
    phoneOk,
    apiKeyOk,
    anyJobEnabled,
    ready: phoneOk && apiKeyOk && anyJobEnabled,
  };
}
