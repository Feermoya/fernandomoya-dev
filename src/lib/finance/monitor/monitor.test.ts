import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authorizeFinanceMonitor,
  extractBearerToken,
} from '@/lib/finance/monitor/auth';
import {
  fingerprintAlreadySent,
  isFingerprintInCooldown,
  markMarketAlertsSentWithCooldown,
} from '@/lib/finance/monitor/antiSpam';
import {
  classifyMarketSession,
  filterTickersForMarketHours,
  shouldFetchTickerNow,
} from '@/lib/finance/monitor/marketHours';
import { normalizeMonitorStatus } from '@/lib/finance/monitor/status';
import {
  __resetMarketMonitorLockForTests,
  runFinanceMarketMonitor,
} from '@/lib/finance/monitor/runMarketMonitor';
import { marketAlertFingerprint } from '@/lib/finance/marketAlerts';
import { formatMarketWhatsAppMessage } from '@/lib/finance/whatsappCopy';
import type { MarketAlert } from '@/lib/finance/marketAlerts';
import type { FinanceReminderSettings, FinanceState } from '@/lib/finance/types';

vi.mock('@/lib/finance/remoteFinanceState', () => ({
  isFinanceRemoteConfigured: vi.fn(() => true),
  fetchFinanceStateRemote: vi.fn(),
  upsertFinanceStateRemote: vi.fn(async () => undefined),
  resolveWhatsAppPhone: vi.fn(() => '5491100000000'),
}));

vi.mock('@/lib/finance/financePricesServer', () => ({
  buildFinancePricesResponse: vi.fn(),
}));

vi.mock('@/lib/finance/callMeBotServer', () => ({
  sendCallMeBotWhatsAppServer: vi.fn(),
}));

import {
  fetchFinanceStateRemote,
  isFinanceRemoteConfigured,
  upsertFinanceStateRemote,
} from '@/lib/finance/remoteFinanceState';
import { buildFinancePricesResponse } from '@/lib/finance/financePricesServer';
import { sendCallMeBotWhatsAppServer } from '@/lib/finance/callMeBotServer';

const fetchRemote = vi.mocked(fetchFinanceStateRemote);
const upsertRemote = vi.mocked(upsertFinanceStateRemote);
const isRemote = vi.mocked(isFinanceRemoteConfigured);
const buildPrices = vi.mocked(buildFinancePricesResponse);
const sendWa = vi.mocked(sendCallMeBotWhatsAppServer);

function baseReminder(partial: Partial<FinanceReminderSettings> = {}): FinanceReminderSettings {
  return {
    enabled: true,
    phoneDigits: '5491100000000',
    daysOfMonth: [5, 15, 25],
    marketWhatsAppEnabled: true,
    callMeBotApiKey: 'test-key',
    ...partial,
  };
}

function emptyState(partial: Partial<FinanceState> = {}): FinanceState {
  return {
    entries: [],
    goals: [],
    challenges: [],
    currentMonth: '2026-07',
    preferences: {
      quickAmounts: [50_000],
      reminder: baseReminder(),
    },
    portfolioHoldings: [],
    ...partial,
  };
}

/** Miércoles 15:00 AR ≈ 18:00 UTC en invierno (UTC-3). */
function weekdaySessionAr(): Date {
  return new Date('2026-07-29T18:00:00.000Z');
}

/** Domingo madrugada AR. */
function sundayNightAr(): Date {
  return new Date('2026-07-26T06:00:00.000Z');
}

beforeEach(() => {
  __resetMarketMonitorLockForTests();
  vi.clearAllMocks();
  isRemote.mockReturnValue(true);
  upsertRemote.mockResolvedValue(undefined as never);
  sendWa.mockResolvedValue({ ok: true, detail: 'sent' });
});

afterEach(() => {
  __resetMarketMonitorLockForTests();
});

describe('monitor auth', () => {
  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer secret123')).toBe('secret123');
    expect(extractBearerToken('bearer secret123')).toBe('secret123');
    expect(extractBearerToken(undefined)).toBe('');
  });

  it('rejects missing/invalid secret', () => {
    const prev = process.env.FINANCE_MONITOR_SECRET;
    process.env.FINANCE_MONITOR_SECRET = 'correct-secret-value!!';
    expect(authorizeFinanceMonitor({}).ok).toBe(false);
    expect(authorizeFinanceMonitor({ authorizationHeader: 'Bearer wrong' }).ok).toBe(false);
    const ok = authorizeFinanceMonitor({
      authorizationHeader: 'Bearer correct-secret-value!!',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.via).toBe('secret');
    process.env.FINANCE_MONITOR_SECRET = prev;
  });

  it('allows ui source without bearer', () => {
    const prev = process.env.FINANCE_MONITOR_SECRET;
    process.env.FINANCE_MONITOR_SECRET = 'x';
    const ok = authorizeFinanceMonitor({ uiSource: true });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.via).toBe('ui');
    process.env.FINANCE_MONITOR_SECRET = prev;
  });
});

