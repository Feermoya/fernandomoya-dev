import { calculateCollectedInMonth } from '@/lib/panel/mrr';
import { calculateChargeStatus } from '@/lib/panel/status';
import {
  clampDueDay,
  parseIsoDateParts,
  shiftPeriod,
  toIsoDate,
  toPeriodStart,
  type IsoDate,
} from '@/lib/panel/dates';
import type { Currency } from '@/lib/panel/types';

export const HISTORY_IMPORT_TAG = '[seed-history-2026]';

export type HistoryClientKey =
  | 'pato'
  | 'avellaneda'
  | 'poletino'
  | 'sanacion'
  | 'giacomelli'
  | 'giuliana'
  | 'hema';

export type HistoryClientMeta = {
  key: HistoryClientKey;
  name: string;
  clientId: string;
  serviceId: string;
  startDate: IsoDate;
  dueDay: number;
  /** Tarifa contractual actual (no se usa para inventar histórico USD). */
  currentTariff: { amount: number; currency: Currency };
};

/** Mes de cobro (planilla) → ARS recibido. */
export type HistoryPaymentRow = {
  clientKey: HistoryClientKey;
  /** YYYY-MM-01 del mes en que entró el dinero (columna de la planilla). */
  paymentMonth: IsoDate;
  amountReceivedArs: number;
};

export const HISTORY_CLIENTS: HistoryClientMeta[] = [
  {
    key: 'pato',
    name: 'Página Pato',
    clientId: '11111111-1111-4111-8111-111111111101',
    serviceId: '22222222-2222-4222-8222-222222222201',
    startDate: '2026-01-01',
    dueDay: 10,
    currentTariff: { amount: 20, currency: 'USD' },
  },
  {
    key: 'avellaneda',
    name: 'Avellaneda Automotores',
    clientId: '11111111-1111-4111-8111-111111111102',
    serviceId: '22222222-2222-4222-8222-222222222202',
    startDate: '2026-03-01',
    dueDay: 10,
    currentTariff: { amount: 100000, currency: 'ARS' },
  },
  {
    key: 'poletino',
    name: 'Poletino',
    clientId: '11111111-1111-4111-8111-111111111103',
    serviceId: '22222222-2222-4222-8222-222222222203',
    startDate: '2026-04-01',
    dueDay: 10,
    currentTariff: { amount: 45, currency: 'USD' },
  },
  {
    key: 'sanacion',
    name: 'Sanación en Movimiento',
    clientId: '11111111-1111-4111-8111-111111111104',
    serviceId: '22222222-2222-4222-8222-222222222204',
    startDate: '2026-03-01',
    dueDay: 24,
    currentTariff: { amount: 38, currency: 'USD' },
  },
  {
    key: 'giacomelli',
    name: 'Giacomelli Seguros',
    clientId: '11111111-1111-4111-8111-111111111105',
    serviceId: '22222222-2222-4222-8222-222222222205',
    startDate: '2026-07-01',
    dueDay: 10,
    currentTariff: { amount: 40, currency: 'USD' },
  },
  {
    key: 'giuliana',
    name: 'Dra. Giuliana Macchiavello',
    clientId: '11111111-1111-4111-8111-111111111106',
    serviceId: '22222222-2222-4222-8222-222222222206',
    startDate: '2026-08-01',
    dueDay: 10,
    currentTariff: { amount: 50, currency: 'USD' },
  },
  {
    key: 'hema',
    name: 'HEMA',
    clientId: '11111111-1111-4111-8111-111111111107',
    serviceId: '22222222-2222-4222-8222-222222222207',
    startDate: '2026-07-01',
    dueDay: 10,
    currentTariff: { amount: 40, currency: 'USD' },
  },
];

/**
 * Pagos reales 2026 (planilla). Solo ARS.
 * NO incluye “Ingreso Fijo”.
 */
