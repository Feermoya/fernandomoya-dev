import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Circle,
  MessageCircle,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import type { FinanceEntry, FinancePreferences } from '@/lib/finance/types';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';
import {
  fetchFinancePrices,
  formatPricesFetchedTime,
} from '@/lib/finance/financePrices';
import {
  buildMarketAlerts,
  type MarketAlert,
  type MarketAlertSeverity,
} from '@/lib/finance/marketAlerts';
import { sortMarketAlertsForDisplay } from '@/lib/finance/portfolio/portfolioView';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import { syncMarketAlertsWhatsApp } from '@/lib/finance/marketAlertAutoNotify';
import { normalizePreferences, whatsappAutomationReadiness } from '@/lib/finance/preferences';
import { requestMarketWhatsAppTest } from '@/lib/finance/whatsappTestClient';
import { FinanceSectionHeading } from '@/components/finance/FinanceSectionHeading';
import { sileo } from 'sileo';

type Props = {
  entries: FinanceEntry[];
  holdings?: FinancePortfolioHolding[];
  preferences: FinancePreferences;
  onPreferencesChange: (prefs: FinancePreferences) => void;
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

export function FinanceMarketAlerts({
  entries,
  holdings = [],
  preferences,
  onPreferencesChange,
}: Props) {
  const tickers = useMemo(
    () => getTrackedTickersFromPortfolio(entries, holdings),
    [entries, holdings],
  );
  const tickersKey = tickers.join(',');
  const prefs = useMemo(() => normalizePreferences(preferences), [preferences]);
  const readiness = whatsappAutomationReadiness(prefs.reminder);

  const [prices, setPrices] = useState<
    Record<string, import('@/lib/finance/financePrices').FinancePrice>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [waBusy, setWaBusy] = useState(false);
  const [lastAutoStatus, setLastAutoStatus] = useState<string | null>(null);

  const runAutoNotify = useCallback(
    async (nextPrices: typeof prices) => {
      if (!prefs.reminder.marketWhatsAppEnabled || !readiness.apiKeyOk) return;
      if (Object.keys(nextPrices).length === 0) return;

      const { result, nextReminder } = await syncMarketAlertsWhatsApp({
        entries,
        holdings,
        prices: nextPrices,
        preferences: prefs,
      });

      if (nextReminder) {
        onPreferencesChange({
          ...prefs,
          reminder: nextReminder,
        });
      }

      if (result.action === 'sent') {
        setLastAutoStatus(
          result.freshCount === 1
            ? 'WhatsApp enviado por 1 alerta nueva'
            : `WhatsApp enviado por ${result.freshCount} alertas nuevas`,
        );
        sileo.info({
          title: 'WhatsApp · alertas de mercado',
          description:
            result.freshCount === 1
              ? 'Se envió 1 alerta nueva.'
              : `Se enviaron ${result.freshCount} alertas nuevas.`,
        });
      }
    },
    [entries, holdings, prefs, readiness.apiKeyOk, onPreferencesChange],
  );

  const load = useCallback(async (opts?: { notify?: boolean }) => {
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    const result = await fetchFinancePrices(tickers);
    setLoading(false);
    setPrices(result.prices);
    setFetchedAt(result.fetchedAt);
    if (!result.ok && result.error) {
      setError(result.error);
      if (opts?.notify) {
        sileo.error({ title: 'Error al consultar precios', description: result.error });
      }
      return;
    }
    if (opts?.notify) {
      sileo.info({
        title: 'Precios actualizados',
        description: formatPricesFetchedTime(result.fetchedAt) || undefined,
      });
    }
  }, [tickers]);

  useEffect(() => {
    if (tickers.length === 0) return;
    void load();
  }, [tickersKey, load, tickers.length]);

  useEffect(() => {
    if (loading || !fetchedAt) return;
    void runAutoNotify(prices);
  }, [loading, fetchedAt, prices, runAutoNotify]);

  const alerts = useMemo(
    () => buildMarketAlerts({ entries, prices, holdings }),
    [entries, prices, holdings],
  );

  const rankedAlerts = useMemo(
    () =>
      sortMarketAlertsForDisplay(alerts.filter((a) => a.kind !== 'neutral')).concat(
        alerts.filter((a) => a.kind === 'neutral'),
      ),
    [alerts],
  );

  const sendWhatsApp = useCallback(async () => {
    setWaBusy(true);
    try {
      await sileo.promise(
        (async () => {
          const { result, nextReminder } = await syncMarketAlertsWhatsApp({
            entries,
            holdings,
            prices,
            preferences: prefs,
            force: true,
          });
          if (nextReminder) {
            onPreferencesChange({
              ...prefs,
              reminder: nextReminder,
            });
          }
          if (result.action === 'error') {
            return { ok: false as const, message: result.message };
          }
          if (result.action === 'sent') {
            setLastAutoStatus('WhatsApp reenviado');
            return {
              ok: true as const,
              message: 'Pedido aceptado. Revisá WhatsApp.',
            };
          }
          // Sin alertas accionables: mandar mensaje vacío de prueba (igual que antes)
          const fallback = await requestMarketWhatsAppTest(alerts);
          return fallback;
        })(),
        {
          loading: { title: 'Enviando WhatsApp…' },
          success: (r) => ({
            title: r.ok ? 'WhatsApp enviado' : 'No se pudo enviar',
            description: r.message,
          }),
          error: {
            title: 'Error de WhatsApp',
            description: 'No se pudo completar el envío.',
          },
        },
      );
    } finally {
      setWaBusy(false);
    }
  }, [alerts, entries, holdings, prices, prefs, onPreferencesChange]);

  if (tickers.length === 0) return null;

  const fetchedLabel = formatPricesFetchedTime(fetchedAt);
  const autoOn = prefs.reminder.marketWhatsAppEnabled && readiness.apiKeyOk;
  const actionable = rankedAlerts.filter((a) => a.kind !== 'neutral');
  const top = actionable[0] ?? rankedAlerts[0];
  const alertCount = actionable.length > 0 ? actionable.length : rankedAlerts.length;

  return (
    <section className="finance-card-compact p-3" aria-labelledby="market-alerts-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <FinanceSectionHeading
          id="market-alerts-heading"
          title="Alertas"
          subtitle={
            loading && alertCount === 0
              ? 'Consultando…'
              : `${alertCount} ${alertCount === 1 ? 'alerta' : 'alertas'}${fetchedLabel ? ` · ${fetchedLabel}` : ''}`
          }
          icon={TriangleAlert}
          iconTone="amber"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load({ notify: true })}
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
          <button
            type="button"
            disabled={waBusy || loading}
            onClick={() => void sendWhatsApp()}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-xl bg-[#25D366] px-2.5 text-[10px] font-bold text-white shadow-sm disabled:opacity-50"
          >
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            {waBusy ? 'Enviando…' : 'WhatsApp'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-[11px] font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading && alertCount === 0 ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">Consultando precios…</p>
      ) : top ? (
        <div className="mt-2.5">
          <div className={`rounded-xl border px-3 py-2.5 ${alertShellClass(top.severity)}`}>
            <p className={`text-sm font-black leading-snug ${alertTitleClass(top.severity)}`}>
              {top.ticker}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">{top.title}</p>
          </div>

          {alertCount > 1 ? (
            <details className="group/alerts mt-2">
              <summary className="cursor-pointer list-none text-[11px] font-bold text-blue-700 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                <span className="group-open/alerts:hidden">Ver las {alertCount} alertas</span>
                <span className="hidden group-open/alerts:inline">Ocultar listado</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {rankedAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-[9px] leading-snug text-slate-400">
        {autoOn
          ? 'Si aparece una alerta nueva al actualizar, se manda WhatsApp solo con esa novedad.'
          : 'Activá “Alertas de mercado” y la API key en Avisos WhatsApp para el envío automático.'}
        {lastAutoStatus ? ` · ${lastAutoStatus}` : ''}
      </p>
    </section>
  );
}
