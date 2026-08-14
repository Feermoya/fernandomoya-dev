import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateMrr } from '@/lib/panel/mrr';
import { calculateChargeStatus } from '@/lib/panel/status';
import { listNextExpectedCharges } from '@/lib/panel/charges/nextExpected';
import { resolveClientBillingStatus } from '@/lib/panel/clients/listStatus';
import {
  mapClient,
  mapPayment,
  mapService,
  type ChargeListItemData,
  type ClientDetailData,
  type ClientListItemData,
  type ClientRow,
  type PaymentRow,
  type ServiceRow,
  todayIsoDate,
} from '@/lib/panel/view-types';

function logPanelError(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : 'unknown';
  console.error(`[panel:${scope}]`, message);
}

type NestedService = Record<string, unknown> & {
  clients?: Record<string, unknown> | Record<string, unknown>[] | null;
};

type NestedCharge = Record<string, unknown> & {
  services?: NestedService | NestedService[] | null;
  payments?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function hydrateChargeListItem(row: NestedCharge, today: string): ChargeListItemData | null {
  const service = asOne(row.services);
  if (!service) return null;
  const client = asOne(service.clients);
  if (!client) return null;
  const paymentRaw = asOne(row.payments);
  const payment = paymentRaw ? mapPayment(paymentRaw) : null;
  const status = calculateChargeStatus({
    dueDate: String(row.due_date),
    hasPayment: Boolean(payment),
    today,
  });

  return {
    id: String(row.id),
    serviceId: String(row.service_id),
    clientId: String(client.id),
    clientName: String(client.name),
    serviceName: String(service.name),
    period: row.period == null ? null : String(row.period),
    referenceAmount: Number(row.reference_amount),
    referenceCurrency: row.reference_currency as ChargeListItemData['referenceCurrency'],
    dueDate: String(row.due_date),
    status,
    paidAt: payment?.paid_at,
    payment,
  };
}

const CHARGE_SELECT = `
  id,
  service_id,
  period,
  reference_amount,
  reference_currency,
  due_date,
  created_at,
  updated_at,
  services!inner (
    id,
    name,
    client_id,
    clients!inner (
      id,
      name
    )
  ),
  payments (
    id,
    charge_id,
    paid_at,
    amount_received,
    currency_received,
    exchange_rate,
    reference_amount,
    reference_currency,
    payment_method,
    notes,
    created_at,
    updated_at
  )
`;

export async function listClientsWithActiveServices(
  supabase: SupabaseClient,
): Promise<{ data: ClientListItemData[]; error: string | null }> {
  const { data, error } = await supabase
    .from('clients')
    .select(
      `
      id,
      name,
      active,
      start_date,
      ended_at,
      notes,
      created_at,
      updated_at,
      services (
        id,
        name,
        active,
        billing_type,
        reference_amount,
        reference_currency,
        billing_mode,
        due_day,
        start_date,
        ended_at,
        notes,
        created_at,
        updated_at,
        client_id
      )
    `,
    )
    .order('name', { ascending: true });

  if (error) {
    logPanelError('listClients', error);
    return { data: [], error: 'No se pudieron cargar los clientes.' };
  }

  const today = todayIsoDate();
  const rows = (data ?? []) as Array<Record<string, unknown> & { services?: Record<string, unknown>[] }>;

  const base = rows.map((row) => {
    const client = mapClient(row);
    const services = (row.services ?? []).map(mapService);
    const activeServices = services.filter((s) => s.active && (!s.ended_at || s.ended_at >= today));
    const mrr = calculateMrr(activeServices, today);
    const primary =
      activeServices.find((s) => s.billing_type === 'recurring') ?? activeServices[0] ?? null;
    return {
      client,
      services,
      activeServices,
      mrr,
      primary,
    };
  });

  const serviceIds = base.flatMap((b) => b.services.map((s) => s.id));
  let unpaidByClient = new Map<string, ChargeListItemData[]>();

  if (serviceIds.length > 0) {
    const { data: chargeRows, error: chargesError } = await supabase
      .from('charges')
      .select(CHARGE_SELECT)
      .in('service_id', serviceIds);

    if (chargesError) {
      logPanelError('listClients.charges', chargesError);
      return { data: [], error: 'No se pudieron cargar los cobros de clientes.' };
    }

    const hydrated = ((chargeRows ?? []) as NestedCharge[])
      .map((row) => hydrateChargeListItem(row, today))
      .filter((c): c is ChargeListItemData => Boolean(c));

    unpaidByClient = new Map();
    for (const charge of hydrated) {
      if (charge.status === 'paid') continue;
      const list = unpaidByClient.get(charge.clientId) ?? [];
      list.push(charge);
      unpaidByClient.set(charge.clientId, list);
    }
  }

  const projectionServices = base.flatMap((b) =>
    b.activeServices
      .filter((s) => s.billing_type === 'recurring')
      .map((s) => ({
        id: s.id,
        client_id: b.client.id,
        name: s.name,
        client_name: b.client.name,
        active: s.active,
        billing_type: s.billing_type,
        billing_mode: s.billing_mode,
        due_day: s.due_day,
        reference_amount: s.reference_amount,
        reference_currency: s.reference_currency,
        start_date: s.start_date,
        ended_at: s.ended_at,
      })),
  );

  const existingForProjection = [...unpaidByClient.values()].flat().map((c) => ({
    id: c.id,
    service_id: c.serviceId,
    period: c.period,
    due_date: c.dueDate,
    hasPayment: false,
  }));

  const nextExpected = listNextExpectedCharges(projectionServices, existingForProjection, today);
  const nextByClient = new Map<string, string>();
  for (const n of nextExpected) {
    const prev = nextByClient.get(n.clientId);
    if (!prev || n.dueDate < prev) nextByClient.set(n.clientId, n.dueDate);
  }

  const mapped: ClientListItemData[] = base.map((b) => {
    const unpaid = unpaidByClient.get(b.client.id) ?? [];
    const billingStatus = resolveClientBillingStatus({
      active: b.client.active,
      unpaidStatuses: unpaid.map((c) => c.status),
    });
    const earliestUnpaid = [...unpaid].sort((a, c) => a.dueDate.localeCompare(c.dueDate))[0];
    const nextDueDate = earliestUnpaid?.dueDate ?? nextByClient.get(b.client.id) ?? null;

    return {
      id: b.client.id,
      name: b.client.name,
      active: b.client.active,
      startDate: b.client.start_date,
      endedAt: b.client.ended_at,
      notes: b.client.notes,
      activeServiceCount: b.activeServices.length,
      services: b.activeServices.map((s) => ({
        id: s.id,
        name: s.name,
        billingType: s.billing_type,
        referenceAmount: s.reference_amount,
        referenceCurrency: s.reference_currency,
        billingMode: s.billing_mode,
        dueDay: s.due_day,
      })),
      mrrUsd: b.mrr.usd,
      mrrArs: b.mrr.ars,
      billingStatus,
      nextDueDate,
      primaryServiceName: b.primary?.name ?? null,
      primaryAmount: b.primary?.reference_amount ?? null,
      primaryCurrency: b.primary?.reference_currency ?? null,
      primaryBillingType: b.primary?.billing_type ?? null,
      unpaidCharges: unpaid,
    };
  });

  return { data: mapped, error: null };
}

export async function getClientDetail(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ data: ClientDetailData | null; error: string | null }> {
  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError) {
    logPanelError('getClientDetail.client', clientError);
    return { data: null, error: 'No se pudo cargar el cliente.' };
  }
  if (!clientRow) return { data: null, error: null };

  const { data: serviceRows, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true });

  if (servicesError) {
    logPanelError('getClientDetail.services', servicesError);
    return { data: null, error: 'No se pudieron cargar los servicios.' };
  }

  const services = (serviceRows ?? []).map((r) => mapService(r as Record<string, unknown>));
  const serviceIds = services.map((s) => s.id);

  let charges: ChargeListItemData[] = [];
  if (serviceIds.length > 0) {
    const { data: chargeRows, error: chargesError } = await supabase
      .from('charges')
      .select(CHARGE_SELECT)
      .in('service_id', serviceIds)
      .order('due_date', { ascending: false });

    if (chargesError) {
      logPanelError('getClientDetail.charges', chargesError);
      return { data: null, error: 'No se pudo cargar el historial de cobros.' };
    }

    const today = todayIsoDate();
    charges = ((chargeRows ?? []) as NestedCharge[])
      .map((row) => hydrateChargeListItem(row, today))
      .filter((c): c is ChargeListItemData => Boolean(c));
  }

  return {
    data: {
      client: mapClient(clientRow as Record<string, unknown>),
      services,
      charges,
    },
    error: null,
  };
}