export const HISTORY_PAYMENTS_2026: HistoryPaymentRow[] = [
  // Página Pato
  { clientKey: 'pato', paymentMonth: '2026-01-01', amountReceivedArs: 7580 },
  { clientKey: 'pato', paymentMonth: '2026-02-01', amountReceivedArs: 10000 },
  { clientKey: 'pato', paymentMonth: '2026-03-01', amountReceivedArs: 15000 },
  { clientKey: 'pato', paymentMonth: '2026-04-01', amountReceivedArs: 15000 },
  { clientKey: 'pato', paymentMonth: '2026-05-01', amountReceivedArs: 30000 },
  { clientKey: 'pato', paymentMonth: '2026-06-01', amountReceivedArs: 30000 },
  { clientKey: 'pato', paymentMonth: '2026-07-01', amountReceivedArs: 30320 },
  { clientKey: 'pato', paymentMonth: '2026-08-01', amountReceivedArs: 30000 },
  // Avellaneda
  { clientKey: 'avellaneda', paymentMonth: '2026-03-01', amountReceivedArs: 100000 },
  { clientKey: 'avellaneda', paymentMonth: '2026-04-01', amountReceivedArs: 100000 },
  { clientKey: 'avellaneda', paymentMonth: '2026-05-01', amountReceivedArs: 100000 },
  { clientKey: 'avellaneda', paymentMonth: '2026-06-01', amountReceivedArs: 100000 },
  { clientKey: 'avellaneda', paymentMonth: '2026-07-01', amountReceivedArs: 100000 },
  { clientKey: 'avellaneda', paymentMonth: '2026-08-01', amountReceivedArs: 100000 },
  // Poletino
  { clientKey: 'poletino', paymentMonth: '2026-04-01', amountReceivedArs: 63815 },
  { clientKey: 'poletino', paymentMonth: '2026-05-01', amountReceivedArs: 63815 },
  { clientKey: 'poletino', paymentMonth: '2026-06-01', amountReceivedArs: 87600 },
  { clientKey: 'poletino', paymentMonth: '2026-07-01', amountReceivedArs: 68000 },
  { clientKey: 'poletino', paymentMonth: '2026-08-01', amountReceivedArs: 90900 },
  // Sanación
  { clientKey: 'sanacion', paymentMonth: '2026-03-01', amountReceivedArs: 54530 },
  { clientKey: 'sanacion', paymentMonth: '2026-04-01', amountReceivedArs: 54530 },
  { clientKey: 'sanacion', paymentMonth: '2026-05-01', amountReceivedArs: 54530 },
  { clientKey: 'sanacion', paymentMonth: '2026-06-01', amountReceivedArs: 54168 },
  { clientKey: 'sanacion', paymentMonth: '2026-07-01', amountReceivedArs: 57449 },
  { clientKey: 'sanacion', paymentMonth: '2026-08-01', amountReceivedArs: 58000 },
  // Giacomelli
  { clientKey: 'giacomelli', paymentMonth: '2026-07-01', amountReceivedArs: 60640 },
  { clientKey: 'giacomelli', paymentMonth: '2026-08-01', amountReceivedArs: 60830 },
  // Giuliana
  { clientKey: 'giuliana', paymentMonth: '2026-08-01', amountReceivedArs: 75880 },
  // HEMA
  { clientKey: 'hema', paymentMonth: '2026-07-01', amountReceivedArs: 60000 },
  { clientKey: 'hema', paymentMonth: '2026-08-01', amountReceivedArs: 60640 },
];

export type ResolvedHistoryCharge = {
  clientKey: HistoryClientKey;
  serviceId: string;
  paymentMonth: IsoDate;
  amountReceivedArs: number;
  /** previous_month estándar, o null si bootstrap (primer mes / Giuliana). */
  period: IsoDate | null;
  dueDate: IsoDate;
  paidAt: IsoDate;
  kind: 'standard' | 'bootstrap';
  note: string;
};

