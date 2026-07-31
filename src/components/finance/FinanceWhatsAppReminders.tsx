import { useMemo, useState } from 'react';
import { sileo } from 'sileo';
import { site } from '@/data/site';
import { evaluateInvestmentWhatsAppNudge } from '@/lib/finance/levels';
import { approximateNextMonitorHint } from '@/lib/finance/monitor/marketHours';
import { requestMarketMonitorProbe } from '@/lib/finance/monitor/monitorClient';
import { normalizePreferences, whatsappAutomationReadiness } from '@/lib/finance/preferences';
import { getArgentinaDateParts } from '@/lib/finance/timezone';
import type { FinanceMonitorStatus, FinancePreferences, FinanceState } from '@/lib/finance/types';
import {
  requestCombinedWhatsAppTest,
  requestInvestmentWhatsAppTest,
  requestMarketWhatsAppTest,
} from '@/lib/finance/whatsappTestClient';
import { buildMarketAlerts } from '@/lib/finance/marketAlerts';
import { getTrackedTickersFromPortfolio } from '@/lib/finance/portfolio/consolidate';
import { fetchFinancePrices } from '@/lib/finance/financePrices';

type Props = {
  state: FinanceState;
  onPreferencesChange: (prefs: FinancePreferences) => void;
  onMonitorStatusChange?: (status: FinanceMonitorStatus) => void;
};

