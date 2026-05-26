import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import type { FinancePriceSource, FinancePricesMap } from '@/lib/finance/financePrices';

const MAX_LABEL_LENGTH = 30;
const MAX_ITEMS_PER_PARSE = 30;

const STRONG_SEPARATORS = /[\n,;/\t]+/;

const COMPOUND_PHRASES = [
  'CEDEARS GENERAL',
  'CEDEAR GENERAL',
  'MERCADO LIBRE',
  'MERCADOLIBRE',
] as const;

const COMMON_TICKER_ALIASES: Record<string, string[]> = {
  MELI: ['MELI', 'MERCADO LIBRE', 'MERCADOLIBRE'],
  TSLA: ['TSLA', 'TESLA'],
  BTC: ['BTC', 'BITCOIN'],
  ETH: ['ETH', 'ETHEREUM'],
  GOOGL: ['GOOGL', 'GOOGLE', 'ALPHABET'],
  GOOG: ['GOOG', 'GOOGLE', 'ALPHABET'],
  NVDA: ['NVDA', 'NVIDIA'],
  AVGO: ['AVGO', 'BROADCOM'],
  TSM: ['TSM', 'TSMC', 'TAIWAN SEMICONDUCTOR'],
  MU: ['MU', 'MICRON'],
};

export type MonthlyPlanProgressItem = {
  item: MonthlyInvestmentPlanItem;
  completed: boolean;
  historicallyCompleted: boolean;
  matchedEntryIds: string[];
  historicalMatchedEntryIds: string[];
  referenceAmount: number;
  referencePrice: number;
  referenceCurrency: string;
  targetUnits: number;
  hasReferencePrice: boolean;
  priceSource: FinancePriceSource;
};

export type MonthlyPlanProgress = {
  items: MonthlyPlanProgressItem[];
  completedCount: number;
  totalCount: number;
  missingLabels: string[];
  completedLabels: string[];
  percent: number;
  pendingReferenceTotal: number;
  completedReferenceTotal: number;
  totalReferenceAmount: number;
  itemsWithoutReferencePrice: string[];
  pendingWithPriceCount: number;
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizePlanLabel(value: string): string {
  return stripAccents(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** Ticker: 1–8 chars, letras/números/punto/guion (ej. BRK.B). */
export function looksLikeTickerToken(token: string): boolean {
  return /^[A-Z0-9][A-Z0-9.-]{0,7}$/.test(token) && token.length >= 1 && token.length <= 8;
}

function isCompoundPhrase(norm: string): boolean {
  if (COMPOUND_PHRASES.some((p) => norm === p)) return true;
  if (norm.includes('CEDEAR') && norm.split(/\s+/).length > 1) return true;
  if (norm === 'MERCADO LIBRE' || norm.startsWith('MERCADO LIBRE ')) return true;
  return false;
}

function expandFragment(fragment: string): string[] {
  const norm = normalizePlanLabel(fragment);
  if (!norm) return [];

  if (isCompoundPhrase(norm)) {
    return [norm.slice(0, MAX_LABEL_LENGTH)];
  }

  const tokens = norm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  if (tokens.length === 1) {
    return [tokens[0].slice(0, MAX_LABEL_LENGTH)];
  }

  if (tokens.every(looksLikeTickerToken)) {
    return tokens.map((t) => t.slice(0, MAX_LABEL_LENGTH));
  }

  return [norm.slice(0, MAX_LABEL_LENGTH)];
}

export function parseInvestmentPlanInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const results: string[] = [];

  const pushLabels = (labels: string[]) => {
    for (const label of labels) {
      const norm = normalizePlanLabel(label);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      results.push(norm.slice(0, MAX_LABEL_LENGTH));
      if (results.length >= MAX_ITEMS_PER_PARSE) return;
    }
  };

  const fragments = trimmed
    .split(STRONG_SEPARATORS)
    .map((s) => s.trim())
    .filter(Boolean);

  if (fragments.length === 0) {
    pushLabels(expandFragment(trimmed));
  } else {
    for (const fragment of fragments) {
      pushLabels(expandFragment(fragment));
      if (results.length >= MAX_ITEMS_PER_PARSE) break;
    }
  }

  return results.slice(0, MAX_ITEMS_PER_PARSE);
}

/** Item guardado como lista fusionada de tickers — ofrece botón “Separar”. */
export function planItemLabelLooksLikeMergedTickers(label: string): boolean {
  const norm = normalizePlanLabel(label);
  const tokens = norm.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  if (!tokens.every(looksLikeTickerToken)) return false;
  const parsed = parseInvestmentPlanInput(label);
  return parsed.length >= 2;
}

export function buildDefaultMatchTerms(label: string): string[] {
  const norm = normalizePlanLabel(label);
  const base = norm.split(' ')[0] ?? norm;

  if (COMMON_TICKER_ALIASES[base]) {
    return [...COMMON_TICKER_ALIASES[base]];
  }
  if (COMMON_TICKER_ALIASES[norm]) {
    return [...COMMON_TICKER_ALIASES[norm]];
  }
  if (norm.includes('CEDEAR')) {
    return ['CEDEAR', 'CEDEARS'];
  }

  return [norm];
}

export function getPlanTickersForPricing(
  plan: MonthlyInvestmentPlanItem[] | undefined,
  month: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of getMonthlyPlanItems(plan, month)) {
    const label = normalizePlanLabel(item.label);
    const base = label.split(' ')[0] ?? label;
    if (!looksLikeTickerToken(base)) continue;
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base);
  }
  return out;
}

