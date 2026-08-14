import { compareIsoDates, type IsoDate } from '@/lib/panel/dates';
import type { ChargeStatus } from '@/lib/panel/types';

export type ChargeStatusInput = {
  dueDate: IsoDate;
  hasPayment: boolean;
  today: IsoDate;
};

/**
 * Estados derivados (no se guardan en DB):
 *
 * - paid: hay payment
 * - upcoming: today < due_date (aún no “debe”)
 * - due_today: today = due_date
 * - overdue: today > due_date sin payment
 */
export function calculateChargeStatus(input: ChargeStatusInput): ChargeStatus {
  if (input.hasPayment) return 'paid';

  const cmp = compareIsoDates(input.today, input.dueDate);
  if (cmp < 0) return 'upcoming';
  if (cmp === 0) return 'due_today';
  return 'overdue';
}
