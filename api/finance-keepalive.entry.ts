import { DEFAULT_FINANCE_SYNC_ID } from '../src/lib/finance/storage';
import { pingFinanceRemote } from '../src/lib/finance/remoteFinanceState';
import { runFinanceWhatsAppJobs } from '../src/lib/finance/whatsappJobs';

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => { json: (body: unknown) => unknown };
  setHeader: (key: string, value: string) => void;
};

function headerValue(
  headers: Req['headers'],
  name: string,
): string {
  if (!headers) return '';
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? '';
  return typeof raw === 'string' ? raw : '';
}

function isVercelCron(req: Req): boolean {
  return headerValue(req.headers, 'x-vercel-cron') === '1';
}

function json(res: Res, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

/**
 * Keep-alive Supabase + (solo en cron Vercel) jobs de WhatsApp.
 * Un único cron Hobby apunta aquí — no agregar otro path en vercel.json.
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
    if (!cron) {
      return json(res, 200, {
        ok: true,
        pingedAt,
        ping: { rows: ping.rows },
        whatsapp: { ran: false, reason: 'not_cron' },
      });
    }

    const whatsapp = await runFinanceWhatsAppJobs(DEFAULT_FINANCE_SYNC_ID);

    return json(res, 200, {
      ok: ping.ok && whatsapp.ok,
      pingedAt,
      ping: { rows: ping.rows },
      whatsapp: { ran: true, ...whatsapp },
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
