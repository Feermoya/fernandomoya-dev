import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildValidatedPayment,
  type RegisterPaymentFormInput,
  type ValidatedRegisterPayment,
} from '@/lib/panel/payments/register';
import { mapCharge, mapPayment, type PaymentRow } from '@/lib/panel/view-types';

export type RegisterPaymentResult =
  | { ok: true; payment: PaymentRow }
  | { ok: false; error: string; code?: 'unauthorized' | 'not_found' | 'already_paid' | 'validation' | 'db' };

function logPaymentError(scope: string, err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'unknown';
  console.error(`[panel:payments:${scope}]`, message);
}

export async function registerPaymentForCharge(
  supabase: SupabaseClient,
  form: RegisterPaymentFormInput,
): Promise<RegisterPaymentResult> {
  const chargeId = String(form.chargeId || '').trim();
  if (!chargeId) {
    return { ok: false, error: 'Falta el cobro.', code: 'validation' };
  }

  const { data: chargeRow, error: chargeError } = await supabase
    .from('charges')
    .select('id, reference_amount, reference_currency')
    .eq('id', chargeId)
    .maybeSingle();

  if (chargeError) {
    logPaymentError('loadCharge', chargeError);
    return { ok: false, error: 'No se pudo cargar el cobro.', code: 'db' };
  }
  if (!chargeRow) {
    return { ok: false, error: 'El cobro no existe.', code: 'not_found' };
  }

  const charge = mapCharge(chargeRow as Record<string, unknown>);

  const { data: existingPayment, error: existingError } = await supabase
    .from('payments')
    .select('id')
    .eq('charge_id', chargeId)
    .maybeSingle();

  if (existingError) {
    logPaymentError('existingPayment', existingError);
    return { ok: false, error: 'No se pudo verificar pagos existentes.', code: 'db' };
  }
  if (existingPayment) {
    return { ok: false, error: 'Este cobro ya tiene un pago registrado.', code: 'already_paid' };
  }

  let validated: ValidatedRegisterPayment;
  try {
    validated = buildValidatedPayment(form, {
      id: charge.id,
      reference_amount: charge.reference_amount,
      reference_currency: charge.reference_currency,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Datos de pago inválidos.',
      code: 'validation',
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('payments')
    .insert({
      charge_id: validated.charge_id,
      paid_at: validated.paid_at,
      amount_received: validated.amount_received,
      currency_received: validated.currency_received,
      exchange_rate: validated.exchange_rate,
      reference_amount: validated.reference_amount,
      reference_currency: validated.reference_currency,
      payment_method: validated.payment_method,
      notes: validated.notes,
    })
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return { ok: false, error: 'Este cobro ya tiene un pago registrado.', code: 'already_paid' };
    }
    logPaymentError('insert', insertError);
    return { ok: false, error: 'No se pudo guardar el pago.', code: 'db' };
  }

  return { ok: true, payment: mapPayment(inserted as Record<string, unknown>) };
}

export { listPaymentsInMonth } from '@/lib/panel/repositories/reads';
