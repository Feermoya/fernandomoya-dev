import type { SupabaseClient } from '@supabase/supabase-js';
import {
  planRecurringChargesForOperationalMonth,
  type PlannedRecurringCharge,
} from '@/lib/panel/charges/planRecurring';
import { mapService, todayIsoDate } from '@/lib/panel/view-types';
import type { IsoDate } from '@/lib/panel/dates';

export type EnsureRecurringChargesResult = {
  planned: number;
  inserted: number;
  skippedExisting: number;
  error: string | null;
};

function logEnsureError(err: unknown) {
  const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err
    ? String((err as { message: unknown }).message)
    : 'unknown';
  console.error('[panel:ensureRecurringCharges]', message);
}

/**
 * Garantiza charges del mes operativo para services recurring activos.
 * Idempotente: unique (service_id, period) evita duplicados.
 *
 * previous_month en agosto → period julio (vencimientos en agosto).
 * No genera historial completo desde start_date.
 */
export async function ensureRecurringChargesForMonth(
  supabase: SupabaseClient,
  operationalDay: IsoDate = todayIsoDate(),
): Promise<EnsureRecurringChargesResult> {
  const { data: rows, error: servicesError } = await supabase
    .from('services')
    .select('*, clients!inner(id, active)')
    .eq('billing_type', 'recurring')
    .eq('clients.active', true);

  if (servicesError) {
    logEnsureError(servicesError);
    return {
      planned: 0,
      inserted: 0,
      skippedExisting: 0,
      error: 'No se pudieron cargar servicios para generar cobros.',
    };
  }

  const services = (rows ?? []).map((r) => mapService(r as Record<string, unknown>));
  const planned = planRecurringChargesForOperationalMonth(services, operationalDay);

  if (planned.length === 0) {
    return { planned: 0, inserted: 0, skippedExisting: 0, error: null };
  }

  const serviceIds = [...new Set(planned.map((p) => p.service_id))];
  const periods = [...new Set(planned.map((p) => p.period))];

  const { data: existingRows, error: existingError } = await supabase
    .from('charges')
    .select('service_id, period')
    .in('service_id', serviceIds)
    .in('period', periods);

  if (existingError) {
    logEnsureError(existingError);
    return {
      planned: planned.length,
      inserted: 0,
      skippedExisting: 0,
      error: 'No se pudieron verificar cobros existentes.',
    };
  }

  const existing = new Set(
    (existingRows ?? []).map((r) => `${r.service_id}|${r.period}`),
  );

  const toInsert: PlannedRecurringCharge[] = [];
  let skippedExisting = 0;
  for (const charge of planned) {
    const key = `${charge.service_id}|${charge.period}`;
    if (existing.has(key)) {
      skippedExisting += 1;
    } else {
      toInsert.push(charge);
    }
  }

  if (toInsert.length === 0) {
    return {
      planned: planned.length,
      inserted: 0,
      skippedExisting,
      error: null,
    };
  }

  const { error: insertError } = await supabase.from('charges').insert(toInsert);

  if (insertError) {
    // Carrera / unique: otra request insertó primero → tratar como OK idempotente.
    if (insertError.code === '23505') {
      return {
        planned: planned.length,
        inserted: 0,
        skippedExisting: planned.length,
        error: null,
      };
    }
    logEnsureError(insertError);
    return {
      planned: planned.length,
      inserted: 0,
      skippedExisting,
      error: 'No se pudieron crear los cobros del mes.',
    };
  }

  return {
    planned: planned.length,
    inserted: toInsert.length,
    skippedExisting,
    error: null,
  };
}
