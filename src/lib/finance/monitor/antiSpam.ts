/**
 * Anti-spam / fingerprints compartidos entre UI, cron y monitor.
 */

import {
  marketAlertFingerprint,
  type MarketAlert,
} from '@/lib/finance/marketAlerts';
import { markMarketAlertsSent } from '@/lib/finance/preferences';
import type { FinanceReminderSettings } from '@/lib/finance/types';

/** Enfriamiento mínimo entre reenvíos de la misma huella (oscilación cerca del umbral). */
export const MONITOR_FINGERPRINT_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/** ¿La huella está en cooldown por envío reciente? */
export function isFingerprintInCooldown(
  reminder: FinanceReminderSettings,
  fingerprint: string,
  nowMs: number,
  cooldownMs: number = MONITOR_FINGERPRINT_COOLDOWN_MS,
): boolean {
  const map = reminder.lastMarketAlertSentAt;
  if (!map || typeof map !== 'object') return false;
  const raw = map[fingerprint];
  if (typeof raw !== 'string') return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  return nowMs - t < cooldownMs;
}

/**
 * Compatibilidad: `kind:TICKER` y `kind:TICKER:USD` cuentan como la misma alerta
 * si el sufijo de moneda coincide con la alerta actual o falta en el stored.
 */
export function fingerprintAlreadySent(
  sentKeys: Iterable<string>,
  alert: Pick<MarketAlert, 'kind' | 'ticker' | 'currentCurrency' | 'buyCurrency'>,
): boolean {
  const set = sentKeys instanceof Set ? sentKeys : new Set(sentKeys);
  const primary = marketAlertFingerprint(alert);
  if (set.has(primary)) return true;

  const ticker = alert.ticker.toUpperCase();
  const legacy = `${alert.kind}:${ticker}`;
  if (set.has(legacy)) return true;

  const cur = (alert.currentCurrency || alert.buyCurrency || '').toUpperCase();
  if (cur && set.has(`${alert.kind}:${ticker}:${cur}`)) return true;

  return false;
}

export function markMarketAlertsSentWithCooldown(
  reminder: FinanceReminderSettings,
  fingerprints: string[],
  activeFingerprints: string[],
  sentAtIso: string,
): FinanceReminderSettings {
  const base = markMarketAlertsSent(reminder, fingerprints, activeFingerprints);
  const prev = { ...(reminder.lastMarketAlertSentAt ?? {}) };
  for (const fp of fingerprints) {
    prev[fp] = sentAtIso;
  }
  const keep = new Set([...(base.lastMarketAlertKeys ?? []), ...fingerprints]);
  const nextAt: Record<string, string> = {};
  for (const [k, v] of Object.entries(prev)) {
    if (keep.has(k) || fingerprints.includes(k)) nextAt[k] = v;
  }
  const entries = Object.entries(nextAt).slice(-64);
  return {
    ...base,
    lastMarketAlertSentAt: Object.fromEntries(entries),
  };
}
