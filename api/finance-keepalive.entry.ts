import { DEFAULT_FINANCE_SYNC_ID } from '../src/lib/finance/storage';
import { pingFinanceRemote } from '../src/lib/finance/remoteFinanceState';
import {
  runFinanceWhatsAppJobs,
  type WhatsAppJobKind,
} from '../src/lib/finance/whatsappJobs';

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
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

function queryValue(req: Req, name: string): string {
  const fromQuery = req.query?.[name];
  if (typeof fromQuery === 'string') return fromQuery;
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === 'string') return fromQuery[0];
  if (typeof req.url === 'string') {
    try {
      const u = new URL(req.url, 'http://localhost');
      return u.searchParams.get(name) ?? '';
    } catch {
      return '';
    }
  }
  return '';
}

function isVercelCron(req: Req): boolean {
  return headerValue(req.headers, 'x-vercel-cron') === '1';
}

function parseWhatsAppKind(raw: string): WhatsAppJobKind {
  if (raw === 'investment' || raw === 'market') return raw;
  return 'both';
}

function json(res: Res, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

/**
 * Keep-alive Supabase + WhatsApp (cron Vercel o prueba desde la app).
 *
 * Cron: header x-vercel-cron: 1
 * Prueba UI: ?whatsapp=test&kind=market|investment|both
 */
export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const pingedAt = new Date().toISOString();
    const ping = await pingFinanceRemote(DEFAULT_FINANCE_SYNC_ID);

    if (!ping.ok) {
      return json(res, 503, {
        ok: false,
        pingedAt,
        ping,
      });
    }

    const cron = isVercelCron(req);
    const isTest = queryValue(req, 'whatsapp') === 'test';

    if (!cron && !isTest) {
      return json(res, 200, {
        ok: true,
        pingedAt,
        ping: { rows: ping.rows },
        whatsapp: { ran: false, reason: 'not_cron' },
      });
    }

    const kind = parseWhatsAppKind(queryValue(req, 'kind'));
    const whatsapp = await runFinanceWhatsAppJobs(DEFAULT_FINANCE_SYNC_ID, {
      force: isTest,
      persist: !isTest,
      only: isTest ? kind : 'both',
    });

    return json(res, 200, {
      ok: ping.ok && whatsapp.ok,
      pingedAt,
      ping: { rows: ping.rows },
      whatsapp: { ran: true, mode: isTest ? 'test' : 'cron', kind, ...whatsapp },
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