function resolveItemPrice(
  item: MonthlyInvestmentPlanItem,
  prices?: FinancePricesMap,
): {
  referencePrice: number;
  referenceAmount: number;
  referenceCurrency: string;
  targetUnits: number;
  hasReferencePrice: boolean;
  priceSource: FinancePriceSource;
} {
  const targetUnits = item.targetUnits ?? 1;
  const label = normalizePlanLabel(item.label);
  const base = label.split(' ')[0] ?? label;

  const external = prices?.[label] ?? prices?.[base];
  if (
    external &&
    external.price > 0 &&
    (external.source === 'google-finance' || external.source === 'yahoo-finance')
  ) {
    const referencePrice = external.price;
    const referenceCurrency = external.currency ?? (external.source === 'yahoo-finance' ? 'USD' : 'ARS');
    return {
      referencePrice,
      referenceAmount: referencePrice * targetUnits,
      referenceCurrency,
      targetUnits,
      hasReferencePrice: true,
      priceSource: external.source,
    };
  }

  const stored = item.referencePrice ?? 0;
  if (stored > 0) {
    return {
      referencePrice: stored,
      referenceAmount: stored * targetUnits,
      referenceCurrency: 'ARS',
      targetUnits,
      hasReferencePrice: true,
      priceSource: 'fallback',
    };
  }

  return {
    referencePrice: 0,
    referenceAmount: 0,
    referenceCurrency: 'ARS',
    targetUnits,
    hasReferencePrice: false,
    priceSource: 'missing',
  };
}

