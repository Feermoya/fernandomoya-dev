import type { BillingMode } from '@/lib/panel/types';

/** Fecha de calendario YYYY-MM-DD (sin zona horaria). */
export type IsoDate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string, label = 'date'): IsoDate {
  if (!ISO_DATE_RE.test(value)) {
    throw new Error(`${label} inválida: se espera YYYY-MM-DD, recibió "${value}"`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`${label} inválida: "${value}" no existe en el calendario`);
  }
  return value;
}

export function toIsoDate(year: number, month1to12: number, day: number): IsoDate {
  const mm = String(month1to12).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return assertIsoDate(`${year}-${mm}-${dd}`);
}

export function parseIsoDateParts(iso: IsoDate): { year: number; month: number; day: number } {
  const value = assertIsoDate(iso);
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

/** Días del mes (month 1–12). */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Si due_day no existe en el mes, usa el último día válido. */
export function clampDueDay(year: number, month1to12: number, dueDay: number): number {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error(`due_day inválido: ${dueDay}`);
  }
  return Math.min(dueDay, daysInMonth(year, month1to12));
}

/** Normaliza cualquier fecha del mes al día 1 (estrategia de `period`). */
export function toPeriodStart(iso: IsoDate): IsoDate {
  const { year, month } = parseIsoDateParts(iso);
  return toIsoDate(year, month, 1);
}

export function addMonths(
  year: number,
  month1to12: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + (month1to12 - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** Desplaza un period (día 1) N meses. */
export function shiftPeriod(period: IsoDate, deltaMonths: number): IsoDate {
  const start = toPeriodStart(period);
  const { year, month } = parseIsoDateParts(start);
  const next = addMonths(year, month, deltaMonths);
  return toIsoDate(next.year, next.month, 1);
}

/**
 * Calcula due_date a partir del período del servicio.
 *
 * - current_month: vence en el mismo mes que `period`.
 * - previous_month: vence en el mes siguiente a `period`
 *   (cobrás en septiembre el servicio de agosto).
 *
 * `period` debe ser (o se normaliza a) el día 1 del mes del servicio.
 */
export function calculateDueDate(
  period: IsoDate,
  billingMode: BillingMode,
  dueDay: number,
): IsoDate {
  const start = toPeriodStart(period);
  const { year, month } = parseIsoDateParts(start);

  const target =
    billingMode === 'previous_month' ? addMonths(year, month, 1) : { year, month };

  const day = clampDueDay(target.year, target.month, dueDay);
  return toIsoDate(target.year, target.month, day);
}

/** Primer día del mes calendario que contiene `iso`. */
export function startOfMonth(iso: IsoDate): IsoDate {
  return toPeriodStart(iso);
}

export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  const left = assertIsoDate(a, 'a');
  const right = assertIsoDate(b, 'b');
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