export async function listChargesWithRelations(
  supabase: SupabaseClient,
): Promise<{ data: ChargeListItemData[]; error: string | null }> {
  const { data, error } = await supabase
    .from('charges')
    .select(CHARGE_SELECT)
    .order('due_date', { ascending: true });

  if (error) {
    logPanelError('listCharges', error);
    return { data: [], error: 'No se pudieron cargar los cobros.' };
  }

  const today = todayIsoDate();
  const charges = ((data ?? []) as NestedCharge[])
    .map((row) => hydrateChargeListItem(row, today))
    .filter((c): c is ChargeListItemData => Boolean(c));

  return { data: charges, error: null };
}

export async function listActiveRecurringServices(
  supabase: SupabaseClient,
): Promise<{ data: ServiceRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .eq('billing_type', 'recurring');

  if (error) {
    logPanelError('listActiveRecurringServices', error);
    return { data: [], error: 'No se pudieron cargar los servicios.' };
  }

  return { data: (data ?? []).map((r) => mapService(r as Record<string, unknown>)), error: null };
}

export type ActiveRecurringServiceWithClient = ServiceRow & {
  client_name: string;
};

/** Recurring activos + nombre de cliente (para proyección de próximos). */
export async function listActiveRecurringServicesWithClients(
  supabase: SupabaseClient,
): Promise<{ data: ActiveRecurringServiceWithClient[]; error: string | null }> {
  const { data, error } = await supabase
    .from('services')
    .select(
      `
      *,
      clients!inner (
        id,
        name,
        active
      )
    `,
    )
    .eq('active', true)
    .eq('billing_type', 'recurring')
    .eq('clients.active', true);

  if (error) {
    logPanelError('listActiveRecurringServicesWithClients', error);
    return { data: [], error: 'No se pudieron cargar los servicios.' };
  }

  const rows = (data ?? []) as Array<
    Record<string, unknown> & {
      clients?: Record<string, unknown> | Record<string, unknown>[] | null;
    }
  >;

  const mapped: ActiveRecurringServiceWithClient[] = rows.map((row) => {
    const service = mapService(row);
    const client = asOne(row.clients);
    return {
      ...service,
      client_name: client ? String(client.name) : 'Cliente',
    };
  });

  return { data: mapped, error: null };
}

