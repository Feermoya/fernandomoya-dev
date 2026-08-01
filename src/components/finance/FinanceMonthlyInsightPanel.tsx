import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  Target,
} from 'lucide-react';
import { buildAttentionItems, type AttentionSeverity } from '@/lib/finance/attentionItems';
import { getMonthlyInvested } from '@/lib/finance/calculations';
import { fetchFinancePrices } from '@/lib/finance/financePrices';
import type { MonthlyMissionView } from '@/lib/finance/levels';
import { buildMarketAlerts } from '@/lib/finance/marketAlerts';
import { getTickerMonthlyBreakdown } from '@/lib/finance/monthlyBreakdown';
import { getMonthlyPlanProgress } from '@/lib/finance/monthlyInvestmentPlan';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import type { FinanceState } from '@/lib/finance/types';
import { FinanceSectionHeading } from '@/components/finance/FinanceSectionHeading';

type Props = {
  state: FinanceState;
  month: string;
  mission: MonthlyMissionView;
};

function severityIcon(severity: AttentionSeverity) {
  switch (severity) {
    case 'good':
      return CheckCircle2;
    case 'warning':
      return AlertTriangle;
    case 'danger':
      return AlertTriangle;
    default:
      return Info;
  }
}

function severityClass(severity: AttentionSeverity): string {
  switch (severity) {
    case 'good':
      return 'text-emerald-700';
    case 'warning':
      return 'text-amber-800';
    case 'danger':
      return 'text-red-700';
    default:
      return 'text-slate-700';
  }
}

export function FinanceMonthlyInsightPanel({ state, month, mission }: Props) {
  const holdings = state.portfolioHoldings ?? [];
  const tickers = useMemo(
    () => getTrackedTickersFromPortfolio(state.entries, holdings),
    [state.entries, holdings],
  );
  const [prices, setPrices] = useState<
    Record<string, import('@/lib/finance/financePrices').FinancePrice>
  >({});

  useEffect(() => {
    if (tickers.length === 0) {
      setPrices({});
      return;
    }
    let cancelled = false;
    void fetchFinancePrices(tickers).then((res) => {
      if (!cancelled) setPrices(res.prices);
    });
    return () => {
      cancelled = true;
    };
  }, [tickers.join(',')]);

  const planProgress = useMemo(
    () =>
      getMonthlyPlanProgress({
        plan: state.monthlyInvestmentPlan,
        entries: state.entries,
        month,
      }),
    [state.monthlyInvestmentPlan, state.entries, month],
  );

  const concentration = useMemo(
    () => getTickerMonthlyBreakdown(state.entries, month),
    [state.entries, month],
  );

  const alerts = useMemo(
    () => buildMarketAlerts({ entries: state.entries, prices, holdings }),
    [state.entries, prices, holdings],
  );

  const monthInvested = useMemo(
    () => getMonthlyInvested(state.entries, month),
    [state.entries, month],
  );

  const missingPriceTickers = useMemo(() => {
    return tickers.filter((t) => {
      const p = prices[t];
      return !p || !(p.price > 0) || p.source === 'missing';
    });
  }, [tickers, prices]);

  const items = useMemo(
    () =>
      buildAttentionItems({
        planPendingCount: Math.max(0, planProgress.totalCount - planProgress.completedCount),
        planTotalCount: planProgress.totalCount,
        monthInvested,
        targetAmount: mission.targetAmount,
        alerts,
        concentration: concentration.total > 0 ? concentration : null,
        missingPriceTickers: Object.keys(prices).length > 0 ? missingPriceTickers : [],
      }),
    [
      planProgress.totalCount,
      planProgress.completedCount,
      monthInvested,
      mission.targetAmount,
      alerts,
      concentration,
      missingPriceTickers,
      prices,
    ],
  );

  return (
    <section className="finance-card-compact p-3" aria-labelledby="monthly-insight-heading">
      <FinanceSectionHeading
        id="monthly-insight-heading"
        title="Qué mirar ahora"
        subtitle="Hasta 3 señales prioritarias"
        icon={Eye}
        iconTone="amber"
      />

      {items.length === 0 ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">Sin señales fuertes por ahora.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => {
            const Icon = item.id.startsWith('plan')
              ? Target
              : severityIcon(item.severity);
            return (
              <li key={item.id} className="flex gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    item.severity === 'good'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.severity === 'warning' || item.severity === 'danger'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex items-start gap-1.5 text-sm font-bold leading-snug ${severityClass(item.severity)}`}
                  >
                    <Icon size={14} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
                    <span>{item.title}</span>
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{item.detail}</p>
                  ) : null}
                  {item.actionHref ? (
                    <a
                      href={item.actionHref}
                      className="mt-1 inline-block text-[11px] font-bold text-blue-600 underline-offset-2 hover:underline"
                    >
                      {item.actionLabel ?? 'Ir'}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
