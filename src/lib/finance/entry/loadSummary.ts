/**
 * Resumen estructurado tras cargar una inversión.
 * Separa copy de celebración / plan / nivel para UI y toasts.
 */

import { formatARS, formatEntryAmount, getMonthlyInvested } from '@/lib/finance/calculations';
import { formatUnits } from '@/lib/finance/entry/inputModes';
import { getEntryTicker } from '@/lib/finance/entryTicker';
import {
  formatPlanMissingListForToast,
  getMonthlyPlanProgress,
  getNewlyCompletedPlanLabels,
} from '@/lib/finance/monthlyInvestmentPlan';
import { getMonthlyLevel, getMonthlyMissionView } from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';
import type { FinanceEntry, FinanceState } from '@/lib/finance/types';
import { formatFinancePrice } from '@/lib/finance/financePrices';

export type EntryLoadSummaryLineTone = 'positive' | 'info' | 'warning' | 'neutral';

export type EntryLoadSummaryLine = {
  tone: EntryLoadSummaryLineTone;
  text: string;
};

export type EntryLoadSummary = {
  id: string;
  headline: string;
  lines: EntryLoadSummaryLine[];
  /** Texto corto para toast Sileo. */
  toastDescription: string;
  levelUp?: {
    level: number;
    title: string;
    icon: string;
    message?: string;
  };
  entrySnapshot: {
    amount: number;
    amountCurrency?: string;
    ticker?: string;
    units?: number;
    buyPrice?: number;
    buyCurrency?: string;
  };
};

function levelUpMessageFor(nextLevel: number): string | undefined {
  if (nextLevel === 2) return 'Ahora estás construyendo repetición, no entusiasmo.';
  return undefined;
}

export function buildEntryLoadSummary(params: {
  prev: FinanceState;
  next: FinanceState;
  entry: FinanceEntry;
}): EntryLoadSummary {
  const { prev, next, entry } = params;
  const m = entry.month;
  const ticker = getEntryTicker(entry) ?? entry.category ?? entry.asset;
  const beforePlan = getMonthlyPlanProgress({
    plan: prev.monthlyInvestmentPlan,
    entries: prev.entries,
    month: m,
  });
  const afterPlan = getMonthlyPlanProgress({
    plan: next.monthlyInvestmentPlan,
    entries: next.entries,
    month: m,
  });
  const prevLevel = getMonthlyLevel(prev, m).level;
  const newLevel = getMonthlyLevel(next, m).level;
  const amountLabel = formatEntryAmount(entry.amount, entry.amountCurrency);
  const invArs = getMonthlyInvested(next.entries, m, 'ARS');
  const invUsd = getMonthlyInvested(next.entries, m, 'USD');
  const mv = getMonthlyMissionView(next, m);

  const lines: EntryLoadSummaryLine[] = [];

  if (ticker) {
    lines.push({
      tone: 'neutral',
      text: entry.estimatedUnits
        ? `${amountLabel} · ${formatUnits(entry.estimatedUnits)} nominales de ${ticker}`
        : `${amountLabel} en ${ticker}`,
    });
  } else {
    lines.push({ tone: 'neutral', text: amountLabel });
  }

  if (entry.buyPrice && entry.buyPrice > 0) {
    const cur = entry.buyCurrency ?? 'ARS';
    lines.push({
      tone: 'info',
      text: `Precio de referencia ${formatFinancePrice(entry.buyPrice, cur)}`,
    });
  }

  const monthLine =
    invUsd > 0
      ? `${formatARS(invArs)} + ${formatEntryAmount(invUsd, 'USD')} este mes · ${mv.percent.toFixed(0)}% del objetivo ARS`
      : `${formatARS(invArs)} este mes · ${mv.percent.toFixed(0)}% del objetivo`;
  lines.push({
    tone: 'info',
    text: monthLine,
  });

  if (afterPlan.totalCount > 0 && afterPlan.completedCount > beforePlan.completedCount) {
    const newlyDone = getNewlyCompletedPlanLabels(beforePlan, afterPlan);
    if (newlyDone.length > 0) {
      lines.push({
        tone: 'positive',
        text:
          newlyDone.length === 1
            ? `Compraste ${newlyDone[0]} del plan`
            : `Compraste ${newlyDone.join(', ')} del plan`,
      });
    }
    if (afterPlan.completedCount >= afterPlan.totalCount) {
      lines.push({ tone: 'positive', text: 'Plan del mes completo' });
    } else {
      const missing = formatPlanMissingListForToast(afterPlan.missingLabels);
      if (missing) {
        lines.push({ tone: 'warning', text: `Todavía falta ${missing}` });
      }
    }
  } else if (afterPlan.totalCount > 0 && afterPlan.missingLabels.length > 0) {
    const missing = formatPlanMissingListForToast(afterPlan.missingLabels);
    if (missing) {
      lines.push({ tone: 'warning', text: `Pendiente en el plan: ${missing}` });
    }
  }

  let levelUp: EntryLoadSummary['levelUp'];
  if (newLevel > prevLevel) {
    const info = getMonthlyLevel(next, m);
    const th = getLevelTheme(newLevel);
    levelUp = {
      level: newLevel,
      title: info.title,
      icon: th.icon,
      message: levelUpMessageFor(newLevel),
    };
    lines.push({
      tone: 'positive',
      text: `Subiste a nivel ${newLevel} · ${info.title}`,
    });
  }

  const toastParts = lines
    .filter((l) => l.tone === 'positive' || l.tone === 'warning' || l.tone === 'neutral')
    .slice(0, 4)
    .map((l) => l.text);

  return {
    id: entry.id,
    headline: levelUp ? `Nivel ${levelUp.level} desbloqueado` : 'Inversión cargada',
    lines,
    toastDescription: toastParts.join(' · ') || formatEntryAmount(entry.amount, entry.amountCurrency),
    levelUp,
    entrySnapshot: {
      amount: entry.amount,
      amountCurrency: entry.amountCurrency,
      ticker: ticker || undefined,
      units: entry.estimatedUnits,
      buyPrice: entry.buyPrice,
      buyCurrency: entry.buyCurrency,
    },
  };
}
