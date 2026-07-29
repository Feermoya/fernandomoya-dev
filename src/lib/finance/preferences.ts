import { site } from '@/data/site';
import type { FinancePreferences, FinanceReminderSettings, FinanceState } from '@/lib/finance/types';
import { evaluateInvestmentWhatsAppNudge } from '@/lib/finance/levels';
import { getArgentinaDateParts } from '@/lib/finance/timezone';

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
      lastInAppReminderKeys: Array.isArray(reminder.lastInAppReminderKeys)
        ? reminder.lastInAppReminderKeys.filter((k) => typeof k === 'string').slice(-36)
        : undefined,
      marketWhatsAppEnabled: reminder.marketWhatsAppEnabled !== false,
      lastMarketAlertKeys: Array.isArray(reminder.lastMarketAlertKeys)
        ? reminder.lastMarketAlertKeys.filter((k) => typeof k === 'string').slice(-64)
        : undefined,
    },
  };
}

export function withPreferences(state: FinanceState): FinanceState {
  return {
    ...state,
    preferences: normalizePreferences(state.preferences),
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? [],
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

/** Solo oculta el banner; no cuenta como WhatsApp enviado. */
export function markInAppReminderDismissed(
  reminder: FinanceReminderSettings,
  runKey: string,
): FinanceReminderSettings {
  const keys = [...(reminder.lastInAppReminderKeys ?? [])];
  if (!keys.includes(runKey)) keys.push(runKey);
  return {
    ...reminder,
    lastInAppReminderKeys: keys.slice(-36),
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

/** Banner in-app alineado al motor de WhatsApp (dismiss propio, no bloquea cron). */
export function shouldShowInAppReminder(
  reminder: FinanceReminderSettings,
  state: FinanceState,
): boolean {
  if (!reminder.enabled) return false;
  const { day, monthKey } = getArgentinaDateParts();
  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  if (!nudge.shouldNotify) return false;
  const runKey = cronReminderRunKey(monthKey, day);
  if (reminder.lastInAppReminderKeys?.includes(runKey)) return false;
  return true;
}

export function reminderStatusLine(state: FinanceState): { title: string; detail: string } {
  const { monthKey } = getArgentinaDateParts();
  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  if (!nudge.shouldNotify) {
    return {
      title: 'Inversión del mes en buen ritmo',
      detail: 'No hace falta empujón por WhatsApp con el volumen actual.',
    };
  }
  if (nudge.kind === 'near_level') {
    return {
      title: `Cerca del nivel ${nudge.nextLevel}`,
      detail: nudge.message.split('\n').slice(1).join(' '),
    };
  }
  if (nudge.kind === 'low') {
    return {
      title: 'Poca inversión este mes',
      detail: nudge.message.split('\n').slice(1).join(' '),
    };
  }
  return {
    title: `Rumbo al nivel ${nudge.nextLevel}`,
    detail: nudge.message.split('\n').slice(1).join(' '),
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
