import type { FinanceEntry } from '@/lib/finance/types';

export type TickerHistoryItem = {
  label: string;
  totalAmount: number;
  count: number;
  firstMonth: string;
  lastMonth: string;
};

export type TickerHistorySummary = {
  items: TickerHistoryItem[];
};

function historyLabel(entry: FinanceEntry): string {
  const category = entry.category?.trim();
  if (category) return category.toUpperCase();
  if (entry.asset) return entry.asset.replace(/_/g, ' ').trim().toUpperCase();
  return 'OTRO';
}

export function getTickerHistorySummary(entries: FinanceEntry[]): TickerHistorySummary {
  const buckets = new Map<
    string,
    { totalAmount: number; count: number; firstMonth: string; lastMonth: string }
  >();

  for (const entry of entries) {
    if (entry.type !== 'investment' || entry.amount <= 0) continue;
    const label = historyLabel(entry);
    const row = buckets.get(label);
    if (!row) {
      buckets.set(label, {
        totalAmount: entry.amount,
        count: 1,
        firstMonth: entry.month,
        lastMonth: entry.month,
      });
      continue;
    }
    row.totalAmount += entry.amount;
    row.count += 1;
    if (entry.month < row.firstMonth) row.firstMonth = entry.month;
    if (entry.month > row.lastMonth) row.lastMonth = entry.month;
  }

  const items: TickerHistoryItem[] = [...buckets.entries()]
    .map(([label, row]) => ({ label, ...row }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return { items };
}
