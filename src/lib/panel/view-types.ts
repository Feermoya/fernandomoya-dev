import type {
  BillingMode,
  BillingType,
  Charge,
  ChargeStatus,
  Client,
  Currency,
  Payment,
  Service,
} from '@/lib/panel/types';

export type ClientRow = Client;
export type ServiceRow = Service;
export type ChargeRow = Charge;
export type PaymentRow = Payment;

/** Charge con cliente/servicio/pago y estado derivado. */
export type ChargeListItemData = {
  id: string;
  serviceId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  period: string | null;
  referenceAmount: number;
  referenceCurrency: Currency;
  dueDate: string;
  status: ChargeStatus;
  paidAt?: string;
  payment?: PaymentRow | null;
};

export type ClientListItemData = {
  id: string;
  name: string;
  active: boolean;
  startDate: string;
  endedAt: string | null;
  activeServiceCount: number;
  services: Array<{
    id: string;
    name: string;
    billingType: BillingType;
    referenceAmount: number;
    referenceCurrency: Currency;
    billingMode: BillingMode | null;
    dueDay: number | null;
  }>;
  mrrUsd: number;
  mrrArs: number;
};

export type ClientDetailData = {
  client: ClientRow;
  services: ServiceRow[];
  charges: ChargeListItemData[];
};

export type MrrSeriesPoint = {
  month: string; // YYYY-MM
  label: string;
  mrrUsd: number;
};

export type DashboardData = {
  today: string;
  monthLabel: string;
  activeClients: number;
  /** Servicios recurring activos (hint de la card Clientes). */
  activeServices: number;
  mrrUsd: number;
  mrrArs: number;
  collectedThisMonthArs: number;
  collectedThisMonthUsd: number;
  overdueCount: number;
  upcomingCount: number;
  dueTodayCount: number;
  upcomingCharges: ChargeListItemData[];
  attentionCharges: ChargeListItemData[];
  /** Charges pendientes (upcoming / hoy / overdue) para Registrar cobro. */
  unpaidCharges: ChargeListItemData[];
  mrrSeries: MrrSeriesPoint[];
};

export function formatPeriodLabel(period: string | null): string {
  if (!period) return 'Cobro puntual';
  const parts = period.slice(0, 7).split('-');
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const names = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const month = names[monthIdx] ?? parts[1];
  return `${month} ${year}`;
}

export function formatDueLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${m}`;
}


const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

export function monthLabelFromPeriod(periodOrMonth: string): string {
  // accepts YYYY-MM-01 or YYYY-MM
  const parts = periodOrMonth.slice(0, 7).split('-');
  const monthIdx = Number(parts[1]) - 1;
  return MONTH_LABELS[monthIdx] ?? periodOrMonth.slice(0, 7);
}

export function formatMonthTitle(isoToday: string): string {
  const [y, m] = isoToday.split('-');
  const names = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return `${names[Number(m) - 1] ?? m} ${y}`;
}

export function mapClient(row: Record<string, unknown>): ClientRow {
  return {
    id: String(row.id),
    name: String(row.name),
    active: Boolean(row.active),
    start_date: String(row.start_date),
    ended_at: row.ended_at == null ? null : String(row.ended_at),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapService(row: Record<string, unknown>): ServiceRow {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    name: String(row.name),
    active: Boolean(row.active),
    billing_type: row.billing_type as BillingType,
    reference_amount: Number(row.reference_amount),
    reference_currency: row.reference_currency as Currency,
    billing_mode: (row.billing_mode as BillingMode | null) ?? null,
    due_day: row.due_day == null ? null : Number(row.due_day),
    start_date: String(row.start_date),
    ended_at: row.ended_at == null ? null : String(row.ended_at),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapCharge(row: Record<string, unknown>): ChargeRow {
  return {
    id: String(row.id),
    service_id: String(row.service_id),
    period: row.period == null ? null : String(row.period),
    reference_amount: Number(row.reference_amount),
    reference_currency: row.reference_currency as Currency,
    due_date: String(row.due_date),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapPayment(row: Record<string, unknown>): PaymentRow {
  return {
    id: String(row.id),
    charge_id: String(row.charge_id),
    paid_at: String(row.paid_at),
    amount_received: Number(row.amount_received),
    currency_received: row.currency_received as Currency,
    exchange_rate: row.exchange_rate == null ? null : Number(row.exchange_rate),
    reference_amount: Number(row.reference_amount),
    reference_currency: row.reference_currency as Currency,
    payment_method: row.payment_method == null ? null : String(row.payment_method),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