export function getMonthlyPlanItems(
  plan: MonthlyInvestmentPlanItem[] | undefined,
  month: string,
): MonthlyInvestmentPlanItem[] {
  return (plan ?? [])
    .filter((item) => item.month === month)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export function getPreviousMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match por palabra completa en tickers; frases multi-palabra por includes. */
export function textContainsTerm(text: string, term: string): boolean {
  const normText = normalizePlanLabel(text);
  const normTerm = normalizePlanLabel(term);
  if (!normTerm || !normText) return false;

  if (normTerm.includes(' ')) {
    return normText.includes(normTerm);
  }

  const re = new RegExp(`(?:^|[^A-Z0-9.])${escapeRegex(normTerm)}(?:[^A-Z0-9.]|$)`);
  return re.test(normText);
}

function entryFieldValues(entry: FinanceEntry): string[] {
  const fields: string[] = [];
  if (entry.category) fields.push(entry.category);
  if (entry.note) fields.push(entry.note);
  if (entry.asset) fields.push(entry.asset.replace(/_/g, ' '));
  if (entry.platform) fields.push(entry.platform);
  return fields;
}

function assetMatchesPlanItem(entry: FinanceEntry, item: MonthlyInvestmentPlanItem): boolean {
  if (!entry.asset) return false;
  const assetNorm = normalizePlanLabel(entry.asset.replace(/_/g, ' '));
  const labelNorm = normalizePlanLabel(item.label);

  if (labelNorm.includes('CEDEAR') && (assetNorm === 'CEDEAR' || assetNorm.includes('CEDEAR'))) {
    return true;
  }
  if ((labelNorm.includes('BTC') || item.matchTerms.includes('BTC')) && assetNorm === 'BTC') {
    return true;
  }
  if ((labelNorm.includes('ETH') || item.matchTerms.includes('ETH')) && assetNorm === 'ETH') {
    return true;
  }

  return item.matchTerms.some(
    (term) => assetNorm === term || textContainsTerm(assetNorm, term),
  );
}

function fieldsMatchPlanItem(entry: FinanceEntry, item: MonthlyInvestmentPlanItem): boolean {
  const fields = entryFieldValues(entry);
  if (fields.length === 0) return false;
  return item.matchTerms.some((term) => fields.some((field) => textContainsTerm(field, term)));
}

function entryMatchesPlanItemCore(
  entry: FinanceEntry,
  item: MonthlyInvestmentPlanItem,
  options?: { ignoreMonth?: boolean },
): boolean {
  if (entry.type !== 'investment') return false;
  if (!options?.ignoreMonth && entry.month !== item.month) return false;

  if (assetMatchesPlanItem(entry, item)) return true;
  return fieldsMatchPlanItem(entry, item);
}

export function entryMatchesPlanItem(entry: FinanceEntry, item: MonthlyInvestmentPlanItem): boolean {
  return entryMatchesPlanItemCore(entry, item);
}

export function historicalEntryMatchesPlanItem(
  entry: FinanceEntry,
  item: MonthlyInvestmentPlanItem,
): boolean {
  return entryMatchesPlanItemCore(entry, item, { ignoreMonth: true });
}

export function getMonthlyPlanProgress(params: {
  plan: MonthlyInvestmentPlanItem[] | undefined;
  entries: FinanceEntry[];
  month: string;
  prices?: FinancePricesMap;
}): MonthlyPlanProgress {
  const items = getMonthlyPlanItems(params.plan, params.month);
  const allInvestments = params.entries.filter((e) => e.type === 'investment');
  const monthEntries = allInvestments.filter((e) => e.month === params.month);

  let pendingReferenceTotal = 0;
  let completedReferenceTotal = 0;
  let totalReferenceAmount = 0;
  const itemsWithoutReferencePrice: string[] = [];

  const progressItems: MonthlyPlanProgressItem[] = items.map((item) => {
    const matchedEntryIds = monthEntries
      .filter((e) => entryMatchesPlanItem(e, item))
      .map((e) => e.id);
    const historicalMatchedEntryIds = allInvestments
      .filter((e) => historicalEntryMatchesPlanItem(e, item))
      .map((e) => e.id);
    const completed = matchedEntryIds.length > 0;
    const historicallyCompleted = historicalMatchedEntryIds.length > 0;
    const ref = resolveItemPrice(item, params.prices);

    totalReferenceAmount += ref.referenceCurrency === 'ARS' ? ref.referenceAmount : 0;
    if (!ref.hasReferencePrice) {
      itemsWithoutReferencePrice.push(item.label);
    }
    if (completed) {
      if (ref.referenceCurrency === 'ARS') completedReferenceTotal += ref.referenceAmount;
    } else if (ref.referenceCurrency === 'ARS') {
      pendingReferenceTotal += ref.referenceAmount;
    }

    return {
      item,
      completed,
      historicallyCompleted: completed || historicallyCompleted,
      matchedEntryIds,
      historicalMatchedEntryIds,
      referenceAmount: ref.referenceAmount,
      referencePrice: ref.referencePrice,
      referenceCurrency: ref.referenceCurrency,
      targetUnits: ref.targetUnits,
      hasReferencePrice: ref.hasReferencePrice,
      priceSource: ref.priceSource,
    };
  });

  const completedCount = progressItems.filter((p) => p.completed).length;
  const totalCount = progressItems.length;
  const missingLabels = progressItems.filter((p) => !p.completed).map((p) => p.item.label);
  const completedLabels = progressItems.filter((p) => p.completed).map((p) => p.item.label);
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const pendingWithPriceCount = progressItems.filter((p) => !p.completed && p.hasReferencePrice).length;

  return {
    items: progressItems,
    completedCount,
    totalCount,
    missingLabels,
    completedLabels,
    percent,
    pendingReferenceTotal,
    completedReferenceTotal,
    totalReferenceAmount,
    itemsWithoutReferencePrice,
    pendingWithPriceCount,
  };
}

export function getNewlyCompletedPlanLabels(
  before: MonthlyPlanProgress,
  after: MonthlyPlanProgress,
): string[] {
  const wasPending = new Set(
    before.items.filter((p) => !p.completed).map((p) => normalizePlanLabel(p.item.label)),
  );
  return after.items
    .filter((p) => p.completed && wasPending.has(normalizePlanLabel(p.item.label)))
    .map((p) => p.item.label);
}

export function createMonthlyInvestmentPlanItem(params: {
  month: string;
  label: string;
}): MonthlyInvestmentPlanItem {
  const labels = parseInvestmentPlanInput(params.label);
  const singleLabel = labels.length === 1 ? labels[0] : normalizePlanLabel(params.label);
  const label = singleLabel;
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    month: params.month,
    label,
    matchTerms: buildDefaultMatchTerms(label),
    createdAt: new Date().toISOString(),
    targetUnits: 1,
  };
}

