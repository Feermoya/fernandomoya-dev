import { sendCallMeBotWhatsAppServer } from '@/lib/finance/callMeBotServer';
import { buildFinancePricesResponse } from '@/lib/finance/financePricesServer';
import { evaluateInvestmentWhatsAppNudge } from '@/lib/finance/levels';
import {
  buildMarketAlerts,
  marketAlertFingerprint,
  type MarketAlert,
} from '@/lib/finance/marketAlerts';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import {
  cronReminderRunKey,
  markCronReminderSent,
  markMarketAlertsSent,
  normalizePreferences,
} from '@/lib/finance/preferences';
import { markMarketAlertsSentWithCooldown, fingerprintAlreadySent, isFingerprintInCooldown } from '@/lib/finance/monitor/antiSpam';
import {
  fetchFinanceStateRemote,
  isFinanceRemoteConfigured,
  resolveWhatsAppPhone,
  upsertFinanceStateRemote,
} from '@/lib/finance/remoteFinanceState';
import { DEFAULT_FINANCE_SYNC_ID } from '@/lib/finance/storage';
import { getArgentinaDateParts } from '@/lib/finance/timezone';
import type { FinanceReminderSettings, FinanceState } from '@/lib/finance/types';
import { formatMarketWhatsAppMessage, formatInvestmentTestWhatsAppMessage, formatMarketTestEmptyWhatsAppMessage } from '@/lib/finance/whatsappCopy';

export type WhatsAppJobKind = 'investment' | 'market' | 'both';

export type WhatsAppJobRunOptions = {
  /** Ignora already_sent / enabled checks mínimamente; para botón de prueba. */
  force?: boolean;
  /** Si false, no escribe huellas en Supabase (prueba no contamina el anti-spam del cron). */
  persist?: boolean;
  only?: WhatsAppJobKind;
};

export type WhatsAppJobSkipReason =
  | 'supabase_not_configured'
  | 'no_remote_state'
  | 'no_phone'
  | 'no_api_key'
  | 'reminders_disabled'
  | 'market_disabled'
  | 'investment_sufficient'
  | 'already_sent'
  | 'no_alerts'
  | 'no_tickers'
  | 'prices_unavailable';

export type WhatsAppJobResult = {
  ok: boolean;
  action: 'sent' | 'skipped' | 'error';
  skipReason?: WhatsAppJobSkipReason;
  detail?: string;
  fingerprints?: string[];
  invested?: number;
  error?: string;
};

export type FinanceWhatsAppJobsResult = {
  ok: boolean;
  reminder: WhatsAppJobResult;
  market: WhatsAppJobResult;
};

function actionableMarketAlerts(alerts: MarketAlert[]): MarketAlert[] {
  return alerts.filter((a) => a.kind !== 'neutral');
}

/** Preferencias sincronizadas primero; env solo como respaldo. */
export function resolveCallMeBotApiKey(reminder?: FinanceReminderSettings): string {
  return (
    reminder?.callMeBotApiKey?.trim() ||
    process.env.CALLMEBOT_API_KEY?.trim() ||
    process.env.FINANCE_CALLMEBOT_API_KEY?.trim() ||
    ''
  );
}

export async function runInvestmentReminderJob(
  state: FinanceState,
  phone: string,
  apiKey: string,
  options: WhatsAppJobRunOptions = {},
): Promise<{ result: WhatsAppJobResult; nextReminder?: FinanceReminderSettings }> {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const { day, monthKey } = getArgentinaDateParts();
  const runKey = cronReminderRunKey(monthKey, day);
  const force = Boolean(options.force);
  const persist = options.persist !== false;

  if (!force && !reminder.enabled) {
    return { result: { ok: true, action: 'skipped', skipReason: 'reminders_disabled' } };
  }

  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  if (!force && !nudge.shouldNotify) {
    return {
      result: {
        ok: true,
        action: 'skipped',
        skipReason: 'investment_sufficient',
        invested: nudge.invested,
        detail: nudge.reason,
      },
    };
  }

  if (!force && reminder.lastCronReminderKeys?.includes(runKey)) {
    return {
      result: {
        ok: true,
        action: 'skipped',
        skipReason: 'already_sent',
        invested: nudge.invested,
        detail: runKey,
      },
    };
  }

  const message = nudge.shouldNotify
    ? nudge.message
    : formatInvestmentTestWhatsAppMessage(nudge.invested);

  const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
  if (!send.ok) {
    return {
      result: {
        ok: false,
        action: 'error',
        invested: nudge.invested,
        detail: send.detail,
        error: 'CallMeBot rejected the investment reminder',
      },
    };
  }

  return {
    result: {
      ok: true,
      action: 'sent',
      invested: nudge.invested,
      detail: send.detail,
      fingerprints: [runKey],
    },
    nextReminder: persist && !force ? markCronReminderSent(reminder, runKey) : undefined,
  };
}

