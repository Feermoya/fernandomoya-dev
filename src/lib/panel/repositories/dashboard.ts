import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateCollectedInMonth, calculateMrr } from '@/lib/panel/mrr';
import { parseIsoDateParts, toPeriodStart } from '@/lib/panel/dates';
import { ensureRecurringChargesForMonth } from '@/lib/panel/charges/ensureRecurring';
import { sortChargesForList } from '@/lib/panel/charges/sort';
import {
  countActiveClients,
  listActiveRecurringServices,
  listChargesWithRelations,
  listPaymentsInMonth,
  listUsdRecurringChargePeriods,
} from '@/lib/panel/repositories/reads';
import {
  formatMonthTitle,
  monthLabelFromPeriod,
  type DashboardData,
  type MrrSeriesPoint,
  todayIsoDate,
} from '@/lib/panel/view-types';

function nextMonthStart(monthStart: string): string {
  const { year, month } = parseIsoDateParts(monthStart);
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Serie mensual de MRR USD a partir de charges históricos recurrentes.
 * Un mes = suma de reference_amount USD de charges con ese period.
 * No inventa meses: solo períodos presentes en DB.
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

  const [clientsRes, servicesRes, chargesRes, paymentsRes, historyRes] = await Promise.all([
    countActiveClients(supabase),
    listActiveRecurringServices(supabase),
    listChargesWithRelations(supabase),
    listPaymentsInMonth(supabase, monthStart, nextStart),
    listUsdRecurringChargePeriods(supabase),
  ]);

  const firstError =
    clientsRes.error ||
    servicesRes.error ||
    chargesRes.error ||
    paymentsRes.error ||
    historyRes.error;

  if (firstError) {
    return { data: null, error: firstError };
  }

  const mrr = calculateMrr(servicesRes.data, today);
  const collected = calculateCollectedInMonth(paymentsRes.data, today);
  const charges = sortChargesForList(chargesRes.data);

  const overdueCount = charges.filter((c) => c.status === 'overdue').length;
  const upcomingCount = charges.filter((c) => c.status === 'upcoming').length;
  const dueTodayCount = charges.filter((c) => c.status === 'due_today').length;

  const unpaidCharges = charges
    .filter(
      (c) => c.status === 'upcoming' || c.status === 'due_today' || c.status === 'overdue',
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const upcomingCharges = unpaidCharges
    .filter((c) => c.status === 'upcoming' || c.status === 'due_today')
    .slice(0, 5);

  const attentionCharges = unpaidCharges
    .filter((c) => c.status === 'overdue' || c.status === 'due_today')
    .slice(0, 5);

  const historySeries = buildHistoricalMrrUsdSeries(historyRes.data);
  const mrrSeries = appendCurrentMrrPoint(historySeries, mrr.usd, today);

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
      overdueCount,
      upcomingCount,
      dueTodayCount,
      upcomingCharges,
      attentionCharges,
      unpaidCharges,
      mrrSeries,
    },
    error: null,
  };
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
