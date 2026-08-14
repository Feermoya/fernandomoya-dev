import type { BillingMode, Currency, Service } from '@/lib/panel/types';
import {
  calculateDueDate,
  toPeriodStart,
  shiftPeriod,
  type IsoDate,
} from '@/lib/panel/dates';
import { freezeChargeReference } from '@/lib/panel/payments';

export type ServiceForChargeGeneration = Pick<
  Service,
  | 'id'
  | 'active'
  | 'billing_type'
  | 'billing_mode'
  | 'due_day'
  | 'reference_amount'
  | 'reference_currency'
  | 'start_date'
  | 'ended_at'
>;

export type PlannedRecurringCharge = {
  service_id: string;
  period: IsoDate;
  reference_amount: number;
  reference_currency: Currency;
  due_date: IsoDate;
};

/**
 * Período del servicio que se cobra durante el mes operativo.
 *
 * - previous_month: en agosto se cobra el servicio de julio → period = mes anterior
 * - current_month: en agosto se cobra el servicio de agosto → period = mismo mes
 */
export function resolveServicePeriodForOperationalMonth(
  operationalMonth: IsoDate,
  billingMode: BillingMode,
): IsoDate {
  const op = toPeriodStart(operationalMonth);
  if (billingMode === 'previous_month') {
    return shiftPeriod(op, -1);
  }
  return op;
}

/**
 * ¿Corresponde generar un charge de `period` para este servicio?
 * one_time / inactive / sin schedule → no.
 * period anterior a start_date → no.
 * period posterior a ended_at → no.
 */
export function shouldGenerateRecurringCharge(
  service: ServiceForChargeGeneration,
  period: IsoDate,
): boolean {
  if (!service.active) return false;
  if (service.billing_type !== 'recurring') return false;
  if (service.billing_mode == null || service.due_day == null) return false;

  const periodStart = toPeriodStart(period);
  const serviceStart = toPeriodStart(service.start_date);
  if (periodStart < serviceStart) return false;

  if (service.ended_at) {
    // Si terminó antes del inicio del período, no generar.
    if (service.ended_at < periodStart) return false;
  }

  return true;
}

/** Construye el payload del charge (sin escribir en DB). */
export function buildRecurringChargeForOperationalMonth(
  service: ServiceForChargeGeneration,
  operationalMonth: IsoDate,
): PlannedRecurringCharge | null {
  if (service.billing_type !== 'recurring') return null;
  if (service.billing_mode == null || service.due_day == null) return null;

  const period = resolveServicePeriodForOperationalMonth(operationalMonth, service.billing_mode);
  if (!shouldGenerateRecurringCharge(service, period)) return null;

  const frozen = freezeChargeReference(service);
  const due_date = calculateDueDate(period, service.billing_mode, service.due_day);

  return {
    service_id: service.id,
    period,
    reference_amount: frozen.reference_amount,
    reference_currency: frozen.reference_currency,
    due_date,
  };
}

export function planRecurringChargesForOperationalMonth(
  services: ServiceForChargeGeneration[],
  operationalMonth: IsoDate,
): PlannedRecurringCharge[] {
  const planned: PlannedRecurringCharge[] = [];
  for (const service of services) {
    const charge = buildRecurringChargeForOperationalMonth(service, operationalMonth);
    if (charge) planned.push(charge);
  }
  return planned;
}
