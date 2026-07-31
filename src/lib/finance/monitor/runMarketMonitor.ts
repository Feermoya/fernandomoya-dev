/**
 * Monitor automático de precios + alertas WhatsApp (compartido UI / cron / Actions).
 */

import { randomUUID } from 'node:crypto';
import { sendCallMeBotWhatsAppServer } from '@/lib/finance/callMeBotServer';
import { buildFinancePricesResponse } from '@/lib/finance/financePricesServer';
import {
  buildMarketAlerts,
  marketAlertFingerprint,
  type MarketAlert,
} from '@/lib/finance/marketAlerts';
import { filterTickersForMarketHours } from '@/lib/finance/monitor/marketHours';
import {
  normalizeMonitorStatus,
  type FinanceMonitorStatus,
} from '@/lib/finance/monitor/status';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import {
  markMarketAlertsSent,
  normalizePreferences,
} from '@/lib/finance/preferences';
import {
  fetchFinanceStateRemote,
  isFinanceRemoteConfigured,
  resolveWhatsAppPhone,
  upsertFinanceStateRemote,
} from '@/lib/finance/remoteFinanceState';
import { DEFAULT_FINANCE_SYNC_ID } from '@/lib/finance/storage';
import type { FinanceReminderSettings, FinanceState } from '@/lib/finance/types';
import { formatMarketWhatsAppMessage } from '@/lib/finance/whatsappCopy';
import {
  fingerprintAlreadySent,
  isFingerprintInCooldown,
  markMarketAlertsSentWithCooldown,
  MONITOR_FINGERPRINT_COOLDOWN_MS,
} from '@/lib/finance/monitor/antiSpam';

/** Máx. símbolos por consulta al proveedor (alineado a normalizeFinanceTickers). */
export const MONITOR_BATCH_SIZE = 30;

export { MONITOR_FINGERPRINT_COOLDOWN_MS };

/** Máx. alertas en un mensaje WhatsApp (el motor ya corta a 4). */
export const MONITOR_MAX_ALERTS_IN_MESSAGE = 4;

function resolveCallMeBotApiKey(reminder?: FinanceReminderSettings): string {
  return (
    reminder?.callMeBotApiKey?.trim() ||
    process.env.CALLMEBOT_API_KEY?.trim() ||
    process.env.FINANCE_CALLMEBOT_API_KEY?.trim() ||
    ''
  );
}

export type MarketMonitorMode = 'check' | 'send';

export type MarketMonitorRunOptions = {
  syncId?: string;
  /** check = no envía WA; send = envía novedades. */
  mode?: MarketMonitorMode;
  /** Ignora fingerprints (solo útil en pruebas controladas). */
  force?: boolean;
  /** Persistir fingerprints + monitorStatus en Supabase. */
  persist?: boolean;
  /** Forzar consulta aunque el mercado esté cerrado (UI). */
  ignoreMarketHours?: boolean;
  now?: Date;
};

export type MarketMonitorSummary = {
  ok: boolean;
  runId: string;
  checkedAt: string;
  mode: MarketMonitorMode;
  symbolsRequested: number;
  symbolsResolved: number;
  symbolsSkippedHours: number;
  alertsDetected: number;
  alertsSent: number;
  alertsSkipped: number;
  durationMs: number;
  skipReason?: string;
  errorCode?: string;
  /** Solo en check: cuántas se enviarían. */
  wouldSend?: number;
};

let monitorLock: string | null = null;

function actionableMarketAlerts(alerts: MarketAlert[]): MarketAlert[] {
  return alerts.filter((a) => a.kind !== 'neutral');
}

function prioritizeAlerts(alerts: MarketAlert[]): MarketAlert[] {
  return alerts.slice(0, MONITOR_MAX_ALERTS_IN_MESSAGE);
}

