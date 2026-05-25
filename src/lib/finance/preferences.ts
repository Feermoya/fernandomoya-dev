import { site } from '@/data/site';
import type { FinancePreferences, FinanceReminderSettings, FinanceState } from '@/lib/finance/types';
import {
  formatARS,
  getMonthlyInvestmentReminderGap,
  MONTHLY_STREAK_MINIMUM_ARS,
  needsMonthlyInvestmentReminder,
} from '@/lib/finance/calculations';
import { getArgentinaDateParts } from '@/lib/finance/timezone';

export const DEFAULT_QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

export const DEFAULT_REMINDER_MESSAGE =
  'Foco financiero — {mes}: llevás {invertido} invertidos. Si podés, sumá para llegar al mínimo del mes ({falta} restantes).';

const DEFAULT_REMINDER_DAYS = [5, 15, 25];

export function getDefaultPreferences(): FinancePreferences {
  return {
    quickAmounts: [...DEFAULT_QUICK_AMOUNTS],
    reminder: {
      enabled: false,
      phoneDigits: site.social.whatsappPhoneDigits,
      daysOfMonth: [...DEFAULT_REMINDER_DAYS],
      messageTemplate: DEFAULT_REMINDER_MESSAGE,
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
      enabled: Boolean(reminder.enabled),
      phoneDigits: String(reminder.phoneDigits ?? '').replace(/\D/g, ''),
      daysOfMonth: normalizeReminderDays(reminder.daysOfMonth),
      callMeBotApiKey: reminder.callMeBotApiKey?.trim() || undefined,
      messageTemplate: reminder.messageTemplate?.trim() || DEFAULT_REMINDER_MESSAGE,
      lastAutoReminderMonth: reminder.lastAutoReminderMonth,
      lastCronReminderKeys: Array.isArray(reminder.lastCronReminderKeys)
        ? reminder.lastCronReminderKeys.filter((k) => typeof k === 'string').slice(-36)
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

export function cronReminderRunKey(monthKey: string, day: number): string {
  return `${monthKey}-${day}`;
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
    lastAutoReminderMonth: runKey.split('-').slice(0, 2).join('-'),
  };
}

export function buildWhatsAppLink(phoneDigits: string, text: string): string {
  const phone = phoneDigits.replace(/\D/g, '');
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** CallMeBot: registrate en callmebot.com y pegá tu API key. */
export async function sendCallMeBotWhatsApp(
  phoneDigits: string,
  text: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const phone = phoneDigits.replace(/\D/g, '');
  if (!phone || !apiKey.trim()) {
    return { ok: false, error: 'Falta teléfono o API key de CallMeBot.' };
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey.trim())}`;
    await fetch(url, { mode: 'no-cors' });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo enviar.';
    return { ok: false, error: msg };
  }
}

export function shouldShowInAppReminder(
  reminder: FinanceReminderSettings,
  investedThisMonth: number,
): boolean {
  if (!reminder.enabled) return false;
  if (!needsMonthlyInvestmentReminder(investedThisMonth)) return false;
  const { day, monthKey } = getArgentinaDateParts();
  if (!reminder.daysOfMonth.includes(day)) return false;
  const runKey = cronReminderRunKey(monthKey, day);
  if (reminder.lastCronReminderKeys?.includes(runKey)) return false;
  return true;
}

export function reminderMessageForMonth(
  template: string,
  monthLabel: string,
  invested: number,
  minimumArs: number = MONTHLY_STREAK_MINIMUM_ARS,
): string {
  const invertido =
    invested > 0 ? formatARS(invested) : '$0 (sin cargas de inversión este mes)';
  const falta = formatARS(getMonthlyInvestmentReminderGap(invested, minimumArs));
  return template
    .replaceAll('{mes}', monthLabel)
    .replaceAll('{invertido}', invertido)
    .replaceAll('{falta}', falta);
}

/** Texto corto para banner / UI según cuánto invertiste. */
export function reminderStatusLine(
  invested: number,
  minimumArs: number = MONTHLY_STREAK_MINIMUM_ARS,
): { title: string; detail: string } {
  if (invested <= 0) {
    return {
      title: 'Sin inversiones este mes',
      detail: `Todavía no cargaste nada. El mínimo del mes es ${formatARS(minimumArs)}.`,
    };
  }
  const gap = getMonthlyInvestmentReminderGap(invested, minimumArs);
  return {
    title: 'Invertiste poco este mes',
    detail: `Llevás ${formatARS(invested)}. Te faltan ${formatARS(gap)} para el mínimo (${formatARS(minimumArs)}).`,
  };
}
