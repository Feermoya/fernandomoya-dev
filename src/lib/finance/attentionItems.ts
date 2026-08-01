/**
 * Ítems de “Qué mirar ahora” — máximo 3, basados en datos reales.
 */

import { formatARS } from '@/lib/finance/calculations';
import type { MarketAlert } from '@/lib/finance/marketAlerts';
import { sortMarketAlertsForDisplay } from '@/lib/finance/portfolio/portfolioView';
import type { TickerMonthlyBreakdown } from '@/lib/finance/monthlyBreakdown';

export type AttentionSeverity = 'good' | 'warning' | 'danger' | 'neutral';

export type AttentionItem = {
  id: string;
  title: string;
  detail?: string;
  severity: AttentionSeverity;
  actionHref?: string;
  actionLabel?: string;
};

export function buildAttentionItems(params: {
  planPendingCount: number;
  planTotalCount: number;
  monthInvested: number;
  targetAmount: number;
  alerts: MarketAlert[];
  concentration: TickerMonthlyBreakdown | null;
  missingPriceTickers?: string[];
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (params.planTotalCount > 0 && params.planPendingCount > 0) {
    items.push({
      id: 'plan-pending',
      title:
        params.planPendingCount === 1
          ? 'Te falta 1 activo del plan.'
          : `Te faltan ${params.planPendingCount} activos del plan.`,
      severity: 'warning',
      actionHref: undefined,
      actionLabel: 'Ver plan',
    });
  }

  const actionable = sortMarketAlertsForDisplay(
    params.alerts.filter((a) => a.kind !== 'neutral'),
  );
  const topAlert = actionable[0];
  if (topAlert) {
    const pct =
      typeof topAlert.changePercent === 'number'
        ? Math.abs(topAlert.changePercent).toFixed(1).replace('.', ',')
        : null;
    let title = topAlert.title;
    if (topAlert.kind === 'loss-since-buy' && pct) {
      title = `${topAlert.ticker} está ${pct}% debajo de tu compra.`;
    } else if (topAlert.kind === 'daily-drop' && pct) {
      title = `${topAlert.ticker} bajó ${pct}% hoy.`;
    } else if (topAlert.kind === 'daily-rise' && pct) {
      title = `${topAlert.ticker} subió ${pct}% hoy.`;
    } else if (topAlert.kind === 'gain-since-buy' && pct) {
      title = `${topAlert.ticker} está ${pct}% arriba de tu compra.`;
    }
    items.push({
      id: `alert:${topAlert.id}`,
      title,
      severity:
        topAlert.severity === 'opportunity' || topAlert.severity === 'warning'
          ? 'warning'
          : topAlert.severity === 'positive'
            ? 'good'
            : 'neutral',
    });
  }

  if (
    params.concentration?.topItem &&
    (params.concentration.concentrationWarning || params.concentration.topItem.percent >= 35)
  ) {
    const t = params.concentration.topItem;
    items.push({
      id: 'concentration',
      title: `${t.label} concentra el ${t.percent.toFixed(0)}% de la inversión del mes.`,
      severity: 'warning',
    });
  }

  if (params.targetAmount > 0 && params.monthInvested <= 0) {
    items.push({
      id: 'no-movement',
      title: 'Todavía no cargaste inversiones este mes.',
      severity: 'warning',
      actionHref: '#inversion',
      actionLabel: 'Cargar',
    });
  } else if (
    params.targetAmount > 0 &&
    params.monthInvested > 0 &&
    params.monthInvested < params.targetAmount * 0.4
  ) {
    const missing = params.targetAmount - params.monthInvested;
    items.push({
      id: 'low-pace',
      title: `Vas a ${formatARS(params.monthInvested)}; faltan ${formatARS(missing)} al objetivo.`,
      severity: 'warning',
    });
  }

  if (params.missingPriceTickers && params.missingPriceTickers.length > 0) {
    const sample = params.missingPriceTickers.slice(0, 2).join(', ');
    items.push({
      id: 'missing-price',
      title:
        params.missingPriceTickers.length === 1
          ? `Sin precio para ${sample}.`
          : `Sin precio en ${params.missingPriceTickers.length} activos (${sample}…).`,
      severity: 'neutral',
    });
  }

  if (
    params.planTotalCount > 0 &&
    params.planPendingCount === 0 &&
    params.targetAmount > 0 &&
    params.monthInvested >= params.targetAmount
  ) {
    items.push({
      id: 'all-good',
      title: 'Plan y objetivo del mes cubiertos.',
      severity: 'good',
    });
  }

  // Deduplicar por id y cortar a 3
  const seen = new Set<string>();
  const out: AttentionItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= 3) break;
  }
  return out;
}