function formatMonitorWhen(iso?: string): string {
  if (!iso) return 'Nunca';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'Nunca';
  return new Date(t).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monitorTone(status: FinanceState['monitorStatus']): 'green' | 'amber' | 'red' | 'gray' {
  if (!status?.lastRunAt) return 'gray';
  if (status.lastErrorCode && status.lastErrorAt) {
    const errAt = Date.parse(status.lastErrorAt);
    const okAt = status.lastSuccessfulRunAt ? Date.parse(status.lastSuccessfulRunAt) : 0;
    if (Number.isFinite(errAt) && errAt >= (okAt || 0)) return 'red';
  }
  if (status.lastSuccessfulRunAt) {
    const age = Date.now() - Date.parse(status.lastSuccessfulRunAt);
    if (Number.isFinite(age) && age > 45 * 60 * 1000) return 'amber';
    return 'green';
  }
  return 'amber';
}

const TONE_CLASS = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-rose-200 bg-rose-50 text-rose-900',
  gray: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

export function FinanceWhatsAppReminders({
  state,
  onPreferencesChange,
  onMonitorStatusChange,
}: Props) {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const readiness = whatsappAutomationReadiness(reminder);
  const { monthKey } = getArgentinaDateParts();
  const [busy, setBusy] = useState<
    'investment' | 'market' | 'both' | 'monitor-check' | 'monitor-send' | null
  >(null);

  const nudge = useMemo(
    () => evaluateInvestmentWhatsAppNudge(state, monthKey),
    [state, monthKey],
  );

  const monitor = state.monitorStatus;
  const tone = monitorTone(monitor);
  const monitorActive = Boolean(reminder.marketWhatsAppEnabled);

  const patchReminder = (partial: Partial<typeof reminder>) => {
    onPreferencesChange({
      ...prefs,
      reminder: { ...reminder, ...partial },
    });
  };

  const loadMarketAlertsForTest = async () => {
    const holdings = state.portfolioHoldings ?? [];
    const tickers = getTrackedTickersFromPortfolio(state.entries, holdings);
    if (tickers.length === 0) return [];
    const result = await fetchFinancePrices(tickers);
    return buildMarketAlerts({
      entries: state.entries,
      prices: result.prices,
      holdings,
    }).filter((a) => a.kind !== 'neutral');
  };

  const runTest = async (kind: 'investment' | 'market' | 'both') => {
    setBusy(kind);
    try {
      const job = async () => {
        if (kind === 'investment') return requestInvestmentWhatsAppTest(state);
        if (kind === 'market') {
          const alerts = await loadMarketAlertsForTest();
          return requestMarketWhatsAppTest(alerts);
        }
        const alerts = await loadMarketAlertsForTest();
        return requestCombinedWhatsAppTest(state, alerts);
      };
      await sileo.promise(job(), {
        loading: { title: 'Enviando WhatsApp…' },
        success: (result) => ({
          title: result.ok ? 'WhatsApp enviado' : 'No se pudo enviar',
          description: result.message,
        }),
        error: {
          title: 'Error de WhatsApp',
          description: 'No se pudo completar el envío.',
        },
      });
    } finally {
      setBusy(null);
    }
  };

  const runMonitor = async (mode: 'check' | 'send') => {
    setBusy(mode === 'check' ? 'monitor-check' : 'monitor-send');
    try {
      await sileo.promise(
        requestMarketMonitorProbe({
          mode,
          ignoreMarketHours: true,
        }).then((result) => {
          if (result.checkedAt && onMonitorStatusChange) {
            const patch: FinanceMonitorStatus = {
              lastRunAt: result.checkedAt,
              lastSymbolsRequested: result.symbolsRequested,
              lastSymbolsResolved: result.symbolsResolved,
              lastAlertsDetected: result.alertsDetected,
              lastAlertsSent: result.alertsSent ?? 0,
              lastDurationMs: result.durationMs,
              lastSkipReason: result.skipReason,
            };
            if (result.ok && !result.errorCode) {
              patch.lastSuccessfulRunAt = result.checkedAt;
            } else if (result.errorCode) {
              patch.lastErrorAt = result.checkedAt;
              patch.lastErrorCode = result.errorCode;
            }
            onMonitorStatusChange(patch);
          }
          return result;
        }),
        {
          loading: {
            title: mode === 'check' ? 'Comprobando monitor…' : 'Ejecutando monitor…',
          },
          success: (result) => ({
            title: result.ok
              ? mode === 'check'
                ? 'Comprobación lista'
                : 'Monitor ejecutado'
              : 'Monitor con incidencias',
            description: result.message,
          }),
          error: {
            title: 'Error del monitor',
            description: 'No se pudo ejecutar la prueba.',
          },
        },
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold leading-relaxed text-slate-600">
        Avisos a {site.social.whatsappPhoneDigits}: el cron (~11:00 AR) cubre el día si no abrís la
        app. El monitor automático (GitHub Actions ~15 min) revisa precios fuera de la app. Las
        alertas de mercado también se mandan al abrir o actualizar precios (misma anti-spam).
      </p>

      <div className={`rounded-xl border px-3 py-3 ${TONE_CLASS[tone]}`}>
        <p className="finance-label">Monitor automático</p>
        <p className="mt-1 text-sm font-bold">
          {monitorActive ? 'Activo (si Actions está configurado)' : 'Inactivo (alertas de mercado off)'}
        </p>
        <ul className="mt-2 space-y-1 text-xs font-semibold">
          <li>Última revisión: {formatMonitorWhen(monitor?.lastRunAt)}</li>
          <li>Última exitosa: {formatMonitorWhen(monitor?.lastSuccessfulRunAt)}</li>
          <li>
            Activos revisados:{' '}
            {typeof monitor?.lastSymbolsResolved === 'number'
              ? `${monitor.lastSymbolsResolved}/${monitor.lastSymbolsRequested ?? '—'}`
              : '—'}
          </li>
          <li>
            Alertas enviadas (última):{' '}
            {typeof monitor?.lastAlertsSent === 'number' ? monitor.lastAlertsSent : '—'}
          </li>
          <li>Próxima revisión aprox.: {approximateNextMonitorHint()}</li>
          {monitor?.lastErrorCode ? (
            <li className="text-rose-700">Último error: {monitor.lastErrorCode}</li>
          ) : null}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runMonitor('check')}
            className="finance-secondary-button min-h-[44px] flex-1 text-sm disabled:opacity-50"
          >
            {busy === 'monitor-check' ? 'Comprobando…' : 'Probar monitor (solo comprobar)'}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !readiness.apiKeyOk}
            onClick={() => void runMonitor('send')}
            className="finance-secondary-button min-h-[44px] flex-1 text-sm disabled:opacity-50"
          >
            {busy === 'monitor-send' ? 'Enviando…' : 'Comprobar y enviar novedades'}
          </button>
        </div>
        <p className="mt-2 text-[10px] opacity-80">
          El modo seguro no manda WhatsApp. La hora exacta puede demorar: Actions no garantiza el
          minuto.
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(e) => patchReminder({ enabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300 text-blue-600"
        />
        <span className="text-sm font-bold text-slate-900">Recordatorio de inversión</span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={Boolean(reminder.marketWhatsAppEnabled)}
          onChange={(e) => patchReminder({ marketWhatsAppEnabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300 text-blue-600"
        />
        <span className="text-sm font-bold text-slate-900">Alertas de mercado</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="finance-label">API key CallMeBot (una sola vez)</span>
        <input
          type="password"
          autoComplete="off"
          placeholder="Pegá acá la key que te mandó el bot"
          className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
          value={reminder.callMeBotApiKey ?? ''}
          onChange={(e) => patchReminder({ callMeBotApiKey: e.target.value.trim() })}
        />
        <span className="text-[10px] text-slate-500">
          Se guarda con tu sync a la nube. No hace falta variable en Vercel.
        </span>
      </label>

      {reminder.enabled ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="finance-label text-emerald-600">Qué vería el cron ahora</p>
          {nudge.shouldNotify ? (
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-emerald-800">
              {nudge.message}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
              Sin aviso automático: el volumen del mes alcanza. Podés mandar una prueba igual con los
              botones de abajo.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="finance-label">Probar ahora (no espera al cron)</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={Boolean(busy) || !readiness.apiKeyOk}
            onClick={() => void runTest('investment')}
            className="finance-secondary-button min-h-[44px] flex-1 text-sm disabled:opacity-50"
          >
            {busy === 'investment' ? 'Enviando…' : 'Probar inversión'}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !readiness.apiKeyOk}
            onClick={() => void runTest('market')}
            className="finance-secondary-button min-h-[44px] flex-1 text-sm disabled:opacity-50"
          >
            {busy === 'market' ? 'Enviando…' : 'Probar mercado'}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !readiness.apiKeyOk}
            onClick={() => void runTest('both')}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl bg-[#25D366] px-4 text-sm font-black text-white shadow-md disabled:opacity-50"
          >
            {busy === 'both' ? 'Enviando…' : 'Probar los dos'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          El pedido vuelve en segundos. La entrega de CallMeBot gratis a veces tarda varios minutos;
          no spamées pruebas seguidas (hace peor la cola).
        </p>
      </div>

      <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600">
        <li className="text-emerald-700">Número fijo: {site.social.whatsappPhoneDigits}</li>
        <li className={readiness.apiKeyOk ? 'text-emerald-700' : 'text-amber-700'}>
          {readiness.apiKeyOk ? 'CallMeBot key guardada' : 'Falta pegar la API key arriba'}
        </li>
        <li className={readiness.anyJobEnabled ? 'text-emerald-700' : 'text-amber-700'}>
          {readiness.anyJobEnabled
            ? 'Al menos un aviso automático activado'
            : 'Activá inversión y/o mercado'}
        </li>
        <li className={readiness.ready ? 'text-emerald-700' : 'text-slate-500'}>
          {readiness.ready
            ? 'Listo: cron (~11:00 AR) + monitor ~15 min + alertas al actualizar precios'
            : 'Completá key + un aviso activado'}
        </li>
      </ul>

      <p className="text-[10px] leading-relaxed text-slate-500">
        CallMeBot:{' '}
        <a
          href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
          className="text-blue-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          callmebot.com
        </a>
        . Pegá la key solo en esta pantalla (no en el chat ni en GitHub).
      </p>
    </div>
  );
}
