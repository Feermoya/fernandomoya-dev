/**
 * Construye una `FinanceEntry` de inversión a partir del formulario,
 * adjuntando snapshot de mercado cuando hay ticker.
 */

import { getEntryTicker } from '@/lib/finance/entryTicker';
import {
  amountFromUnits,
  normalizeAmountCurrency,
  parsePositiveNumber,
  unitsFromAmount,
  type EntryAmountCurrency,
  type EntryInputMode,
} from '@/lib/finance/entry/inputModes';
import { fetchFinancePrices, type FinancePrice } from '@/lib/finance/financePrices';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';

export type BuildInvestmentEntryInput = {
  mode: EntryInputMode;
  /** Monto (modo amount) o vacío. */
  amountRaw: string;
  /** Nominales (modo units) o vacío. */
  unitsRaw: string;
  /** Moneda del monto en modo amount. En modo units se toma del precio. */
  amountCurrency?: EntryAmountCurrency;
  month: string;
  asset: FinanceAsset | '';
  platform: string;
  category: string;
  note: string;
  /** Precio ya consultado en UI (evita doble fetch si está fresco). */
  cachedPrice?: FinancePrice | null;
};

export type BuildInvestmentEntryResult =
  | { ok: true; entry: FinanceEntry; price?: FinancePrice }
  | { ok: false; error: string };

function newEntryId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function attachMarketFields(entry: FinanceEntry, ticker: string, row: FinancePrice): void {
  const currency = row.currency ?? 'ARS';
  entry.buyPrice = row.price;
  entry.buyCurrency = currency;
  entry.buySnapshot = {
    ticker,
    price: row.price,
    currency,
    source: row.source,
    fetchedAt: row.fetchedAt,
    exchange: row.exchange,
    url: row.url,
  };
}

function roundAmount(amount: number, currency: EntryAmountCurrency): number {
  if (currency === 'USD') return Math.round(amount * 100) / 100;
  return Math.round(amount);
}

export async function buildInvestmentEntry(
  input: BuildInvestmentEntryInput,
): Promise<BuildInvestmentEntryResult> {
  const draft: FinanceEntry = {
    id: newEntryId(),
    month: input.month,
    type: 'investment',
    amount: 0,
    createdAt: new Date().toISOString(),
  };
  if (input.asset) draft.asset = input.asset;
  if (input.platform.trim()) draft.platform = input.platform.trim();
  if (input.category.trim()) draft.category = input.category.trim();
  if (input.note.trim()) draft.note = input.note.trim();

  const ticker = getEntryTicker(draft);
  if (ticker) draft.ticker = ticker;

  let priceRow: FinancePrice | undefined =
    input.cachedPrice && input.cachedPrice.price > 0 ? input.cachedPrice : undefined;

  if (ticker && !priceRow) {
    const result = await fetchFinancePrices([ticker]);
    const row = result.prices[ticker];
    if (row && row.price > 0) priceRow = row;
  }

  if (input.mode === 'units') {
    const units = parsePositiveNumber(input.unitsRaw);
    if (units == null) {
      return { ok: false, error: 'Indicá cuántos nominales compraste.' };
    }
    if (!ticker) {
      return {
        ok: false,
        error: 'Para cargar por nominales, poné el ticker en Etiqueta (ej. MELI, TSLA).',
      };
    }
    if (!priceRow || !(priceRow.price > 0)) {
      return {
        ok: false,
        error: `No pudimos obtener el precio de ${ticker}. Probá por monto o actualizá el ticker.`,
      };
    }
    const currency = normalizeAmountCurrency(priceRow.currency);
    draft.amountCurrency = currency;
    draft.amount = amountFromUnits(units, priceRow.price, currency);
    if (draft.amount <= 0) {
      return { ok: false, error: 'El monto calculado es inválido.' };
    }
    attachMarketFields(draft, ticker, priceRow);
    draft.estimatedUnits = Math.round(units * 1000) / 1000;
    if (!draft.asset && currency === 'USD') draft.asset = 'USD';
    return { ok: true, entry: draft, price: priceRow };
  }

  const amount = parsePositiveNumber(input.amountRaw);
  if (amount == null) {
    return { ok: false, error: 'Indicá un monto válido.' };
  }
  const amountCurrency = normalizeAmountCurrency(input.amountCurrency);
  draft.amountCurrency = amountCurrency;
  draft.amount = roundAmount(amount, amountCurrency);
  if (!draft.asset && amountCurrency === 'USD') draft.asset = 'USD';

  if (ticker && priceRow && priceRow.price > 0) {
    attachMarketFields(draft, ticker, priceRow);
    const priceCurrency = normalizeAmountCurrency(priceRow.currency);
    if (priceCurrency === amountCurrency) {
      draft.estimatedUnits = unitsFromAmount(draft.amount, priceRow.price);
    }
  }

  return { ok: true, entry: draft, price: priceRow };
}

/** Consulta precio para preview en UI (modo nominales). */
export async function fetchTickerPriceForEntry(
  ticker: string,
): Promise<FinancePrice | null> {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return null;
  const result = await fetchFinancePrices([normalized]);
  const row = result.prices[normalized];
  if (!row || !(row.price > 0)) return null;
  return row;
}
