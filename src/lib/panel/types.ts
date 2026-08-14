/** Tipos del dominio panel de cobros (MVP). */

export const CURRENCIES = ['ARS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const BILLING_MODES = ['current_month', 'previous_month'] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export const BILLING_TYPES = ['recurring', 'one_time'] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const CHARGE_STATUSES = ['upcoming', 'due_today', 'overdue', 'paid'] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

/** Solo identidad y ciclo de vida del cliente. */
export type Client = {
  id: string;
  name: string;
  active: boolean;
  start_date: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Tarifa y modalidad viven en el servicio.
 * recurring → billing_mode + due_day obligatorios.
 * one_time → billing_mode y due_day null.
 */
export type Service = {
  id: string;
  client_id: string;
  name: string;
  active: boolean;
  billing_type: BillingType;
  reference_amount: number;
  reference_currency: Currency;
  billing_mode: BillingMode | null;
  due_day: number | null;
  start_date: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Obligación concreta.
 * period: día 1 del mes del servicio (recurring). Null en one_time.
 * reference_* congelados al crear el charge (histórico).
 */
export type Charge = {
  id: string;
  service_id: string;
  period: string | null;
  reference_amount: number;
  reference_currency: Currency;
  due_date: string;
  created_at: string;
  updated_at: string;
};

/**
 * Dinero recibido vs tarifa contractual.
 * exchange_rate = ARS por 1 USD cuando se convierte USD→ARS (MEP al pagar).
 */
export type Payment = {
  id: string;
  charge_id: string;
  paid_at: string;
  amount_received: number;
  currency_received: Currency;
  exchange_rate: number | null;
  reference_amount: number;
  reference_currency: Currency;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MrrBreakdown = {
  usd: number;
  ars: number;
};
