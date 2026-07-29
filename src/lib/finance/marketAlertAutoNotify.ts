import {
  buildMarketAlerts,
  marketAlertFingerprint,
  type MarketAlert,
} from '@/lib/finance/marketAlerts';
import {
  markMarketAlertsSent,
  normalizePreferences,
  whatsappAutomationReadiness,
} from '@/lib/finance/preferences';
import type { FinanceEntry, FinancePreferences, FinanceReminderSettings } from '@/lib/finance/types';
import type { FinancePricesMap } from '@/lib/finance/financePrices';
import { requestMarketWhatsAppTest } from '@/lib/finance/whatsappTestClient';

export type MarketAlertAutoNotifyResult =
  | { action: 'sent'; freshCount: number; fingerprints: string[] }
  | { action: 'pruned' }
  | { action: 'skipped'; reason: string }
  | { action: 'error'; message: string };

/** Evita doble envío si hay dos instancias UI (móvil + desktop) montadas a la vez. */
const claimedKeys = new Set<string>();
let lastHandledFreshKey = '';

function actionable(alerts: MarketAlert[]): MarketAlert[] {
  return alerts.filter((a) => a.kind !== 'neutral');
}

function fingerprintsOf(alerts: MarketAlert[]): string[] {
  return alerts.map(marketAlertFingerprint);
}

function freshKey(fingerprints: string[]): string {
  return [...fingerprints].sort().join('|');
}

export function getActionableMarketAlerts(
  entries: FinanceEntry[],
  prices: FinancePricesMap,
): MarketAlert[] {
  return actionable(buildMarketAlerts({ entries, prices }));
}

/**
 * Si hay alertas accionables nuevas (no en lastMarketAlertKeys), envía WhatsApp
 * y devuelve el reminder actualizado. Si no hay frescas, solo poda huellas inactivas.
 */
export async function syncMarketAlertsWhatsApp(params: {
  entries: FinanceEntry[];
  prices: FinancePricesMap;
  preferences: FinancePreferences;
  /** true = forzar reenvío de todas las alertas activas (botón manual). */
  force?: boolean;
}): Promise<{
  result: MarketAlertAutoNotifyResult;
  nextReminder?: FinanceReminderSettings;
}> {
  const prefs = normalizePreferences(params.preferences);
  const reminder = prefs.reminder;
  const readiness = whatsappAutomationReadiness(reminder);

  if (!reminder.marketWhatsAppEnabled) {
    return { result: { action: 'skipped', reason: 'market_disabled' } };
  }
  if (!readiness.apiKeyOk) {
    return { result: { action: 'skipped', reason: 'no_api_key' } };
  }

  const alerts = getActionableMarketAlerts(params.entries, params.prices);
  const activeFingerprints = fingerprintsOf(alerts);
  const sentSet = new Set(reminder.lastMarketAlertKeys ?? []);
  const fresh = params.force
    ? alerts
    : alerts.filter((alert) => !sentSet.has(marketAlertFingerprint(alert)));

  if (fresh.length === 0) {
    const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
    const changed =
      JSON.stringify(pruned.lastMarketAlertKeys ?? []) !==
      JSON.stringify(reminder.lastMarketAlertKeys ?? []);
    return {
      result: {
        action: changed ? 'pruned' : 'skipped',
        reason: alerts.length ? 'already_sent' : 'no_alerts',
      },
      nextReminder: changed ? pruned : undefined,
    };
  }

  const key = freshKey(fingerprintsOf(fresh));
  if (!params.force) {
    if (key === lastHandledFreshKey || claimedKeys.has(key)) {
      return { result: { action: 'skipped', reason: 'in_flight_or_done' } };
    }
    claimedKeys.add(key);
  }

  try {
    const send = await requestMarketWhatsAppTest(fresh);
    if (!send.ok) {
      return {
        result: { action: 'error', message: send.message },
      };
    }

    if (!params.force) lastHandledFreshKey = key;
    const freshKeys = fingerprintsOf(fresh);
    return {
      result: { action: 'sent', freshCount: fresh.length, fingerprints: freshKeys },
      nextReminder: markMarketAlertsSent(reminder, freshKeys, activeFingerprints),
    };
  } finally {
    if (!params.force) claimedKeys.delete(key);
  }
}
