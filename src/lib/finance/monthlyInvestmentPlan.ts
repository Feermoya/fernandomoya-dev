import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizePlanLabel(value: string): string {
  return stripAccents(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function buildDefaultMatchTerms(label: string): string[] {
  const norm = normalizePlanLabel(label);
  const base = norm.split(' ')[0] ?? norm;

  if (base === 'MELI' || norm.includes('MELI') || norm.includes('MERCADO LIBRE')) {
    return ['MELI', 'MERCADO LIBRE', 'MERCADOLIBRE'];
  }
  if (base === 'TSLA' || norm.includes('TSLA') || norm === 'TESLA') {
    return ['TSLA', 'TESLA'];
  }
  if (base === 'BTC' || norm.includes('BITCOIN')) {
    return ['BTC', 'BITCOIN'];
  }
  if (base === 'ETH' || norm.includes('ETHEREUM')) {
    return ['ETH', 'ETHEREUM'];
  }
  if (norm.includes('CEDEAR')) {
    return ['CEDEAR', 'CEDEARS'];
  }

  return [norm];
}

export function getMonthlyPlanItems(
  plan: MonthlyInvestmentPlanItem[] | undefined,
  month: string,
): MonthlyInvestmentPlanItem[] {
  return (plan ?? [])
    .filter((item) => item.month === month)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

function entrySearchBlob(entry: FinanceEntry): string {
  const parts: string[] = [];
  if (entry.category) parts.push(entry.category);
  if (entry.note) parts.push(entry.note);
  if (entry.asset) parts.push(entry.asset.replace(/_/g, ' '));
  if (entry.platform) parts.push(entry.platform);
  return normalizePlanLabel(parts.join(' '));
}

function haystackIncludesTerm(haystack: string, term: string): boolean {
  if (!term) return false;
  if (term.length <= 4) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^A-Z0-9])${escaped}(?:[^A-Z0-9]|$)`);
    return re.test(haystack);
  }
  return haystack.includes(term);
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

  return item.matchTerms.some((term) => assetNorm === term || haystackIncludesTerm(assetNorm, term));
}

export function entryMatchesPlanItem(entry: FinanceEntry, item: MonthlyInvestmentPlanItem): boolean {
  if (entry.type !== 'investment') return false;
  if (entry.month !== item.month) return false;

  if (assetMatchesPlanItem(entry, item)) return true;

  const haystack = entrySearchBlob(entry);
  if (!haystack) return false;

  return item.matchTerms.some((term) => haystackIncludesTerm(haystack, term));
}

export function getMonthlyPlanProgress(params: {
  plan: MonthlyInvestmentPlanItem[] | undefined;
  entries: FinanceEntry[];
  month: string;
}): {
  items: Array<{
    item: MonthlyInvestmentPlanItem;
    completed: boolean;
    matchedEntryIds: string[];
  }>;
  completedCount: number;
  totalCount: number;
  missingLabels: string[];
  completedLabels: string[];
  percent: number;
} {
  const items = getMonthlyPlanItems(params.plan, params.month);
  const monthEntries = params.entries.filter((e) => e.month === params.month && e.type === 'investment');

  const progressItems = items.map((item) => {
    const matchedEntryIds = monthEntries.filter((e) => entryMatchesPlanItem(e, item)).map((e) => e.id);
    return {
      item,
      completed: matchedEntryIds.length > 0,
      matchedEntryIds,
    };
  });

  const completedCount = progressItems.filter((p) => p.completed).length;
  const totalCount = progressItems.length;
  const missingLabels = progressItems.filter((p) => !p.completed).map((p) => p.item.label);
  const completedLabels = progressItems.filter((p) => p.completed).map((p) => p.item.label);
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    items: progressItems,
    completedCount,
    totalCount,
    missingLabels,
    completedLabels,
    percent,
  };
}

export function createMonthlyInvestmentPlanItem(params: {
  month: string;
  label: string;
}): MonthlyInvestmentPlanItem {
  const label = normalizePlanLabel(params.label);
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    month: params.month,
    label,
    matchTerms: buildDefaultMatchTerms(label),
    createdAt: new Date().toISOString(),
  };
}

/** Formato corto para toasts: "TSLA, BTC" */
export function formatPlanMissingList(labels: string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

/** Mensaje UI: "Te falta TSLA" / "Te falta TSLA, BTC y CEDEARS" */
export function formatPlanMissingMessage(labels: string[]): string {
  if (labels.length === 0) return '';
  return `Te falta ${formatPlanMissingList(labels)}`;
}