describe('market hours', () => {
  it('classifies crypto / us / ar', () => {
    expect(classifyMarketSession('BTC')).toBe('crypto');
    expect(classifyMarketSession('AAPL')).toBe('us_equity');
    expect(classifyMarketSession('GGAL')).toBe('ar_equity');
  });

  it('crypto 24/7 including weekend', () => {
    const d = shouldFetchTickerNow('BTC', sundayNightAr());
    expect(d.shouldFetch).toBe(true);
    expect(d.reason).toBe('crypto_24_7');
  });

  it('skips equities on weekend', () => {
    const d = shouldFetchTickerNow('AAPL', sundayNightAr());
    expect(d.shouldFetch).toBe(false);
    expect(d.reason).toBe('weekend');
  });

  it('allows equities in weekday session', () => {
    const d = shouldFetchTickerNow('AAPL', weekdaySessionAr());
    expect(d.shouldFetch).toBe(true);
  });

  it('filters mixed portfolio', () => {
    const { fetch, skipped } = filterTickersForMarketHours(
      ['BTC', 'AAPL', 'GGAL'],
      sundayNightAr(),
    );
    expect(fetch).toEqual(['BTC']);
    expect(skipped.map((s) => s.ticker).sort()).toEqual(['AAPL', 'GGAL']);
  });
});

describe('anti-spam fingerprints', () => {
  it('matches legacy and currency-suffixed keys', () => {
    expect(
      fingerprintAlreadySent(['loss-since-buy:AAPL'], {
        kind: 'loss-since-buy',
        ticker: 'AAPL',
        currentCurrency: 'USD',
      }),
    ).toBe(true);
    expect(
      fingerprintAlreadySent(['loss-since-buy:AAPL:USD'], {
        kind: 'loss-since-buy',
        ticker: 'AAPL',
        currentCurrency: 'USD',
      }),
    ).toBe(true);
    expect(
      fingerprintAlreadySent(['loss-since-buy:MSFT'], {
        kind: 'loss-since-buy',
        ticker: 'AAPL',
      }),
    ).toBe(false);
  });

  it('cooldown blocks recent fingerprint', () => {
    const reminder = baseReminder({
      lastMarketAlertSentAt: {
        'daily-drop:AAPL': new Date().toISOString(),
      },
    });
    expect(isFingerprintInCooldown(reminder, 'daily-drop:AAPL', Date.now())).toBe(true);
    expect(isFingerprintInCooldown(reminder, 'daily-drop:MSFT', Date.now())).toBe(false);
  });

  it('markMarketAlertsSentWithCooldown stores timestamps', () => {
    const next = markMarketAlertsSentWithCooldown(
      baseReminder(),
      ['daily-drop:AAPL'],
      ['daily-drop:AAPL'],
      '2026-07-29T12:00:00.000Z',
    );
    expect(next.lastMarketAlertKeys).toContain('daily-drop:AAPL');
    expect(next.lastMarketAlertSentAt?.['daily-drop:AAPL']).toBe('2026-07-29T12:00:00.000Z');
  });

  it('condition disappearing prunes key; reappearing is fresh again without cooldown', () => {
    const afterSend = markMarketAlertsSentWithCooldown(
      baseReminder({ lastMarketAlertKeys: ['daily-drop:AAPL'] }),
      [],
      [], // inactive → prune
      '2026-07-29T12:00:00.000Z',
    );
    expect(afterSend.lastMarketAlertKeys ?? []).not.toContain('daily-drop:AAPL');
  });
});

describe('message grouping', () => {
  it('groups multiple alerts in one message', () => {
    const alerts: MarketAlert[] = [
      {
        id: '1',
        ticker: 'AAPL',
        kind: 'daily-drop',
        severity: 'opportunity',
        title: 'AAPL bajó',
        detail: '',
        changePercent: -5.4,
        currentPrice: 180,
        currentCurrency: 'USD',
      },
      {
        id: '2',
        ticker: 'SPY',
        kind: 'daily-rise',
        severity: 'positive',
        title: 'SPY subió',
        detail: '',
        changePercent: 3.2,
        currentPrice: 548,
        currentCurrency: 'USD',
      },
    ];
    const msg = formatMarketWhatsAppMessage(alerts);
    expect(msg).toContain('Alertas de mercado');
    expect(msg).toContain('AAPL');
    expect(msg).toContain('SPY');
    expect(msg.split('🔔').length - 1).toBe(1);
  });
});

describe('monitor status normalize', () => {
  it('keeps safe fields only', () => {
    const s = normalizeMonitorStatus({
      lastRunAt: '2026-07-29T12:00:00.000Z',
      lastAlertsSent: 2,
      lastErrorCode: 'whatsapp_failed',
      password: 'nope',
    });
    expect(s.lastAlertsSent).toBe(2);
    expect(s.lastErrorCode).toBe('whatsapp_failed');
    expect((s as Record<string, unknown>).password).toBeUndefined();
  });
});

