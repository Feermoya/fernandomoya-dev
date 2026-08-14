import {
  calculateDueDate,
  compareIsoDates,
  shiftPeriod,
  toPeriodStart,
  type IsoDate,
} from '@/lib/panel/dates';
import {
  shouldGenerateRecurringCharge,
  type ServiceForChargeGeneration,
} from '@/lib/panel/charges/planRecurring';
import type { Currency } from '@/lib/panel/types';

export type ExistingChargeForProjection = {
  id: string;
  service_id: string;
  period: string | null;
  due_date: string;
  /** true si ya hay payment asociado */
  hasPayment: boolean;
};

export type ServiceForNextExpected = ServiceForChargeGeneration & {
  client_id: string;
  name: string;
  client_name: string;
};

/** Próximo vencimiento esperado (proyección; no se persiste). */
export type NextExpectedCharge = {
  serviceId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  period: IsoDate;
  dueDate: IsoDate;
  referenceAmount: number;
  referenceCurrency: Currency;
  /** Si ya existe un charge unpaid futuro, su id; si no, null (solo proyección). */
  chargeId: string | null;
};

const MAX_PERIOD_STEPS = 36;

/**
 * Calcula el próximo vencimiento futuro de un servicio recurrente activo.
 * No crea charges. No inventa overdue.
 *
 * Regla: due_date estrictamente posterior a `today`.
 */
export function getNextExpectedCharge(
  service: ServiceForNextExpected,
  existingCharges: ExistingChargeForProjection[],
  today: IsoDate,
): NextExpectedCharge | null {
  if (!service.active) return null;
  if (service.billing_type !== 'recurring') return null;
  if (service.billing_mode == null || service.due_day == null) return null;
  if (service.ended_at && service.ended_at < today) {
    // Terminó antes de hoy: no hay próximo a controlar.
    // shouldGenerate también cubre períodos posteriores a ended_at.
  }

  const mine = existingCharges.filter((c) => c.service_id === service.id);

  // Si ya hay unpaid con due futuro, ese es el próximo real.
  const unpaidFuture = mine
    .filter((c) => !c.hasPayment && compareIsoDates(c.due_date, today) > 0)
    .sort((a, b) => compareIsoDates(a.due_date, b.due_date));
  if (unpaidFuture[0]) {
    const row = unpaidFuture[0];
    const period = row.period ? toPeriodStart(row.period) : null;
    if (period && shouldGenerateRecurringCharge(service, period)) {
      return {
        serviceId: service.id,
        clientId: service.client_id,
        clientName: service.client_name,
        serviceName: service.name,
        period,
        dueDate: row.due_date,
        referenceAmount: service.reference_amount,
        referenceCurrency: service.reference_currency,
        chargeId: row.id,
      };
    }
  }

  const periods = mine
    .map((c) => c.period)
    .filter((p): p is string => Boolean(p))
    .map(toPeriodStart)
    .sort((a, b) => compareIsoDates(a, b));

  let period: IsoDate =
    periods.length > 0
      ? shiftPeriod(periods[periods.length - 1], 1)
      : toPeriodStart(service.start_date);

  for (let step = 0; step < MAX_PERIOD_STEPS; step++) {
    if (!shouldGenerateRecurringCharge(service, period)) return null;

    const dueDate = calculateDueDate(period, service.billing_mode, service.due_day);
    const existing = mine.find(
      (c) => c.period != null && toPeriodStart(c.period) === period,
    );

    if (existing?.hasPayment) {
      period = shiftPeriod(period, 1);
      continue;
    }

    if (compareIsoDates(dueDate, today) > 0) {
      return {
        serviceId: service.id,
        clientId: service.client_id,
        clientName: service.client_name,
        serviceName: service.name,
        period,
        dueDate,
        referenceAmount: service.reference_amount,
        referenceCurrency: service.reference_currency,
        chargeId: existing && !existing.hasPayment ? existing.id : null,
      };
    }

    // due_date <= today: ya pasó (pagado o sería overdue). Seguir al siguiente período.
    period = shiftPeriod(period, 1);
  }

  return null;
}

export function listNextExpectedCharges(
  services: ServiceForNextExpected[],
  existingCharges: ExistingChargeForProjection[],
  today: IsoDate,
): NextExpectedCharge[] {
  const items: NextExpectedCharge[] = [];
  for (const service of services) {
    const next = getNextExpectedCharge(service, existingCharges, today);
    if (next) items.push(next);
  }
  return items.sort((a, b) => {
    const byDate = compareIsoDates(a.dueDate, b.dueDate);
    if (byDate !== 0) return byDate;
    return a.clientName.localeCompare(b.clientName, 'es');
  });
}
