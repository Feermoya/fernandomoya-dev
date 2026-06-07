import type { FinanceEntry } from '@/lib/finance/types';

export type TickerMonthlyBreakdownItem = {
  label: string;
  amount: number;
  count: number;
  percent: number;
};

export type TickerMonthlyBreakdown = {
  items: TickerMonthlyBreakdownItem[];
  topItem: TickerMonthlyBreakdownItem | null;
  total: number;
  concentrationWarning: boolean;
};

function breakdownLabel(entry: FinanceEntry): string {
  const category = entry.category?.trim();
  if (category) return category.toUpperCase();
  if (entry.asset) return entry.asset.replace(/_/g, ' ').trim().toUpperCase();
  return 'OTRO';
}

export function getTickerMonthlyBreakdown(entries: FinanceEntry[], month: string): TickerMonthlyBreakdown {
  const investments = entries.filter(
    (e) => e.type === 'investment' && e.month === month && e.amount > 0,
  );

  const buckets = new Map<string, { amount: number; count: number }>();
  for (const entry of investments) {
    const label = breakdownLabel(entry);
    const row = buckets.get(label) ?? { amount: 0, count: 0 };
    row.amount += entry.amount;
    row.count += 1;
    buckets.set(label, row);
  }

  const total = investments.reduce((sum, e) => sum + e.amount, 0);
  const items: TickerMonthlyBreakdownItem[] = [...buckets.entries()]
    .map(([label, row]) => ({
      label,
      amount: row.amount,
      count: row.count,
      percent: total > 0 ? (row.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topItem = items[0] ?? null;
  const concentrationWarning =
    topItem !== null && items.length >= 2 && topItem.percent >= 60;

  return { items, topItem, total, concentrationWarning };
}
