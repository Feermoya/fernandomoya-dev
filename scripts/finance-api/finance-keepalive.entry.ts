import { DEFAULT_FINANCE_SYNC_ID } from '../../src/lib/finance/storage';
import { pingFinanceRemote } from '../../src/lib/finance/remoteFinanceState';

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

function json(res: Res, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

/**
 * Keep-alive de Supabase (cron Vercel).
 * Los avisos WhatsApp fueron retirados del producto.
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

    return json(res, 200, {
      ok: true,
      pingedAt,
      ping: { rows: ping.rows },
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
