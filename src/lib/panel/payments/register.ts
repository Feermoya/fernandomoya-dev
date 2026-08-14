import { assertIsoDate, type IsoDate } from '@/lib/panel/dates';
import { normalizePaymentAmounts } from '@/lib/panel/payments';
import type { Currency } from '@/lib/panel/types';

export const PAYMENT_METHODS = ['Transferencia', 'Mercado Pago', 'Efectivo', 'Otro'] as const;
export type PaymentMethodOption = (typeof PAYMENT_METHODS)[number];

export type RegisterPaymentFormInput = {
  chargeId: string;
  paidAt: string;
  amountReceived: number | string;
  currencyReceived: string;
  exchangeRate?: number | string | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

export type ChargeSnapshotForPayment = {
  id: string;
  reference_amount: number;
  reference_currency: Currency;
};

export type ValidatedRegisterPayment = {
  charge_id: string;
  paid_at: IsoDate;
  amount_received: number;
  currency_received: Currency;
  exchange_rate: number | null;
  reference_amount: number;
  reference_currency: Currency;
  payment_method: string | null;
  notes: string | null;
};

function parsePositiveNumber(value: number | string | null | undefined, label: string): number {
  if (value == null || value === '') {
    throw new Error(`${label} es obligatorio`);
  }
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    throw new Error(`${label} inválido`);
  }
  if (!(n > 0)) {
    throw new Error(`${label} debe ser mayor que 0`);
  }
  return n;
}

function parseCurrency(value: string): Currency {
  if (value === 'ARS' || value === 'USD') return value;
  throw new Error('Moneda inválida');
}

/** Monto esperado ARS = USD × MEP (solo UI / precarga). */
export function expectedArsFromUsd(referenceUsd: number, exchangeRate: number): number {
  if (!(referenceUsd >= 0) || !(exchangeRate > 0)) return 0;
  return Math.round(referenceUsd * exchangeRate * 100) / 100;
}

/**
 * Valida input del formulario + snapshot del charge (DB).
 * Siempre usa reference_* del charge, nunca del browser.
 */
export function buildValidatedPayment(
  form: RegisterPaymentFormInput,
  charge: ChargeSnapshotForPayment,
): ValidatedRegisterPayment {
  if (!form.chargeId || form.chargeId !== charge.id) {
    throw new Error('Charge inválido');
  }

  const paid_at = assertIsoDate(String(form.paidAt || ''), 'paid_at');
  const amount_received = parsePositiveNumber(form.amountReceived, 'amount_received');
  const currency_received = parseCurrency(String(form.currencyReceived || ''));

  let exchangeRate: number | null | undefined = form.exchangeRate;
  if (exchangeRate === '' || exchangeRate == null) {
    exchangeRate = null;
  } else {
    exchangeRate = parsePositiveNumber(exchangeRate, 'exchange_rate');
  }

  const normalized = normalizePaymentAmounts({
    referenceAmount: Number(charge.reference_amount),
    referenceCurrency: charge.reference_currency,
    amountReceived: amount_received,
    currencyReceived: currency_received,
    exchangeRate,
  });

  const methodRaw = form.paymentMethod?.trim() || null;
  const notesRaw = form.notes?.trim() || null;

  return {
    charge_id: charge.id,
    paid_at,
    amount_received: normalized.amount_received,
    currency_received: normalized.currency_received,
    exchange_rate: normalized.exchange_rate,
    reference_amount: normalized.reference_amount,
    reference_currency: normalized.reference_currency,
    payment_method: methodRaw,
    notes: notesRaw,
  };
}

/** Default currency_received for UI according to charge currency. */
export function defaultCurrencyReceived(referenceCurrency: Currency): Currency {
  return referenceCurrency === 'USD' ? 'ARS' : 'ARS';
}
