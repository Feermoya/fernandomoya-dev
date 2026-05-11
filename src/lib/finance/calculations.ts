import type { FinanceEntry, FinanceGoal } from '@/lib/finance/types';

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatARS(value: number): string {
  return ars.format(Number.isFinite(value) ? value : 0);
}

export function getEntriesByMonth(entries: FinanceEntry[], month: string): FinanceEntry[] {
  return entries.filter((e) => e.month === month);
}

export function getMonthlyIncome(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'income');
}

export function getMonthlyFixedExpenses(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'fixed_expense');
}

export function getMonthlyVariableExpenses(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'variable_expense');
}

export function getMonthlyInvested(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'investment');
}

export function getMonthlySaved(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'saving');
}

export function getMonthlyDebtPayments(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'debt_payment');
}

export function getMonthlyFreeSpending(entries: FinanceEntry[], month: string): number {
  return sumByType(entries, month, 'free_spending');
}

export function getMonthlyRemaining(entries: FinanceEntry[], month: string): number {
  const income = getMonthlyIncome(entries, month);
  const fixed = getMonthlyFixedExpenses(entries, month);
  const variable = getMonthlyVariableExpenses(entries, month);
  const free = getMonthlyFreeSpending(entries, month);
  const debt = getMonthlyDebtPayments(entries, month);
  return income - fixed - variable - free - debt;
}

export function getSavingRate(entries: FinanceEntry[], month: string): number {
  const income = getMonthlyIncome(entries, month);
  if (income <= 0) return 0;
  const invested = getMonthlyInvested(entries, month);
  const saved = getMonthlySaved(entries, month);
  return ((invested + saved) / income) * 100;
}

export function getTotalInvested(entries: FinanceEntry[]): number {
  return entries.filter((e) => e.type === 'investment').reduce((s, e) => s + e.amount, 0);
}

export function getTotalSaved(entries: FinanceEntry[]): number {
  return entries.filter((e) => e.type === 'saving').reduce((s, e) => s + e.amount, 0);
}

export function getTotalDebtPayments(entries: FinanceEntry[]): number {
  return entries.filter((e) => e.type === 'debt_payment').reduce((s, e) => s + e.amount, 0);
}

export function getNetProgress(entries: FinanceEntry[]): number {
  return getTotalInvested(entries) + getTotalSaved(entries) - getTotalDebtPayments(entries);
}

/** Suma ahorro + inversión del mes (lo que “construye”). */
export function getMonthlyPipe(entries: FinanceEntry[], month: string): number {
  return getMonthlyInvested(entries, month) + getMonthlySaved(entries, month);
}

export function getEmergencyFundTotal(
  entries: FinanceEntry[],
  goals: FinanceGoal[],
): number {
  const fromGoals = goals
    .filter((g) => g.category === 'emergency')
    .reduce((s, g) => s + g.currentAmount, 0);
  const fromEntries = entries
    .filter((e) => e.type === 'saving' && e.asset === 'EMERGENCY_FUND')
    .reduce((s, e) => s + e.amount, 0);
  return Math.max(fromGoals, fromEntries);
}

export function getTotalWealth(entries: FinanceEntry[]): number {
  return getTotalInvested(entries) + getTotalSaved(entries);
}

function sumByType(
  entries: FinanceEntry[],
  month: string,
  type: FinanceEntry['type'],
): number {
  return getEntriesByMonth(entries, month)
    .filter((e) => e.type === type)
    .reduce((s, e) => s + e.amount, 0);
}
