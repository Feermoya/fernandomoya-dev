import { addCalendarMonths, getCalendarMonthKey } from '@/lib/finance/calculations';

export const FINANCE_MONTH_MANUAL_SESSION_KEY = 'finance-month-manual-session';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getCurrentMonthKey(date: Date = new Date()): string {
  return getCalendarMonthKey(date);
}

export function addMonthsToKey(monthKey: string, delta: number): string {
  return addCalendarMonths(monthKey, delta);
}

export function formatMonthLongEs(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const formatted = new Date(y, m - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toLowerCase() + formatted.slice(1);
}

export function isCurrentMonthKey(monthKey: string, date: Date = new Date()): boolean {
  return monthKey === getCurrentMonthKey(date);
}

export function isValidMonthKey(value: unknown): value is string {
  return typeof value === 'string' && MONTH_KEY_RE.test(value);
}

export function markMonthManuallyChanged(): void {
  try {
    sessionStorage.setItem(FINANCE_MONTH_MANUAL_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasManualMonthSelection(): boolean {
  try {
    return sessionStorage.getItem(FINANCE_MONTH_MANUAL_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split('-').map(Number);
  return { year: y || new Date().getFullYear(), month: m || 1 };
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Etiquetas cortas para grilla (ene, feb, …). */
export const MONTH_LABELS_SHORT_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;
