import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Circle,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { FinanceEntry } from '@/lib/finance/types';
import {
  fetchFinancePrices,
  formatPricesFetchedTime,
} from '@/lib/finance/financePrices';
import {
  buildMarketAlerts,
  getTrackedTickersFromEntries,
  type MarketAlert,
  type MarketAlertSeverity,
} from '@/lib/finance/marketAlerts';

type Props = {
  entries: FinanceEntry[];
};

function alertIcon(severity: MarketAlertSeverity) {
  switch (severity) {
    case 'opportunity':
      return TrendingDown;
    case 'positive':
      return TrendingUp;
    case 'warning':
      return AlertTriangle;
    default:
      return Circle;
  }
}

function alertShellClass(severity: MarketAlertSeverity): string {
  switch (severity) {
    case 'opportunity':
      return 'border-amber-200 bg-amber-50/80';
    case 'positive':
      return 'border-emerald-200 bg-emerald-50/80';
    case 'warning':
      return 'border-red-200 bg-red-50/80';
    default:
      return 'border-slate-200 bg-slate-50/80';
  }
}

function alertTitleClass(severity: MarketAlertSeverity): string {
  switch (severity) {
    case 'opportunity':
      return 'text-amber-900';
    case 'positive':
      return 'text-emerald-900';
    case 'warning':
      return 'text-red-800';
    default:
      return 'text-slate-800';
  }
}

function AlertItem({ alert }: { alert: MarketAlert }) {
  const Icon = alertIcon(alert.severity);
  return (
    <li className={`rounded-xl border px-3 py-2.5 ${alertShellClass(alert.severity)}`}>
      <div className="flex items-start gap-2">
        <Icon
          size={16}
          strokeWidth={2.25}
          className={`mt-0.5 shrink-0 ${alertTitleClass(alert.severity)}`}
          aria-hidden
        />
        <div className="min-w-0">
          <p className={`text-sm font-black leading-snug ${alertTitleClass(alert.severity)}`}>
            {alert.title}
          </p>
          <p className="mt-0.5 text-xs font-medium leading-snug text-slate-600">{alert.detail}</p>
        </div>
      </div>
    </li>
  );
}

export function FinanceMarketAlerts({ entries }: Props) {
  const tickers = useMemo(() => getTrackedTickersFromEntries(entries), [entries]);
  const tickersKey = tickers.join(',');

  const [prices, setPrices] = useState<Record<string, import('@/lib/finance/financePrices').FinancePrice>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    const result = await fetchFinancePrices(tickers);
    setLoading(false);
    setPrices(result.prices);
    setFetchedAt(result.fetchedAt);
    if (!result.ok && result.error) setError(result.error);
  }, [tickers]);

  useEffect(() => {
    if (tickers.length === 0) return;
    void load();
  }, [tickersKey, load, tickers.length]);

  const alerts = useMemo(
    () => buildMarketAlerts({ entries, prices }),
    [entries, prices],
  );

  if (tickers.length === 0) return null;

  const fetchedLabel = formatPricesFetchedTime(fetchedAt);

  return (
    <section
      className="finance-card-compact p-3"
      aria-labelledby="market-alerts-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="market-alerts-heading"
            className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900"
          >
            <Bell size={18} strokeWidth={2.25} className="shrink-0 text-blue-600" aria-hidden />
            Alertas de mercado
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Según tus activos cargados</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="finance-secondary-button inline-flex min-h-[32px] items-center gap-1.5 px-2.5 text-[10px] font-bold disabled:opacity-50"
        >
          <RefreshCcw
            size={14}
            strokeWidth={2.25}
            className={loading ? 'motion-safe:animate-spin' : ''}
            aria-hidden
          />
          Actualizar
        </button>
      </div>

      {fetchedLabel ? (
        <p className="mt-1.5 text-[10px] font-medium text-slate-400">Precios · {fetchedLabel}</p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[11px] font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading && alerts.length === 0 ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">Consultando precios…</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[9px] leading-snug text-slate-400">
        Seguimiento informativo. No es asesoramiento financiero. Si activaste alertas por WhatsApp en
        Recordatorios, el cron diario también te avisa sin abrir la app.
      </p>
    </section>
  );
}
