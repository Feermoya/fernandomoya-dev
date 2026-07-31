/**
 * Ventanas de mercado en America/Argentina/Buenos_Aires (Intl, sin offset fijo).
 */

import { isCryptoTicker } from '@/lib/finance/tickerPricing';

export type MarketSessionKind = 'crypto' | 'us_equity' | 'ar_equity' | 'unknown';

export type MarketHoursDecision = {
  kind: MarketSessionKind;
  shouldFetch: boolean;
  reason: string;
};

const TZ = 'America/Argentina/Buenos_Aires';

/** CEDEARs / tickers típicos BCBA (heurística, no calendario bursátil completo). */
const AR_HINT =
  /^(GGAL|YPFD|PAMP|TXAR|ALUA|BMA|SUPV|COME|CRES|TECO2|EDN|LOMA|TRAN|CEPU|BYMA|VALO|HARG|MIRG|TGSU2|IRSA|CTIO|BHIP|BPAT|CVH)$/i;

function argentinaWallClock(date: Date): {
  weekday: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { weekday: map[wd] ?? 1, hour, minute };
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function classifyMarketSession(ticker: string): MarketSessionKind {
  const t = ticker.trim().toUpperCase();
  if (!t) return 'unknown';
  if (isCryptoTicker(t)) return 'crypto';
  if (AR_HINT.test(t)) return 'ar_equity';
  // Heurística: tickers cortos tipo AAPL/SPY → US; resto unknown conservador.
  if (/^[A-Z]{1,5}$/.test(t) && !AR_HINT.test(t)) return 'us_equity';
  return 'unknown';
}

/**
 * ¿Conviene scrapear este ticker ahora?
 * - Crypto: 24/7
 * - US: lun–vie ~10:00–17:30 AR (aprox. overlap NYSE en Argentina)
 * - AR/BCBA: lun–vie ~10:30–17:15 AR
 * - Unknown: solo en ventana US ampliada (conservador)
 */
export function shouldFetchTickerNow(ticker: string, now: Date = new Date()): MarketHoursDecision {
  const kind = classifyMarketSession(ticker);
  const { weekday, hour, minute } = argentinaWallClock(now);
  const mins = minutesOfDay(hour, minute);
  const weekend = weekday === 0 || weekday === 6;

  if (kind === 'crypto') {
    return { kind, shouldFetch: true, reason: 'crypto_24_7' };
  }

  if (weekend) {
    return { kind, shouldFetch: false, reason: 'weekend' };
  }

  if (kind === 'ar_equity') {
    const open = minutesOfDay(10, 15);
    const close = minutesOfDay(17, 30);
    const ok = mins >= open && mins <= close;
    return { kind, shouldFetch: ok, reason: ok ? 'ar_session' : 'ar_closed' };
  }

  // US + unknown: ventana amplia alrededor de la rueda NYSE vista desde AR
  const open = minutesOfDay(10, 0);
  const close = minutesOfDay(18, 0);
  const ok = mins >= open && mins <= close;
  return {
    kind,
    shouldFetch: ok,
    reason: ok ? (kind === 'us_equity' ? 'us_session' : 'unknown_day_session') : 'outside_session',
  };
}

export function filterTickersForMarketHours(
  tickers: string[],
  now: Date = new Date(),
): { fetch: string[]; skipped: { ticker: string; reason: string }[] } {
  const fetch: string[] = [];
  const skipped: { ticker: string; reason: string }[] = [];
  for (const raw of tickers) {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) continue;
    const d = shouldFetchTickerNow(ticker, now);
    if (d.shouldFetch) fetch.push(ticker);
    else skipped.push({ ticker, reason: d.reason });
  }
  return { fetch, skipped };
}

/** Próxima ventana aproximada (solo informativa para UI). */
export function approximateNextMonitorHint(now: Date = new Date()): string {
  const { weekday, hour } = argentinaWallClock(now);
  if (weekday === 0 || weekday === 6) return 'Lunes ~10:00 AR (acciones) · cripto cada ~15 min';
  if (hour < 10) return 'Hoy ~10:00 AR';
  if (hour >= 18) return 'Mañana ~10:00 AR (acciones) · cripto sigue';
  return 'Cada ~15 min (GitHub Actions, puede demorar)';
}
