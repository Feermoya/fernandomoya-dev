import type { FinanceEntry } from '@/lib/finance/types';

export type InvestmentTimelinePoint = {
  month: string;
  monthArs: number;
  monthUsd: number;
  cumulativeArs: number;
  cumulativeUsd: number;
};

function validMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}
function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Sumas acumuladas de aportes. No son valorizaciones ni rentabilidad. ARS y USD separados. */
export function buildInvestmentTimeline(entries: FinanceEntry[], throughMonth: string): InvestmentTimelinePoint[] {
  if (!validMonth(throughMonth)) return [];
  const buckets = new Map<string, { ars: number; usd: number }>();
  for (const entry of entries) {
    if (entry.type !== 'investment' || !validMonth(entry.month) || entry.month > throughMonth ||
      !Number.isFinite(entry.amount) || entry.amount <= 0) continue;
    const row = buckets.get(entry.month) ?? { ars: 0, usd: 0 };
    if (entry.amountCurrency === 'USD') row.usd += entry.amount;
    else row.ars += entry.amount;
    buckets.set(entry.month, row);
  }
  const earliest = [...buckets.keys()].sort()[0];
  if (!earliest) return [];
  const result: InvestmentTimelinePoint[] = [];
  let ars = 0, usd = 0, month = earliest;
  // Hasta 100 años de datos por seguridad ante estados inválidos.
  for (let i = 0; i < 1200 && month <= throughMonth; i++) {
    const row = buckets.get(month) ?? { ars: 0, usd: 0 };
    ars += row.ars; usd += row.usd;
    result.push({ month, monthArs: row.ars, monthUsd: row.usd, cumulativeArs: ars, cumulativeUsd: usd });
    month = nextMonth(month);
  }
  return result;
}

/** Serie del año en curso (acumulado desde enero, no desde el inicio histórico). */
export function buildYearlyTimeline(entries: FinanceEntry[], year: number, throughMonth: string): InvestmentTimelinePoint[] {
  const full = buildInvestmentTimeline(entries, throughMonth);
  const yearStart = `${year}-01`;
  const before = full.filter(p => p.month < yearStart);
  const previousArs = before.at(-1)?.cumulativeArs ?? 0;
  const previousUsd = before.at(-1)?.cumulativeUsd ?? 0;
  return full.filter(p => p.month >= yearStart).map(p => ({
    ...p, cumulativeArs: Math.max(0, p.cumulativeArs - previousArs),
    cumulativeUsd: Math.max(0, p.cumulativeUsd - previousUsd),
  }));
}
