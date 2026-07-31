import { normalizeTicker, looksLikeFinanceTicker } from '@/lib/finance/entryTicker';
import type {
  FinancePortfolioCurrency,
  FinancePortfolioHolding,
  FinancePortfolioHoldingSource,
} from '@/lib/finance/portfolio/types';

export type HoldingValidationError = {
  field?: string;
  message: string;
};

export type HoldingValidationResult =
  | { ok: true; holding: FinancePortfolioHolding }
  | { ok: false; errors: HoldingValidationError[] };

const CURRENCIES = new Set<FinancePortfolioCurrency>(['ARS', 'USD']);

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ph-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseCurrency(raw: unknown): FinancePortfolioCurrency | null {
  if (typeof raw !== 'string') return null;
  const c = raw
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  if (c === 'ARS' || c === 'USD') return c;
  if (c === 'PESOS' || c === 'PESO' || c === '$' || c === 'AR$') return 'ARS';
  if (
    c === 'USS' ||
    c === 'US$' ||
    c === 'U$S' ||
    c === 'DOLARES' ||
    c === 'DOLAR' ||
    c === 'DOLLARS' ||
    c === 'DOLLAR'
  ) {
    return 'USD';
  }
  return null;
}

function optionalTrim(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t || undefined;
}

/** Normaliza y valida un holding. No redondea precios/cantidades prematuramente. */
export function normalizeAndValidateHolding(
  raw: unknown,
  opts?: { existingId?: string; nowIso?: string },
): HoldingValidationResult {
  const errors: HoldingValidationError[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: [{ message: 'Holding inválido.' }] };
  }
  const o = raw as Record<string, unknown>;
  const now = opts?.nowIso ?? new Date().toISOString();

  const ticker = normalizeTicker(typeof o.ticker === 'string' ? o.ticker : '');
  if (!ticker || !looksLikeFinanceTicker(ticker)) {
    errors.push({ field: 'ticker', message: 'Ticker inválido.' });
  }

  const quantity = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ field: 'quantity', message: 'La cantidad debe ser mayor que cero.' });
  }

  const averagePurchasePrice =
    typeof o.averagePurchasePrice === 'number'
      ? o.averagePurchasePrice
      : Number(o.averagePurchasePrice);
  if (!Number.isFinite(averagePurchasePrice) || averagePurchasePrice <= 0) {
    errors.push({
      field: 'averagePurchasePrice',
      message: 'El precio promedio debe ser mayor que cero.',
    });
  }

  const currency = parseCurrency(o.currency);
  if (!currency || !CURRENCIES.has(currency)) {
    errors.push({ field: 'currency', message: 'Moneda inválida (ARS o USD).' });
  }

  const sourceRaw = typeof o.source === 'string' ? o.source : 'manual';
  const source: FinancePortfolioHoldingSource =
    sourceRaw === 'csv' || sourceRaw === 'manual' ? sourceRaw : 'manual';

  if (errors.length > 0) return { ok: false, errors };

  const createdAt =
    typeof o.createdAt === 'string' && o.createdAt.trim() ? o.createdAt : now;
  const id =
    opts?.existingId ||
    (typeof o.id === 'string' && o.id.trim() ? o.id : newId());

  const holding: FinancePortfolioHolding = {
    id,
    ticker,
    quantity: quantity as number,
    averagePurchasePrice: averagePurchasePrice as number,
    currency: currency as FinancePortfolioCurrency,
    source,
    createdAt,
    updatedAt: now,
  };

  const displayName = optionalTrim(o.displayName);
  if (displayName) holding.displayName = displayName;
  const broker = optionalTrim(o.broker);
  if (broker) holding.broker = broker;
  const purchaseDate = optionalTrim(o.purchaseDate);
  if (purchaseDate) holding.purchaseDate = purchaseDate;
  const market = optionalTrim(o.market);
  if (market) holding.market = market;
  const notes = optionalTrim(o.notes);
  if (notes) holding.notes = notes;

  return { ok: true, holding };
}

export function isFinancePortfolioHolding(x: unknown): x is FinancePortfolioHolding {
  return normalizeAndValidateHolding(x).ok;
}

export function normalizePortfolioHoldings(raw: unknown): FinancePortfolioHolding[] {
  if (!Array.isArray(raw)) return [];
  const out: FinancePortfolioHolding[] = [];
  for (const item of raw) {
    const result = normalizeAndValidateHolding(item);
    if (result.ok) out.push(result.holding);
  }
  return out;
}

/** Promedio ponderado: (q1*p1 + q2*p2) / (q1+q2). */
export function weightedAveragePrice(
  quantityA: number,
  priceA: number,
  quantityB: number,
  priceB: number,
): number {
  const totalQty = quantityA + quantityB;
  if (!(totalQty > 0)) return 0;
  return (quantityA * priceA + quantityB * priceB) / totalQty;
}
