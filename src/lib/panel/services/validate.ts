import { assertIsoDate, type IsoDate } from '@/lib/panel/dates';
import type { BillingMode, BillingType, Currency } from '@/lib/panel/types';

export type CreateServiceInput = {
  clientId: string;
  name: string;
  billingType: BillingType | string;
  referenceAmount: number | string;
  referenceCurrency: Currency | string;
  billingMode?: BillingMode | string | null;
  dueDay?: number | string | null;
  startDate: string;
  /** Solo one_time: fecha de vencimiento del charge puntual. */
  dueDate?: string | null;
};

export type UpdateServiceInput = {
  id: string;
  name: string;
  referenceAmount: number | string;
  referenceCurrency: Currency | string;
  billingMode?: BillingMode | string | null;
  dueDay?: number | string | null;
  active: boolean;
  endedAt?: string | null;
};

export type UpdateTariffInput = {
  id: string;
  referenceAmount: number | string;
};

export type DeactivateServiceInput = {
  id: string;
  endedAt?: string | null;
};

export type ValidatedCreateRecurringService = {
  client_id: string;
  name: string;
  billing_type: 'recurring';
  reference_amount: number;
  reference_currency: Currency;
  billing_mode: BillingMode;
  due_day: number;
  start_date: IsoDate;
  active: true;
};

export type ValidatedCreateOneTimeService = {
  client_id: string;
  name: string;
  billing_type: 'one_time';
  reference_amount: number;
  reference_currency: Currency;
  billing_mode: null;
  due_day: null;
  start_date: IsoDate;
  active: true;
  due_date: IsoDate;
};

export type ValidatedUpdateService = {
  id: string;
  name: string;
  reference_amount: number;
  reference_currency: Currency;
  billing_mode: BillingMode | null;
  due_day: number | null;
  active: boolean;
  ended_at: IsoDate | null;
};

function requireName(name: unknown): string {
  const n = String(name ?? '').trim();
  if (!n) throw new Error('El nombre del servicio es obligatorio');
  if (n.length > 200) throw new Error('Nombre demasiado largo');
  return n;
}

function parseAmount(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || Number.isNaN(n) || !(n > 0)) {
    throw new Error('La tarifa debe ser mayor que 0');
  }
  return Math.round(n * 100) / 100;
}

function parseCurrency(value: string): Currency {
  if (value === 'USD' || value === 'ARS') return value;
  throw new Error('Moneda inválida');
}

function parseBillingMode(value: string): BillingMode {
  if (value === 'previous_month' || value === 'current_month') return value;
  throw new Error('Modalidad inválida');
}

function parseDueDay(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    throw new Error('Día de vencimiento debe ser entre 1 y 31');
  }
  return n;
}

export function validateCreateService(
  input: CreateServiceInput,
): ValidatedCreateRecurringService | ValidatedCreateOneTimeService {
  const client_id = String(input.clientId || '').trim();
  if (!client_id) throw new Error('Falta el cliente');

  const billingType = String(input.billingType || '');
  const base = {
    client_id,
    name: requireName(input.name),
    reference_amount: parseAmount(input.referenceAmount),
    reference_currency: parseCurrency(String(input.referenceCurrency || '')),
    start_date: assertIsoDate(String(input.startDate || ''), 'start_date'),
    active: true as const,
  };

  if (billingType === 'recurring') {
    return {
      ...base,
      billing_type: 'recurring',
      billing_mode: parseBillingMode(String(input.billingMode || 'previous_month')),
      due_day: parseDueDay(input.dueDay ?? 10),
    };
  }

  if (billingType === 'one_time') {
    return {
      ...base,
      billing_type: 'one_time',
      billing_mode: null,
      due_day: null,
      due_date: assertIsoDate(String(input.dueDate || ''), 'due_date'),
    };
  }

  throw new Error('Tipo de servicio inválido');
}

export function validateUpdateService(
  input: UpdateServiceInput,
  currentBillingType: BillingType,
): ValidatedUpdateService {
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Falta el servicio');

  let billing_mode: BillingMode | null = null;
  let due_day: number | null = null;
  if (currentBillingType === 'recurring') {
    billing_mode = parseBillingMode(String(input.billingMode || ''));
    due_day = parseDueDay(input.dueDay ?? 10);
  }

  return {
    id,
    name: requireName(input.name),
    reference_amount: parseAmount(input.referenceAmount),
    reference_currency: parseCurrency(String(input.referenceCurrency || '')),
    billing_mode,
    due_day,
    active: Boolean(input.active),
    ended_at: input.endedAt ? assertIsoDate(String(input.endedAt), 'ended_at') : null,
  };
}

export function validateUpdateTariff(input: UpdateTariffInput): {
  id: string;
  reference_amount: number;
} {
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Falta el servicio');
  return { id, reference_amount: parseAmount(input.referenceAmount) };
}

export function validateDeactivateService(
  input: DeactivateServiceInput,
  today: IsoDate,
): { id: string; ended_at: IsoDate; active: false } {
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Falta el servicio');
  return {
    id,
    ended_at: input.endedAt ? assertIsoDate(String(input.endedAt), 'ended_at') : today,
    active: false,
  };
}