function clientByKey(key: HistoryClientKey): HistoryClientMeta {
  const c = HISTORY_CLIENTS.find((x) => x.key === key);
  if (!c) throw new Error(`Cliente histórico desconocido: ${key}`);
  return c;
}

/**
 * previous_month: pago en mes M → period = M-1.
 * Si M-1 < start_date → bootstrap: period null (evita chocar con el primer period recurrente
 * y permite conservar el pago de la planilla sin inventar fechas anteriores al alta).
 *
 * Giuliana (start ago + pago ago): bootstrap period null, due/paid en agosto.
 */
export function resolveHistoryPeriodAndDates(
  paymentMonth: IsoDate,
  startDate: IsoDate,
  dueDay: number,
): Pick<ResolvedHistoryCharge, 'period' | 'dueDate' | 'paidAt' | 'kind'> {
  const payStart = toPeriodStart(paymentMonth);
  const serviceStart = toPeriodStart(startDate);
  const standardPeriod = shiftPeriod(payStart, -1);
  const { year, month } = parseIsoDateParts(payStart);
  const day = clampDueDay(year, month, dueDay);
  const dueDate = toIsoDate(year, month, day);

  if (standardPeriod < serviceStart) {
    return {
      period: null,
      dueDate,
      paidAt: dueDate,
      kind: 'bootstrap',
    };
  }

  return {
    period: standardPeriod,
    dueDate,
    paidAt: dueDate,
    kind: 'standard',
  };
}

export function resolveHistoryRows(
  rows: HistoryPaymentRow[] = HISTORY_PAYMENTS_2026,
): ResolvedHistoryCharge[] {
  return rows.map((row) => {
    const client = clientByKey(row.clientKey);
    const resolved = resolveHistoryPeriodAndDates(
      row.paymentMonth,
      client.startDate,
      client.dueDay,
    );
    const noteParts = [
      HISTORY_IMPORT_TAG,
      `client=${client.key}`,
      `paid_month=${row.paymentMonth.slice(0, 7)}`,
      `kind=${resolved.kind}`,
      'Imported from 2026 spreadsheet, exact payment day unavailable',
      'Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null',
    ];
    if (client.key === 'giuliana') {
      noteParts.push(
        'EXCEPTION Giuliana: start_date 2026-08-01 + previous_month would skip July; August payment preserved as bootstrap charge (period null)',
      );
    }
    return {
      clientKey: row.clientKey,
      serviceId: client.serviceId,
      paymentMonth: row.paymentMonth,
      amountReceivedArs: row.amountReceivedArs,
      ...resolved,
      note: noteParts.join(' | '),
    };
  });
}

export function collectedByMonthArs(
  rows: HistoryPaymentRow[] = HISTORY_PAYMENTS_2026,
): Record<string, number> {
  const payments = rows.map((r) => ({
    paid_at: resolveHistoryPeriodAndDates(
      r.paymentMonth,
      clientByKey(r.clientKey).startDate,
      clientByKey(r.clientKey).dueDay,
    ).paidAt,
    amount_received: r.amountReceivedArs,
    currency_received: 'ARS' as const,
  }));

  const months = [...new Set(rows.map((r) => r.paymentMonth.slice(0, 7)))].sort();
  const out: Record<string, number> = {};
  for (const ym of months) {
    const monthStart = `${ym}-01`;
    out[ym] = calculateCollectedInMonth(payments, monthStart).ars;
  }
  return out;
}

export function august2026TotalArs(): number {
  return collectedByMonthArs()['2026-08'] ?? 0;
}

/** Simula charge+payment histórico → status paid (no overdue). */
export function historicalChargeStatus(paid: boolean, dueDate: IsoDate, today: IsoDate) {
  return calculateChargeStatus({ dueDate, hasPayment: paid, today });
}

export function mentionsIngresoFijo(rows: HistoryPaymentRow[] = HISTORY_PAYMENTS_2026): boolean {
  return rows.some((r) => JSON.stringify(r).toLowerCase().includes('ingreso fijo'));
}
