import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateCollectedInMonth, calculateMrr } from '@/lib/panel/mrr';
import { parseIsoDateParts, toPeriodStart } from '@/lib/panel/dates';
import { ensureRecurringChargesForMonth } from '@/lib/panel/charges/ensureRecurring';
import { sortChargesForList } from '@/lib/panel/charges/sort';
import { listNextExpectedCharges } from '@/lib/panel/charges/nextExpected';
import { buildCollectedArsByMonth } from '@/lib/panel/charges/collectedByMonth';
import { sumCollectedByCurrency } from '@/lib/panel/charges/collectedTotals';
import {
  countActiveClients,
  listActiveRecurringServicesWithClients,
  listArsPaymentsForCollectedSeries,
  listChargesWithRelations,
  listPaymentAmountsForTotals,
  listPaymentsInMonth,
} from '@/lib/panel/repositories/reads';
import {
  formatMonthTitle,
  monthLabelFromPeriod,
  type DashboardData,
  type MrrSeriesPoint,
  type UpcomingExpectationItem,
  todayIsoDate,
} from '@/lib/panel/view-types';

function nextMonthStart(monthStart: string): string {
  const { year, month } = parseIsoDateParts(monthStart);
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

export async function loadDashboard(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<{ data: DashboardData | null; error: string | null }> {
  const today = todayIsoDate(now);
  const monthStart = toPeriodStart(today);
  const nextStart = nextMonthStart(monthStart);

  // Idempotente: crea charges del mes operativo si faltan (previous_month → período anterior).
  const ensure = await ensureRecurringChargesForMonth(supabase, today);
  if (ensure.error) {
    return { data: null, error: ensure.error };
  }

  const [clientsRes, servicesRes, chargesRes, paymentsRes, collectedHistoryRes, totalsRes] =
    await Promise.all([
      countActiveClients(supabase),
      listActiveRecurringServicesWithClients(supabase),
      listChargesWithRelations(supabase),
      listPaymentsInMonth(supabase, monthStart, nextStart),
      listArsPaymentsForCollectedSeries(supabase),
      listPaymentAmountsForTotals(supabase),
    ]);

  const firstError =
    clientsRes.error ||
    servicesRes.error ||
    chargesRes.error ||
    paymentsRes.error ||
    collectedHistoryRes.error ||
    totalsRes.error;

  if (firstError) {
    return { data: null, error: firstError };
  }

  const mrr = calculateMrr(servicesRes.data, today);
  const collected = calculateCollectedInMonth(paymentsRes.data, today);
  const charges = sortChargesForList(chargesRes.data);

  const overdueCount = charges.filter((c) => c.status === 'overdue').length;
  const dueTodayCount = charges.filter((c) => c.status === 'due_today').length;

  const unpaidCharges = charges
    .filter(
      (c) => c.status === 'upcoming' || c.status === 'due_today' || c.status === 'overdue',
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const attentionCharges = unpaidCharges
    .filter((c) => c.status === 'overdue' || c.status === 'due_today')
    .slice(0, 5);

  const existingForProjection = charges.map((c) => ({
    id: c.id,
    service_id: c.serviceId,
    period: c.period,
    due_date: c.dueDate,
    hasPayment: Boolean(c.payment) || c.status === 'paid',
  }));

  const nextExpected = listNextExpectedCharges(
    servicesRes.data.map((s) => ({
      id: s.id,
      active: s.active,
      billing_type: s.billing_type,
      billing_mode: s.billing_mode,
      due_day: s.due_day,
      reference_amount: s.reference_amount,
      reference_currency: s.reference_currency,
      start_date: s.start_date,
      ended_at: s.ended_at,
      client_id: s.client_id,
      name: s.name,
      client_name: s.client_name,
    })),
    existingForProjection,
    today,
  );

  const upcomingExpectations: UpcomingExpectationItem[] = nextExpected.map((n) => ({
    serviceId: n.serviceId,
    clientId: n.clientId,
    clientName: n.clientName,
    serviceName: n.serviceName,
    period: n.period,
    dueDate: n.dueDate,
    referenceAmount: n.referenceAmount,
    referenceCurrency: n.referenceCurrency,
    chargeId: n.chargeId,
  }));

  const upcomingCharges = upcomingExpectations.slice(0, 8).map((n) => ({
    id: n.chargeId ?? `expected:${n.serviceId}:${n.period}`,
    serviceId: n.serviceId,
    clientId: n.clientId,
    clientName: n.clientName,
    serviceName: n.serviceName,
    period: n.period,
    referenceAmount: n.referenceAmount,
    referenceCurrency: n.referenceCurrency,
    dueDate: n.dueDate,
    status: 'upcoming' as const,
    payment: null,
  }));

  const collectedSeries = buildCollectedArsByMonth(collectedHistoryRes.data);
  const totals = sumCollectedByCurrency(totalsRes.data);

  return {
    data: {
      today,
      monthLabel: formatMonthTitle(today),
      activeClients: clientsRes.count,
      activeServices: servicesRes.data.length,
      mrrUsd: mrr.usd,
      mrrArs: mrr.ars,
      collectedThisMonthArs: collected.ars,
      collectedThisMonthUsd: collected.usd,
      totalCollectedArs: totals.totalCollectedARS,
      totalCollectedUsd: totals.totalCollectedUSD,
      overdueCount,
      upcomingCount: upcomingExpectations.length,
      dueTodayCount,
      upcomingCharges,
      upcomingExpectations,
      attentionCharges,
      unpaidCharges,
      mrrSeries: [],
      collectedSeries,
    },
    error: null,
  };
}

/**
 * Serie mensual de MRR USD a partir de charges históricos recurrentes.
 * Conservada para tests; el Dashboard ya no la usa como gráfico principal.
 */
export function buildHistoricalMrrUsdSeries(
  rows: Array<{ period: string; reference_amount: number }>,
): MrrSeriesPoint[] {
  const byPeriod = new Map<string, number>();

  for (const row of rows) {
    const key = toPeriodStart(row.period);
    byPeriod.set(key, (byPeriod.get(key) ?? 0) + Number(row.reference_amount));
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, mrrUsd]) => ({
      month: period.slice(0, 7),
      label: monthLabelFromPeriod(period),
      mrrUsd,
    }));
}

/** Añade/actualiza el mes corriente con el MRR contractual vivo (no inventa pasado). */
export function appendCurrentMrrPoint(
  series: MrrSeriesPoint[],
  currentMrrUsd: number,
  todayIso: string,
): MrrSeriesPoint[] {
  const month = todayIso.slice(0, 7);
  const point: MrrSeriesPoint = {
    month,
    label: monthLabelFromPeriod(month),
    mrrUsd: currentMrrUsd,
  };
  if (series.length === 0) return [point];
  const last = series[series.length - 1];
  if (last.month === month) {
    return [...series.slice(0, -1), point];
  }
  return [...series, point];
}