async function fetchPricesInBatches(tickers: string[]): Promise<{
  prices: Awaited<ReturnType<typeof buildFinancePricesResponse>>['prices'];
  resolved: number;
  ok: boolean;
  error?: string;
}> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const merged: Awaited<ReturnType<typeof buildFinancePricesResponse>>['prices'] = {};
  let anyOk = false;
  let lastError: string | undefined;

  for (let i = 0; i < unique.length; i += MONITOR_BATCH_SIZE) {
    const batch = unique.slice(i, i + MONITOR_BATCH_SIZE);
    const res = await buildFinancePricesResponse(batch.join(','));
    if (res.ok) anyOk = true;
    else lastError = res.error;
    Object.assign(merged, res.prices);
  }

  const resolved = Object.values(merged).filter(
    (p) => p && typeof p.price === 'number' && p.price > 0 && p.source !== 'missing',
  ).length;

  return { prices: merged, resolved, ok: anyOk || unique.length === 0, error: lastError };
}

function buildStatusPatch(
  prev: FinanceMonitorStatus | undefined,
  summary: MarketMonitorSummary,
): FinanceMonitorStatus {
  const base = normalizeMonitorStatus(prev);
  const next: FinanceMonitorStatus = {
    ...base,
    lastRunAt: summary.checkedAt,
    lastSymbolsRequested: summary.symbolsRequested,
    lastSymbolsResolved: summary.symbolsResolved,
    lastAlertsDetected: summary.alertsDetected,
    lastAlertsSent: summary.alertsSent,
    lastDurationMs: summary.durationMs,
  };
  if (summary.ok && !summary.errorCode) {
    next.lastSuccessfulRunAt = summary.checkedAt;
    next.lastErrorAt = undefined;
    next.lastErrorCode = undefined;
    next.lastSkipReason = summary.skipReason;
  } else if (summary.errorCode) {
    next.lastErrorAt = summary.checkedAt;
    next.lastErrorCode = summary.errorCode;
    next.lastSkipReason = summary.skipReason;
  } else if (summary.skipReason) {
    next.lastSkipReason = summary.skipReason;
  }
  return next;
}

/**
 * Ejecuta una pasada del monitor. Toda la lógica financiera vive aquí;
 * GitHub Actions solo dispara el endpoint HTTP.
 */
