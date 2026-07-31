/**
 * Estado de ejecución del monitor automático (sin secretos ni stacks).
 */

export type FinanceMonitorStatus = {
  lastRunAt?: string;
  lastSuccessfulRunAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
  lastSymbolsRequested?: number;
  lastSymbolsResolved?: number;
  lastAlertsDetected?: number;
  lastAlertsSent?: number;
  lastDurationMs?: number;
  lastSkipReason?: string;
};

export function normalizeMonitorStatus(raw: unknown): FinanceMonitorStatus {
  if (typeof raw !== 'object' || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const out: FinanceMonitorStatus = {};
  if (typeof o.lastRunAt === 'string') out.lastRunAt = o.lastRunAt;
  if (typeof o.lastSuccessfulRunAt === 'string') out.lastSuccessfulRunAt = o.lastSuccessfulRunAt;
  if (typeof o.lastErrorAt === 'string') out.lastErrorAt = o.lastErrorAt;
  if (typeof o.lastErrorCode === 'string') out.lastErrorCode = o.lastErrorCode.slice(0, 80);
  if (typeof o.lastSymbolsRequested === 'number' && Number.isFinite(o.lastSymbolsRequested)) {
    out.lastSymbolsRequested = o.lastSymbolsRequested;
  }
  if (typeof o.lastSymbolsResolved === 'number' && Number.isFinite(o.lastSymbolsResolved)) {
    out.lastSymbolsResolved = o.lastSymbolsResolved;
  }
  if (typeof o.lastAlertsDetected === 'number' && Number.isFinite(o.lastAlertsDetected)) {
    out.lastAlertsDetected = o.lastAlertsDetected;
  }
  if (typeof o.lastAlertsSent === 'number' && Number.isFinite(o.lastAlertsSent)) {
    out.lastAlertsSent = o.lastAlertsSent;
  }
  if (typeof o.lastDurationMs === 'number' && Number.isFinite(o.lastDurationMs)) {
    out.lastDurationMs = o.lastDurationMs;
  }
  if (typeof o.lastSkipReason === 'string') out.lastSkipReason = o.lastSkipReason.slice(0, 80);
  return out;
}