describe('runFinanceMarketMonitor', () => {
  it('empty portfolio skips', async () => {
    fetchRemote.mockResolvedValue(emptyState());
    const summary = await runFinanceMarketMonitor({
      mode: 'check',
      persist: false,
      now: weekdaySessionAr(),
    });
    expect(summary.ok).toBe(true);
    expect(summary.skipReason).toBe('no_tickers');
    expect(buildPrices).not.toHaveBeenCalled();
  });

  it('initial holdings + consolidated tickers are requested', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    buildPrices.mockResolvedValue({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: {
        AAPL: {
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          price: 180,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: new Date().toISOString(),
          url: 'https://example.com',
          changePercent: -5.5,
        },
      },
    });

    const summary = await runFinanceMarketMonitor({
      mode: 'check',
      persist: false,
      now: weekdaySessionAr(),
    });
    expect(summary.symbolsRequested).toBe(1);
    expect(summary.alertsDetected).toBeGreaterThan(0);
    expect(summary.wouldSend).toBeGreaterThan(0);
    expect(sendWa).not.toHaveBeenCalled();
  });

  it('existing fingerprint skips send', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        preferences: {
          quickAmounts: [50_000],
          reminder: baseReminder({
            lastMarketAlertKeys: ['daily-drop:AAPL', 'loss-since-buy:AAPL'],
          }),
        },
      }),
    );
    buildPrices.mockResolvedValue({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: {
        AAPL: {
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          price: 180,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: new Date().toISOString(),
          url: 'https://example.com',
          changePercent: -5.5,
        },
      },
    });

    const summary = await runFinanceMarketMonitor({
      mode: 'send',
      persist: false,
      now: weekdaySessionAr(),
    });
    expect(summary.alertsSent).toBe(0);
    expect(summary.skipReason).toBe('already_sent');
    expect(sendWa).not.toHaveBeenCalled();
  });

  it('does not save fingerprint when WhatsApp fails', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    buildPrices.mockResolvedValue({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: {
        AAPL: {
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          price: 180,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: new Date().toISOString(),
          url: 'https://example.com',
          changePercent: -5.5,
        },
      },
    });
    sendWa.mockResolvedValue({ ok: false, detail: 'down' });

    const summary = await runFinanceMarketMonitor({
      mode: 'send',
      persist: true,
      now: weekdaySessionAr(),
    });
    expect(summary.ok).toBe(false);
    expect(summary.errorCode).toBe('whatsapp_failed');
    expect(summary.alertsSent).toBe(0);
    const saved = upsertRemote.mock.calls[0]?.[1] as FinanceState;
    expect(saved.preferences?.reminder.lastMarketAlertKeys ?? []).not.toContain(
      marketAlertFingerprint({ kind: 'daily-drop', ticker: 'AAPL' }),
    );
  });

  it('market closed skips equities but reports reason', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const summary = await runFinanceMarketMonitor({
      mode: 'check',
      persist: false,
      now: sundayNightAr(),
    });
    expect(summary.skipReason).toBe('market_closed');
    expect(buildPrices).not.toHaveBeenCalled();
  });

  it('provider down returns prices_unavailable', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    buildPrices.mockResolvedValue({
      ok: false,
      fetchedAt: new Date().toISOString(),
      prices: {},
      error: 'down',
    });
    const summary = await runFinanceMarketMonitor({
      mode: 'check',
      persist: false,
      now: weekdaySessionAr(),
    });
    expect(summary.errorCode).toBe('prices_unavailable');
  });

  it('overlap returns execution_overlap', async () => {
    fetchRemote.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(emptyState()), 50);
        }),
    );
    const a = runFinanceMarketMonitor({ mode: 'check', persist: false, now: weekdaySessionAr() });
    const b = runFinanceMarketMonitor({ mode: 'check', persist: false, now: weekdaySessionAr() });
    const [ra, rb] = await Promise.all([a, b]);
    const codes = [ra.errorCode, rb.errorCode].filter(Boolean);
    expect(codes).toContain('overlap');
  });

  it('successful send marks fingerprints', async () => {
    fetchRemote.mockResolvedValue(
      emptyState({
        portfolioHoldings: [
          {
            id: 'h1',
            ticker: 'AAPL',
            quantity: 1,
            averagePurchasePrice: 200,
            currency: 'USD',
            source: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    buildPrices.mockResolvedValue({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: {
        AAPL: {
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          price: 180,
          currency: 'USD',
          source: 'yahoo-finance',
          fetchedAt: new Date().toISOString(),
          url: 'https://example.com',
          changePercent: -5.5,
        },
      },
    });
    const summary = await runFinanceMarketMonitor({
      mode: 'send',
      persist: true,
      now: weekdaySessionAr(),
    });
    expect(summary.ok).toBe(true);
    expect(summary.alertsSent).toBeGreaterThan(0);
    expect(sendWa).toHaveBeenCalledTimes(1);
    const saved = upsertRemote.mock.calls[0]?.[1] as FinanceState;
    expect(saved.monitorStatus?.lastAlertsSent).toBeGreaterThan(0);
    expect((saved.preferences?.reminder.lastMarketAlertKeys ?? []).length).toBeGreaterThan(0);
  });
});
