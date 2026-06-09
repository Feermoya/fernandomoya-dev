import type { FinanceEntry } from '@/lib/finance/types';

const TICKER_RE = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

const NON_TICKER_CATEGORY =
  /^(acciones?|cedears?|mep|usd|ars|etf|crypto|bitcoin|fondo|emergencia|proyecto|otro|inversi[oó]n|d[oó]lar)/i;

export function normalizeTicker(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9.-]/g, '')
    .slice(0, 10);
}

export function looksLikeFinanceTicker(value: string | undefined | null): boolean {
  const t = normalizeTicker(value);
  if (!t || t.length > 10) return false;
  if (NON_TICKER_CATEGORY.test(t)) return false;
  return TICKER_RE.test(t);
}

function extractTickerFromNote(note: string | undefined): string | undefined {
  if (!note?.trim()) return undefined;
  const tokens = note.split(/[\s,;/|]+/);
  for (const raw of tokens) {
    const t = normalizeTicker(raw);
    if (looksLikeFinanceTicker(t)) return t;
  }
  return undefined;
}

function tickerFromCategory(category: string | undefined): string | undefined {
  if (!category?.trim()) return undefined;
  const norm = normalizeTicker(category);
  if (looksLikeFinanceTicker(norm)) return norm;
  const first = normalizeTicker(category.split(/[\s,;/|]+/)[0]);
  if (looksLikeFinanceTicker(first)) return first;
  return undefined;
}

/** Detecta ticker de una inversión (nuevos campos o datos legacy). */
export function getEntryTicker(entry: FinanceEntry): string | undefined {
  if (entry.ticker && looksLikeFinanceTicker(entry.ticker)) {
    return normalizeTicker(entry.ticker);
  }

  const fromCategory = tickerFromCategory(entry.category);
  if (fromCategory) return fromCategory;

  const fromNote = extractTickerFromNote(entry.note);
  if (fromNote) return fromNote;

  if (entry.asset === 'BTC') return 'BTC';

  if (entry.asset === 'ETF' || entry.asset === 'CEDEAR') {
    const again = tickerFromCategory(entry.category) ?? extractTickerFromNote(entry.note);
    if (again) return again;
  }

  return undefined;
}