/** Payments ARS para la serie “Cobrado por mes”. */
export async function listArsPaymentsForCollectedSeries(
  supabase: SupabaseClient,
): Promise<{
  data: Array<{ paid_at: string; amount_received: number; currency_received: string }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('payments')
    .select('paid_at, amount_received, currency_received')
    .eq('currency_received', 'ARS');

  if (error) {
    logPanelError('listArsPaymentsForCollectedSeries', error);
    return { data: [], error: 'No se pudo cargar el historial de cobrado.' };
  }

  return {
    data: (data ?? []).map((r) => ({
      paid_at: String((r as { paid_at: string }).paid_at),
      amount_received: Number((r as { amount_received: number }).amount_received),
      currency_received: String((r as { currency_received: string }).currency_received),
    })),
    error: null,
  };
}

/** Todos los payments (solo montos/moneda) para totales históricos. */
export async function listPaymentAmountsForTotals(
  supabase: SupabaseClient,
): Promise<{
  data: Array<{ amount_received: number; currency_received: string }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount_received, currency_received');

  if (error) {
    logPanelError('listPaymentAmountsForTotals', error);
    return { data: [], error: 'No se pudo cargar el total cobrado.' };
  }

  return {
    data: (data ?? []).map((r) => ({
      amount_received: Number((r as { amount_received: number }).amount_received),
      currency_received: String((r as { currency_received: string }).currency_received),
    })),
    error: null,
  };
}

export async function listPaymentsInMonth(
  supabase: SupabaseClient,
  monthStart: string,
  nextMonthStart: string,
): Promise<{ data: PaymentRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .gte('paid_at', monthStart)
    .lt('paid_at', nextMonthStart);

  if (error) {
    logPanelError('listPaymentsInMonth', error);
    return { data: [], error: 'No se pudieron cargar los pagos.' };
  }

  return { data: (data ?? []).map((r) => mapPayment(r as Record<string, unknown>)), error: null };
}

export async function countActiveClients(
  supabase: SupabaseClient,
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);

  if (error) {
    logPanelError('countActiveClients', error);
    return { count: 0, error: 'No se pudieron contar los clientes.' };
  }

  return { count: count ?? 0, error: null };
}

/** Cargas mínimas para gráfico histórico MRR USD (charges con period + USD). */
export async function listUsdRecurringChargePeriods(
  supabase: SupabaseClient,
): Promise<{ data: Array<{ period: string; reference_amount: number }>; error: string | null }> {
  const { data, error } = await supabase
    .from('charges')
    .select(
      `
      period,
      reference_amount,
      reference_currency,
      services!inner (
        billing_type
      )
    `,
    )
    .eq('reference_currency', 'USD')
    .not('period', 'is', null);

  if (error) {
    logPanelError('listUsdRecurringChargePeriods', error);
    return { data: [], error: 'No se pudo cargar el historial de MRR.' };
  }

  const rows = (data ?? []) as Array<{
    period: string | null;
    reference_amount: number;
    reference_currency: string;
    services: { billing_type: string } | { billing_type: string }[] | null;
  }>;

  const mapped = rows
    .filter((r) => {
      const service = asOne(r.services);
      return r.period && service?.billing_type === 'recurring';
    })
    .map((r) => ({
      period: String(r.period),
      reference_amount: Number(r.reference_amount),
    }));

  return { data: mapped, error: null };
}

export type { ClientRow, ServiceRow, PaymentRow };
