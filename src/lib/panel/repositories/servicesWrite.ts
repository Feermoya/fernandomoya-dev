import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateCreateService,
  validateDeactivateService,
  validateUpdateService,
  validateUpdateTariff,
  type CreateServiceInput,
  type DeactivateServiceInput,
  type UpdateServiceInput,
  type UpdateTariffInput,
} from '@/lib/panel/services/validate';
import { mapCharge, mapService, todayIsoDate, type ChargeRow, type ServiceRow } from '@/lib/panel/view-types';
import type { BillingType } from '@/lib/panel/types';

export type WriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'validation' | 'not_found' | 'db' };

function logErr(scope: string, err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'unknown';
  console.error(`[panel:services:${scope}]`, message);
}

export async function createService(
  supabase: SupabaseClient,
  input: CreateServiceInput,
): Promise<WriteResult<{ service: ServiceRow; charge: ChargeRow | null }>> {
  let validated;
  try {
    validated = validateCreateService(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, active')
    .eq('id', validated.client_id)
    .maybeSingle();

  if (clientError) {
    logErr('create.client', clientError);
    return { ok: false, error: 'No se pudo verificar el cliente.', code: 'db' };
  }
  if (!client) return { ok: false, error: 'Cliente no encontrado.', code: 'not_found' };

  const insertRow = {
    client_id: validated.client_id,
    name: validated.name,
    billing_type: validated.billing_type,
    reference_amount: validated.reference_amount,
    reference_currency: validated.reference_currency,
    billing_mode: validated.billing_mode,
    due_day: validated.due_day,
    start_date: validated.start_date,
    active: true,
  };

  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .insert(insertRow)
    .select('*')
    .single();

  if (serviceError || !serviceData) {
    logErr('create', serviceError);
    return { ok: false, error: 'No se pudo crear el servicio.', code: 'db' };
  }

  const service = mapService(serviceData as Record<string, unknown>);
  let charge: ChargeRow | null = null;

  if (validated.billing_type === 'one_time') {
    const { data: chargeData, error: chargeError } = await supabase
      .from('charges')
      .insert({
        service_id: service.id,
        period: null,
        reference_amount: service.reference_amount,
        reference_currency: service.reference_currency,
        due_date: validated.due_date,
      })
      .select('*')
      .single();

    if (chargeError || !chargeData) {
      logErr('create.one_time_charge', chargeError);
      return { ok: false, error: 'Servicio creado pero falló el cobro puntual.', code: 'db' };
    }
    charge = mapCharge(chargeData as Record<string, unknown>);
  }

  return { ok: true, data: { service, charge } };
}

export async function updateService(
  supabase: SupabaseClient,
  input: UpdateServiceInput,
): Promise<WriteResult<ServiceRow>> {
  const { data: current, error: loadError } = await supabase
    .from('services')
    .select('id, billing_type')
    .eq('id', String(input.id || ''))
    .maybeSingle();

  if (loadError) {
    logErr('update.load', loadError);
    return { ok: false, error: 'No se pudo cargar el servicio.', code: 'db' };
  }
  if (!current) return { ok: false, error: 'Servicio no encontrado.', code: 'not_found' };

  let validated;
  try {
    validated = validateUpdateService(input, current.billing_type as BillingType);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('services')
    .update({
      name: validated.name,
      reference_amount: validated.reference_amount,
      reference_currency: validated.reference_currency,
      billing_mode: validated.billing_mode,
      due_day: validated.due_day,
      active: validated.active,
      ended_at: validated.ended_at,
    })
    .eq('id', validated.id)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('update', error);
    return { ok: false, error: 'No se pudo actualizar el servicio.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Servicio no encontrado.', code: 'not_found' };
  return { ok: true, data: mapService(data as Record<string, unknown>) };
}

/** Solo cambia reference_amount. No toca charges históricos. */
export async function updateServiceTariff(
  supabase: SupabaseClient,
  input: UpdateTariffInput,
): Promise<WriteResult<ServiceRow>> {
  let validated;
  try {
    validated = validateUpdateTariff(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('services')
    .update({ reference_amount: validated.reference_amount })
    .eq('id', validated.id)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('updateTariff', error);
    return { ok: false, error: 'No se pudo actualizar la tarifa.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Servicio no encontrado.', code: 'not_found' };
  return { ok: true, data: mapService(data as Record<string, unknown>) };
}

export async function deactivateService(
  supabase: SupabaseClient,
  input: DeactivateServiceInput,
): Promise<WriteResult<ServiceRow>> {
  let validated;
  try {
    validated = validateDeactivateService(input, todayIsoDate());
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('services')
    .update({ active: false, ended_at: validated.ended_at })
    .eq('id', validated.id)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('deactivate', error);
    return { ok: false, error: 'No se pudo dar de baja el servicio.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Servicio no encontrado.', code: 'not_found' };
  return { ok: true, data: mapService(data as Record<string, unknown>) };
}
