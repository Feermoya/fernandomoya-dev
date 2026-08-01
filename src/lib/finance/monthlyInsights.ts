import type { FinanceEntry, MonthlyInvestmentPlanItem } from '@/lib/finance/types';
import { formatARS } from '@/lib/finance/calculations';

export type MonthlyInsightSeverity = 'good' | 'warning' | 'danger' | 'neutral';

export type MonthlyInsight = {
  id: string;
  title: string;
  detail: string;
  severity: MonthlyInsightSeverity;
};

export type MonthlyInsightSummary = {
  main: MonthlyInsight;
  insights: MonthlyInsight[];
};

const PRIORITY_ORDER = [
  'no-movement',
  'target-complete',
  'plan-pending',
  'low-pace',
  'capital-pending',
  'plan-complete',
] as const;

const NEUTRAL_MAIN: MonthlyInsight = {
  id: 'neutral',
  title: 'Mes en curso',
  detail: 'Seguí cargando inversiones y completando el plan.',
  severity: 'neutral',
};

function buildCandidates(params: {
  currentAmount: number;
  targetAmount: number;
  planCompletedCount: number;
  planTotalCount: number;
  pendingReferenceTotal: number;
}): MonthlyInsight[] {
  const {
    currentAmount,
    targetAmount,
    planCompletedCount,
    planTotalCount,
    pendingReferenceTotal,
  } = params;
  const out: MonthlyInsight[] = [];

  if (currentAmount <= 0) {
    out.push({
      id: 'no-movement',
      title: 'Mes sin movimiento',
      detail: 'Todavía no cargaste inversiones este mes.',
      severity: 'warning',
    });
  }

  if (targetAmount > 0 && currentAmount >= targetAmount) {
    out.push({
      id: 'target-complete',
      title: 'Objetivo cubierto',
      detail: 'Ya cumpliste el objetivo de inversión del mes.',
      severity: 'good',
    });
  }

  if (planTotalCount > 0 && planCompletedCount < planTotalCount) {
    const pending = planTotalCount - planCompletedCount;
    out.push({
      id: 'plan-pending',
      title: pending === 1 ? 'Te falta 1 activo del plan' : `Te faltan ${pending} activos del plan`,
      detail:
        pendingReferenceTotal > 0
          ? `Pendiente estimado ~${formatARS(pendingReferenceTotal)}.`
          : 'Completá los pendientes del plan de foco.',
      severity: 'warning',
    });
  }

  if (planTotalCount > 0 && planCompletedCount === planTotalCount) {
    out.push({
      id: 'plan-complete',
      title: 'Plan completo',
      detail: 'Cubriste todos los activos del plan este mes.',
      severity: 'good',
    });
  }

  if (targetAmount > 0 && currentAmount > 0 && currentAmount < targetAmount * 0.4) {
    out.push({
      id: 'low-pace',
      title: 'Ritmo bajo',
      detail: 'Todavía estás lejos del objetivo mensual.',
      severity: 'warning',
    });
  }

  if (pendingReferenceTotal > 0) {
    out.push({
      id: 'capital-pending',
      title: 'Capital pendiente',
      detail: 'Todavía queda dinero estimado para cubrir el plan.',
      severity: 'neutral',
    });
  }

  return out;
}

export function getMonthlyInsightSummary(params: {
  entries: FinanceEntry[];
  plan: MonthlyInvestmentPlanItem[] | undefined;
  month: string;
  targetAmount: number;
  currentAmount: number;
  planCompletedCount: number;
  planTotalCount: number;
  pendingReferenceTotal: number;
}): MonthlyInsightSummary {
  const candidates = buildCandidates(params);
  const byId = new Map(candidates.map((item) => [item.id, item]));

  let main = NEUTRAL_MAIN;
  for (const id of PRIORITY_ORDER) {
    const found = byId.get(id);
    if (found) {
      main = found;
      break;
    }
  }

  const insights = PRIORITY_ORDER.map((id) => byId.get(id))
    .filter((item): item is MonthlyInsight => item !== undefined && item.id !== main.id)
    .slice(0, 2);

  return { main, insights };
}
