import {
  authorizeFinanceMonitor,
} from '../src/lib/finance/monitor/auth';
import {
  runFinanceMarketMonitor,
  type MarketMonitorMode,
} from '../src/lib/finance/monitor/runMarketMonitor';

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, cb: (chunk: Buffer) => void) => void;
  url?: string;
};

type Res = {
  status: (code: number) => { json: (body: unknown) => unknown };
  setHeader: (key: string, value: string) => void;
};

function headerValue(headers: Req['headers'], name: string): string {
  if (!headers) return '';
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? '';
  return typeof raw === 'string' ? raw : '';
}

function json(res: Res, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

type BodyShape = {
  mode?: string;
  source?: string;
  force?: boolean;
  ignoreMarketHours?: boolean;
};

async function readBody(req: Req): Promise<BodyShape> {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body as BodyShape;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as BodyShape;
    } catch {
      return {};
    }
  }
  if (typeof req.on === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    try {
      return JSON.parse(raw) as BodyShape;
    } catch {
      return {};
    }
  }
  return {};
}

function parseMode(raw: string | undefined): MarketMonitorMode {
  return raw === 'send' ? 'send' : 'check';
}

/**
 * POST /api/finance-market-monitor
 *
 * - GitHub Actions: Authorization: Bearer FINANCE_MONITOR_SECRET, mode send (default send from GH)
 * - UI: body { source: "ui", mode: "check" | "send" } sin Bearer (mismo trust que ?whatsapp=test)
 *
 * No acepta destinatarios arbitrarios. No devuelve secretos ni teléfono completo.
 */
export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = await readBody(req);
    const uiSource = body.source === 'ui';
    const auth = authorizeFinanceMonitor({
      authorizationHeader: headerValue(req.headers, 'authorization'),
      uiSource,
    });

    if (!auth.ok) {
      return json(res, auth.status, { ok: false, error: auth.error });
    }

    // Actions: por defecto envía novedades. UI: por defecto solo comprueba.
    const mode: MarketMonitorMode =
      auth.via === 'secret'
        ? parseMode(body.mode ?? 'send')
        : parseMode(body.mode ?? 'check');

    const summary = await runFinanceMarketMonitor({
      mode,
      force: Boolean(body.force) && auth.via === 'ui',
      ignoreMarketHours: Boolean(body.ignoreMarketHours) && auth.via === 'ui',
      persist: true,
    });

    const httpStatus =
      summary.errorCode === 'overlap'
        ? 409
        : summary.errorCode === 'supabase_not_configured' ||
            summary.errorCode === 'supabase_fetch_failed'
          ? 503
          : 200;

    return json(res, httpStatus, {
      ok: summary.ok,
      runId: summary.runId,
      checkedAt: summary.checkedAt,
      mode: summary.mode,
      via: auth.via,
      symbolsRequested: summary.symbolsRequested,
      symbolsResolved: summary.symbolsResolved,
      symbolsSkippedHours: summary.symbolsSkippedHours,
      alertsDetected: summary.alertsDetected,
      alertsSent: summary.alertsSent,
      alertsSkipped: summary.alertsSkipped,
      durationMs: summary.durationMs,
      wouldSend: summary.wouldSend,
      skipReason: summary.skipReason,
      errorCode: summary.errorCode,
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