export async function runFinanceMarketMonitor(
  options: MarketMonitorRunOptions = {},
): Promise<MarketMonitorSummary> {
  const started = Date.now();
  const runId = randomUUID();
  const checkedAt = (options.now ?? new Date()).toISOString();
  const mode: MarketMonitorMode = options.mode === 'send' ? 'send' : 'check';
  const syncId = options.syncId ?? DEFAULT_FINANCE_SYNC_ID;
  const persist = options.persist !== false;
  const force = Boolean(options.force);
  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  const fail = (
    errorCode: string,
    skipReason?: string,
    extra: Partial<MarketMonitorSummary> = {},
  ): MarketMonitorSummary => ({
    ok: false,
    runId,
    checkedAt,
    mode,
    symbolsRequested: 0,
    symbolsResolved: 0,
    symbolsSkippedHours: 0,
    alertsDetected: 0,
    alertsSent: 0,
    alertsSkipped: 0,
    durationMs: Date.now() - started,
    errorCode,
    skipReason,
    ...extra,
  });

  if (monitorLock) {
    return fail('overlap', 'execution_overlap');
  }
  monitorLock = runId;

  try {
    if (!isFinanceRemoteConfigured()) {
      return fail('supabase_not_configured', 'supabase_not_configured');
    }

    let state: FinanceState | null;
    try {
      state = await fetchFinanceStateRemote(syncId);
    } catch {
      return fail('supabase_fetch_failed', 'supabase_unavailable');
    }

    if (!state) {
      return {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: 'no_remote_state',
      };
    }

    const prefs = normalizePreferences(state.preferences);
    let reminder = prefs.reminder;

    if (!force && !reminder.marketWhatsAppEnabled) {
      const summary: MarketMonitorSummary = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: 'market_disabled',
      };
      if (persist) {
        const nextState: FinanceState = {
          ...state,
          monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          preferences: { ...prefs, reminder },
        };
        try {
          await upsertFinanceStateRemote(syncId, nextState);
        } catch {
          /* status best-effort */
        }
      }
      return summary;
    }

    const holdings = state.portfolioHoldings ?? [];
    const allTickers = getTrackedTickersFromPortfolio(state.entries, holdings);

    if (allTickers.length === 0) {
      const summary: MarketMonitorSummary = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: 'no_tickers',
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    const hours = options.ignoreMarketHours
      ? { fetch: allTickers, skipped: [] as { ticker: string; reason: string }[] }
      : filterTickersForMarketHours(allTickers, now);

    if (hours.fetch.length === 0) {
      const summary: MarketMonitorSummary = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: allTickers.length,
        symbolsResolved: 0,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: 'market_closed',
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    const priceBundle = await fetchPricesInBatches(hours.fetch);
    if (!priceBundle.ok && hours.fetch.length > 0) {
      const summary = fail('prices_unavailable', 'prices_unavailable', {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        ok: true,
      });
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, {
              ...summary,
              errorCode: 'prices_unavailable',
            }),
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    const alerts = prioritizeAlerts(
      actionableMarketAlerts(
        buildMarketAlerts({
          entries: state.entries,
          prices: priceBundle.prices,
          holdings,
        }),
      ),
    );

    const activeFingerprints = alerts.map(marketAlertFingerprint);
    const sentSet = new Set(reminder.lastMarketAlertKeys ?? []);
    const fresh = force
      ? alerts
      : alerts.filter((alert) => {
          const fp = marketAlertFingerprint(alert);
          if (fingerprintAlreadySent(sentSet, alert)) return false;
          if (isFingerprintInCooldown(reminder, fp, nowMs)) return false;
          return true;
        });

    const alertsSkipped = Math.max(0, alerts.length - fresh.length);

    // check mode: no WhatsApp
    if (mode === 'check') {
      const summary: MarketMonitorSummary = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        wouldSend: fresh.length,
        skipReason: fresh.length === 0 ? (alerts.length ? 'already_sent' : 'no_alerts') : undefined,
      };
      if (persist) {
        // En check sí actualizamos status y podamos fingerprints inactivos sin marcar enviados
        const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary),
            preferences: { ...prefs, reminder: pruned },
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    // send mode
    const phone = resolveWhatsAppPhone();
    const apiKey = resolveCallMeBotApiKey(reminder);
    if (!phone) {
      return fail('no_phone', 'no_phone', {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSkipped,
        ok: true,
      });
    }
    if (!apiKey) {
      return fail('no_api_key', 'no_api_key', {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSkipped,
        ok: true,
      });
    }

    if (fresh.length === 0) {
      const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
      const summary: MarketMonitorSummary = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        skipReason: alerts.length ? 'already_sent' : 'no_alerts',
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary),
            preferences: { ...prefs, reminder: pruned },
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    const message = formatMarketWhatsAppMessage(fresh);
    const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
    if (!send.ok) {
      // No marcar fingerprints si falló el envío
      const summary: MarketMonitorSummary = {
        ok: false,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        errorCode: 'whatsapp_failed',
        skipReason: 'whatsapp_failed',
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          });
        } catch {
          /* ignore */
        }
      }
      return summary;
    }

    const freshKeys = fresh.map(marketAlertFingerprint);
    reminder = markMarketAlertsSentWithCooldown(
      reminder,
      freshKeys,
      activeFingerprints,
      checkedAt,
    );

    const summary: MarketMonitorSummary = {
      ok: true,
      runId,
      checkedAt,
      mode,
      symbolsRequested: hours.fetch.length,
      symbolsResolved: priceBundle.resolved,
      symbolsSkippedHours: hours.skipped.length,
      alertsDetected: alerts.length,
      alertsSent: fresh.length,
      alertsSkipped,
      durationMs: Date.now() - started,
    };

    if (persist) {
      try {
        await upsertFinanceStateRemote(syncId, {
          ...state,
          monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          preferences: { ...prefs, reminder },
        });
      } catch {
        return {
          ...summary,
          ok: false,
          errorCode: 'persist_failed',
          skipReason: 'persist_failed',
        };
      }
    }

    return summary;
  } finally {
    if (monitorLock === runId) monitorLock = null;
  }
}

/** Solo tests: libera el lock in-process. */
export function __resetMarketMonitorLockForTests(): void {
  monitorLock = null;
}
