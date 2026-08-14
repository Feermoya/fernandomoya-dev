import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateCreateClient,
  validateDeactivateClient,
  validateUpdateClient,
  type CreateClientInput,
  type DeactivateClientInput,
  type UpdateClientInput,
} from '@/lib/panel/clients/validate';
import { mapClient, todayIsoDate, type ClientRow } from '@/lib/panel/view-types';

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
  console.error(`[panel:clients:${scope}]`, message);
}

export async function createClient(
  supabase: SupabaseClient,
  input: CreateClientInput,
): Promise<WriteResult<ClientRow>> {
  let validated;
  try {
    validated = validateCreateClient(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: validated.name,
      start_date: validated.start_date,
      notes: validated.notes,
      active: validated.active,
    })
    .select('*')
    .single();

  if (error || !data) {
    logErr('create', error);
    return { ok: false, error: 'No se pudo crear el cliente.', code: 'db' };
  }
  return { ok: true, data: mapClient(data as Record<string, unknown>) };
}

export async function updateClient(
  supabase: SupabaseClient,
  input: UpdateClientInput,
): Promise<WriteResult<ClientRow>> {
  let validated;
  try {
    validated = validateUpdateClient(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: validated.name,
      start_date: validated.start_date,
      notes: validated.notes,
    })
    .eq('id', validated.id)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('update', error);
    return { ok: false, error: 'No se pudo actualizar el cliente.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Cliente no encontrado.', code: 'not_found' };
  return { ok: true, data: mapClient(data as Record<string, unknown>) };
}

export async function deactivateClient(
  supabase: SupabaseClient,
  input: DeactivateClientInput,
): Promise<WriteResult<ClientRow>> {
  let validated;
  try {
    validated = validateDeactivateClient(input, todayIsoDate());
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Datos inválidos', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      active: false,
      ended_at: validated.ended_at,
    })
    .eq('id', validated.id)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('deactivate', error);
    return { ok: false, error: 'No se pudo dar de baja el cliente.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Cliente no encontrado.', code: 'not_found' };
  return { ok: true, data: mapClient(data as Record<string, unknown>) };
}

export async function reactivateClient(
  supabase: SupabaseClient,
  id: string,
): Promise<WriteResult<ClientRow>> {
  const clientId = String(id || '').trim();
  if (!clientId) {
    return { ok: false, error: 'Falta el cliente', code: 'validation' };
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      active: true,
      ended_at: null,
    })
    .eq('id', clientId)
    .select('*')
    .maybeSingle();

  if (error) {
    logErr('reactivate', error);
    return { ok: false, error: 'No se pudo reactivar el cliente.', code: 'db' };
  }
  if (!data) return { ok: false, error: 'Cliente no encontrado.', code: 'not_found' };
  return { ok: true, data: mapClient(data as Record<string, unknown>) };
}
