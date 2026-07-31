import type { MarketMonitorMode } from '@/lib/finance/monitor/runMarketMonitor';

export type MarketMonitorClientResult = {
  ok: boolean;
  message: string;
  runId?: string;
  alertsDetected?: number;
  alertsSent?: number;
  wouldSend?: number;
  skipReason?: string;
  errorCode?: string;
  checkedAt?: string;
  symbolsRequested?: number;
  symbolsResolved?: number;
  durationMs?: number;
};

/**
 * Prueba el monitor desde la UI (sin exponer FINANCE_MONITOR_SECRET).
 * Default mode=check (seguro).
 */
export async function requestMarketMonitorProbe(params: {
  mode?: MarketMonitorMode;
  ignoreMarketHours?: boolean;
}): Promise<MarketMonitorClientResult> {
  const mode = params.mode === 'send' ? 'send' : 'check';
  try {
    const res = await fetch('/api/finance-market-monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'ui',
        mode,
        ignoreMarketHours: Boolean(params.ignoreMarketHours),
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok && res.status !== 409) {
      return {
        ok: false,
        message:
          typeof data.error === 'string'
            ? data.error
            : typeof data.errorCode === 'string'
              ? data.errorCode
              : `HTTP ${res.status}`,
        errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
      };
    }

    const alertsDetected =
      typeof data.alertsDetected === 'number' ? data.alertsDetected : undefined;
    const alertsSent = typeof data.alertsSent === 'number' ? data.alertsSent : undefined;
    const wouldSend = typeof data.wouldSend === 'number' ? data.wouldSend : undefined;
    const skipReason = typeof data.skipReason === 'string' ? data.skipReason : undefined;

    const parts: string[] = [];
    if (mode === 'check') {
      parts.push(
        wouldSend != null
          ? `Novedades pendientes: ${wouldSend}`
          : `Alertas detectadas: ${alertsDetected ?? 0}`,
      );
    } else {
      parts.push(`Enviadas: ${alertsSent ?? 0}`);
    }
    if (skipReason) parts.push(`(${skipReason})`);

    return {
      ok: Boolean(data.ok),
      message: parts.join(' · '),
      runId: typeof data.runId === 'string' ? data.runId : undefined,
      alertsDetected,
      alertsSent,
      wouldSend,
      skipReason,
      errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
      checkedAt: typeof data.checkedAt === 'string' ? data.checkedAt : undefined,
      symbolsRequested:
        typeof data.symbolsRequested === 'number' ? data.symbolsRequested : undefined,
      symbolsResolved:
        typeof data.symbolsResolved === 'number' ? data.symbolsResolved : undefined,
      durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Error de red',
    };
  }
}