export async function runMarketAlertJob(
  state: FinanceState,
  phone: string,
  apiKey: string,
  options: WhatsAppJobRunOptions = {},
): Promise<{ result: WhatsAppJobResult; nextReminder?: FinanceReminderSettings }> {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const force = Boolean(options.force);
  const persist = options.persist !== false;

  if (!force && !reminder.marketWhatsAppEnabled) {
    return { result: { ok: true, action: 'skipped', skipReason: 'market_disabled' } };
  }

  const holdings = state.portfolioHoldings ?? [];
  const tickers = getTrackedTickersFromPortfolio(state.entries, holdings);
  if (tickers.length === 0) {
    return { result: { ok: true, action: 'skipped', skipReason: 'no_tickers' } };
  }

  const pricesResponse = await buildFinancePricesResponse(tickers.join(','));
  if (!pricesResponse.ok) {
    return {
      result: {
        ok: true,
        action: 'skipped',
        skipReason: 'prices_unavailable',
        detail: pricesResponse.error,
      },
    };
  }

  const alerts = actionableMarketAlerts(
    buildMarketAlerts({
      entries: state.entries,
      prices: pricesResponse.prices,
      holdings,
    }),
  );
  const activeFingerprints = alerts.map(marketAlertFingerprint);
  const sentSet = new Set(reminder.lastMarketAlertKeys ?? []);
  const nowMs = Date.now();
  const fresh = force
    ? alerts
    : alerts.filter((alert) => {
        const fp = marketAlertFingerprint(alert);
        if (fingerprintAlreadySent(sentSet, alert)) return false;
        if (isFingerprintInCooldown(reminder, fp, nowMs)) return false;
        return true;
      });

  if (fresh.length === 0) {
    if (force) {
      const message = formatMarketTestEmptyWhatsAppMessage();
      const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
      if (!send.ok) {
        return {
          result: {
            ok: false,
            action: 'error',
            detail: send.detail,
            error: 'CallMeBot rejected the market alert',
          },
        };
      }
      return { result: { ok: true, action: 'sent', detail: send.detail } };
    }

    const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
    const changed =
      JSON.stringify(pruned.lastMarketAlertKeys ?? []) !==
      JSON.stringify(reminder.lastMarketAlertKeys ?? []);
    return {
      result: { ok: true, action: 'skipped', skipReason: alerts.length ? 'already_sent' : 'no_alerts' },
      nextReminder: changed ? pruned : undefined,
    };
  }

  const message = formatMarketWhatsAppMessage(fresh);
  const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
  if (!send.ok) {
    return {
      result: {
        ok: false,
        action: 'error',
        detail: send.detail,
        fingerprints: fresh.map(marketAlertFingerprint),
        error: 'CallMeBot rejected the market alert',
      },
    };
  }

  const freshKeys = fresh.map(marketAlertFingerprint);
  return {
    result: {
      ok: true,
      action: 'sent',
      detail: send.detail,
      fingerprints: freshKeys,
    },
    nextReminder:
      persist && !force
        ? markMarketAlertsSentWithCooldown(
            reminder,
            freshKeys,
            activeFingerprints,
            new Date().toISOString(),
          )
        : undefined,
  };
}

/** Orquesta jobs de WhatsApp para el cron único de keepalive (Hobby). */
export async function runFinanceWhatsAppJobs(
  syncId: string = DEFAULT_FINANCE_SYNC_ID,
  options: WhatsAppJobRunOptions = {},
): Promise<FinanceWhatsAppJobsResult> {
  if (!isFinanceRemoteConfigured()) {
    const skipped: WhatsAppJobResult = {
      ok: true,
      action: 'skipped',
      skipReason: 'supabase_not_configured',
    };
    return { ok: true, reminder: skipped, market: skipped };
  }

  let state: FinanceState | null;
  try {
    state = await fetchFinanceStateRemote(syncId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    const err: WhatsAppJobResult = { ok: false, action: 'error', error: msg };
    return { ok: false, reminder: err, market: err };
  }

  if (!state) {
    const skipped: WhatsAppJobResult = { ok: true, action: 'skipped', skipReason: 'no_remote_state' };
    return { ok: true, reminder: skipped, market: skipped };
  }

  const prefs = normalizePreferences(state.preferences);
  let reminder = prefs.reminder;
  const phone = resolveWhatsAppPhone();
  const apiKey = resolveCallMeBotApiKey(reminder);
  const only = options.only ?? 'both';
  const runInvestment = only === 'both' || only === 'investment';
  const runMarket = only === 'both' || only === 'market';

  if (!phone) {
    const skipped: WhatsAppJobResult = { ok: true, action: 'skipped', skipReason: 'no_phone' };
    return { ok: true, reminder: skipped, market: skipped };
  }
  if (!apiKey) {
    const skipped: WhatsAppJobResult = { ok: true, action: 'skipped', skipReason: 'no_api_key' };
    return { ok: true, reminder: skipped, market: skipped };
  }

  const skippedIdle: WhatsAppJobResult = { ok: true, action: 'skipped', skipReason: 'reminders_disabled' };

  const investment = runInvestment
    ? await runInvestmentReminderJob(state, phone, apiKey, options)
    : { result: skippedIdle };
  if (investment.nextReminder) reminder = investment.nextReminder;

  const marketState: FinanceState = {
    ...state,
    preferences: { ...prefs, reminder },
  };
  const market = runMarket
    ? await runMarketAlertJob(marketState, phone, apiKey, options)
    : { result: { ok: true, action: 'skipped', skipReason: 'market_disabled' } };
  if (market.nextReminder) reminder = market.nextReminder;

  const shouldPersist =
    options.persist !== false && Boolean(investment.nextReminder || market.nextReminder);
  if (shouldPersist) {
    const nextState: FinanceState = {
      ...state,
      preferences: { ...prefs, reminder },
    };
    try {
      await upsertFinanceStateRemote(syncId, nextState);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'upsert failed';
      const persistError = (job: WhatsAppJobResult): WhatsAppJobResult =>
        job.action === 'sent'
          ? { ...job, ok: false, action: 'error', error: `Sent but failed to save state: ${msg}` }
          : job;
      return {
        ok: false,
        reminder: persistError(investment.result),
        market: persistError(market.result),
      };
    }
  }

  return {
    ok: investment.result.ok && market.result.ok,
    reminder: investment.result,
    market: market.result,
  };
}
