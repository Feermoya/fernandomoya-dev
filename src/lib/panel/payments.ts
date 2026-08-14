import type { Currency } from '@/lib/panel/types';

export type BuildPaymentInput = {
  referenceAmount: number;
  referenceCurrency: Currency;
  amountReceived: number;
  currencyReceived: Currency;
  /** Obligatorio si las monedas difieren (MEP ARS por 1 USD). */
  exchangeRate?: number | null;
};

/**
 * Valida / normaliza un payment según reglas del MVP.
 * No llama APIs de dólar: el exchange_rate lo aporta quien registra el pago.
 */
export function normalizePaymentAmounts(input: BuildPaymentInput): {
  reference_amount: number;
  reference_currency: Currency;
  amount_received: number;
  currency_received: Currency;
  exchange_rate: number | null;
} {
  const same = input.referenceCurrency === input.currencyReceived;

  if (same) {
    return {
      reference_amount: input.referenceAmount,
      reference_currency: input.referenceCurrency,
      amount_received: input.amountReceived,
      currency_received: input.currencyReceived,
      exchange_rate: null,
    };
  }

  const rate = input.exchangeRate;
  if (rate == null || !(rate > 0)) {
    throw new Error('exchange_rate es obligatorio cuando reference_currency ≠ currency_received');
  }

  return {
    reference_amount: input.referenceAmount,
    reference_currency: input.referenceCurrency,
    amount_received: input.amountReceived,
    currency_received: input.currencyReceived,
    exchange_rate: rate,
  };
}

/** Snapshot histórico: cambiar la tarifa del servicio no muta este objeto. */
export function freezeChargeReference(service: {
  reference_amount: number;
  reference_currency: Currency;
}): { reference_amount: number; reference_currency: Currency } {
  return {
    reference_amount: Number(service.reference_amount),
    reference_currency: service.reference_currency,
  };
}