export function createMonthlyInvestmentPlanItems(params: {
  month: string;
  rawInput: string;
  existingItems?: MonthlyInvestmentPlanItem[];
}): MonthlyInvestmentPlanItem[] {
  const labels = parseInvestmentPlanInput(params.rawInput);
  const existing = getMonthlyPlanItems(params.existingItems, params.month);
  const existingLabels = new Set(existing.map((i) => normalizePlanLabel(i.label)));

  const newItems: MonthlyInvestmentPlanItem[] = [];
  for (const label of labels) {
    const norm = normalizePlanLabel(label);
    if (existingLabels.has(norm)) continue;
    existingLabels.add(norm);
    newItems.push(createMonthlyInvestmentPlanItem({ month: params.month, label }));
  }
  return newItems;
}

export function copyMonthlyPlanItemsToMonth(params: {
  plan: MonthlyInvestmentPlanItem[] | undefined;
  fromMonth: string;
  toMonth: string;
}): MonthlyInvestmentPlanItem[] {
  const source = getMonthlyPlanItems(params.plan, params.fromMonth);
  const existing = getMonthlyPlanItems(params.plan, params.toMonth);
  const existingLabels = new Set(existing.map((i) => normalizePlanLabel(i.label)));

  const copied: MonthlyInvestmentPlanItem[] = [];
  for (const item of source) {
    const labels = parseInvestmentPlanInput(item.label);
    const toCreate = labels.length > 0 ? labels : [item.label];
    for (const label of toCreate) {
      const norm = normalizePlanLabel(label);
      if (existingLabels.has(norm)) continue;
      existingLabels.add(norm);
      const created = createMonthlyInvestmentPlanItem({ month: params.toMonth, label });
      if (item.referencePrice !== undefined && item.referencePrice > 0) {
        created.referencePrice = item.referencePrice;
      }
      if (item.targetUnits !== undefined && item.targetUnits > 0) {
        created.targetUnits = item.targetUnits;
      }
      copied.push(created);
    }
  }
  return copied;
}

/** Lista legible: "GOOGL, MU y NVDA" */
export function formatLabelList(labels: string[], maxVisible = 5): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  if (labels.length <= maxVisible) {
    return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  }
  const shown = labels.slice(0, maxVisible);
  const rest = labels.length - maxVisible;
  return `${shown.join(', ')} y ${rest} más`;
}

/** @deprecated usar formatLabelList */
export function formatPlanMissingList(labels: string[]): string {
  return formatLabelList(labels, labels.length);
}

/** Toast: máximo N labels visibles + "y X más" */
export function formatPlanMissingListForToast(labels: string[], maxVisible = 4): string {
  return formatLabelList(labels, maxVisible);
}

/** Mensaje UI: "Te falta: GOOGL, MU y NVDA" */
export function formatPlanMissingMessage(labels: string[]): string {
  if (labels.length === 0) return '';
  return `Te falta: ${formatLabelList(labels, 5)}`;
}
