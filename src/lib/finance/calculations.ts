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

/** Mínimo mensual (ARS) para contar mes como “racha activa” estilo Duolingo. */
export const MONTHLY_STREAK_MINIMUM_ARS = 10_000;

export function getCalendarMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function previousCalendarMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addCalendarMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Orden lexicográfico seguro para `YYYY-MM`. */
export function compareMonthKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export type MonthlyStreakStatus = 'protected' | 'pending' | 'broken';

export type MonthlyStreakInfo = {
  streakCount: number;
  status: MonthlyStreakStatus;
  currentMonthInvested: number;
  minimumRequired: number;
  missingForCurrentMonth: number;
  completedCurrentMonth: boolean;
  progressPercent: number;
};

function countConsecutiveQualifiedMonthsBackward(entries: FinanceEntry[], startMonth: string): number {
  const min = MONTHLY_STREAK_MINIMUM_ARS;
  let count = 0;
  let cursor = startMonth;
  const maxSteps = 600;
  for (let step = 0; step < maxSteps; step += 1) {
    if (getMonthlyInvested(entries, cursor) >= min) {
      count += 1;
      cursor = previousCalendarMonth(cursor);
    } else {
      break;
    }
  }
  return count;
}

/**
 * Racha mensual: cada mes cuenta si invirtió ≥ {@link MONTHLY_STREAK_MINIMUM_ARS}.
 * Mes calendario actual sin mínimo → `pending` (no rompe hasta fin de mes).
 * Mes pasado sin mínimo → `broken`.
 */
export function getMonthlyInvestmentStreak(
  entries: FinanceEntry[],
  referenceMonth: string,
): MonthlyStreakInfo {
  const min = MONTHLY_STREAK_MINIMUM_ARS;
  const todayMonth = getCalendarMonthKey();
  const invRef = getMonthlyInvested(entries, referenceMonth);
  const completedCurrentMonth = invRef >= min;
  const missingForCurrentMonth = Math.max(0, min - invRef);
  const progressPercent = min > 0 ? Math.min(100, Math.round((invRef / min) * 100)) : 100;

  const cmpToday = compareMonthKeys(referenceMonth, todayMonth);
  const prev = previousCalendarMonth(referenceMonth);
  const tailBeforeRef = countConsecutiveQualifiedMonthsBackward(entries, prev);

  if (cmpToday > 0) {
    return {
      streakCount: tailBeforeRef,
      status: 'pending',
      currentMonthInvested: invRef,
      minimumRequired: min,
      missingForCurrentMonth,
      completedCurrentMonth: false,
      progressPercent,
    };
  }

  if (referenceMonth === todayMonth) {
    if (completedCurrentMonth) {
      return {
        streakCount: 1 + tailBeforeRef,
        status: 'protected',
        currentMonthInvested: invRef,
        minimumRequired: min,
        missingForCurrentMonth: 0,
        completedCurrentMonth: true,
        progressPercent: 100,
      };
    }
    return {
      streakCount: tailBeforeRef,
      status: 'pending',
      currentMonthInvested: invRef,
      minimumRequired: min,
      missingForCurrentMonth,
      completedCurrentMonth: false,
      progressPercent,
    };
  }

  if (completedCurrentMonth) {
    return {
      streakCount: 1 + tailBeforeRef,
      status: 'protected',
      currentMonthInvested: invRef,
      minimumRequired: min,
      missingForCurrentMonth: 0,
      completedCurrentMonth: true,
      progressPercent: 100,
    };
  }

  return {
    streakCount: tailBeforeRef,
    status: 'broken',
    currentMonthInvested: invRef,
    minimumRequired: min,
    missingForCurrentMonth,
    completedCurrentMonth: false,
    progressPercent,
  };
}

export type EntryFormStreakVariant = 'protected' | 'pending_empty' | 'pending_gap' | 'neutral';

export type EntryFormStreakCopy = {
  variant: EntryFormStreakVariant;
  message: string;
  statusLabel: string;
};

export function getEntryFormStreakCopy(entries: FinanceEntry[], formMonth: string): EntryFormStreakCopy {
  const today = getCalendarMonthKey();
  if (formMonth !== today) {
    return {
      variant: 'neutral',
      statusLabel: 'Racha mensual',
      message: 'La racha se calcula sobre el mes actual.',
    };
  }
  const info = getMonthlyInvestmentStreak(entries, today);
  if (info.status === 'protected') {
    return {
      variant: 'protected',
      statusLabel: 'Racha protegida',
      message: 'Este mes ya alcanzaste el mínimo para mantener la racha.',
    };
  }
  if (info.status === 'pending') {
    if (info.currentMonthInvested <= 0) {
      return {
        variant: 'pending_empty',
        statusLabel: 'Racha en juego',
        message: `Con ${formatARS(MONTHLY_STREAK_MINIMUM_ARS)} este mes mantenés viva la racha.`,
      };
    }
    return {
      variant: 'pending_gap',
      statusLabel: 'Racha en juego',
      message:
        info.missingForCurrentMonth > 0
          ? `Te faltan ${formatARS(info.missingForCurrentMonth)} para proteger tu racha.`
          : `Invertí al menos ${formatARS(MONTHLY_STREAK_MINIMUM_ARS)} este mes para protegerla.`,
    };
  }
  return {
    variant: 'neutral',
    statusLabel: 'Racha',
    message: 'Un mes pasado quedó sin el mínimo. Podés reconstruir la racha desde este mes.',
  };
}
