import { sendCallMeBotWhatsAppServer } from '../src/lib/finance/callMeBotServer';
import { normalizePreferences } from '../src/lib/finance/preferences';
import {
  fetchFinanceStateRemote,
  isFinanceRemoteConfigured,
  resolveWhatsAppPhone,
} from '../src/lib/finance/remoteFinanceState';
import { DEFAULT_FINANCE_SYNC_ID } from '../src/lib/finance/storage';
import type { FinanceReminderSettings } from '../src/lib/finance/types';

type Req = {
  method?: string;
  body?: unknown;
  on?: (event: string, cb: (chunk: Buffer) => void) => void;
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

function resolveApiKey(reminder?: FinanceReminderSettings): string {
  return (
    reminder?.callMeBotApiKey?.trim() ||
    process.env.CALLMEBOT_API_KEY?.trim() ||
    process.env.FINANCE_CALLMEBOT_API_KEY?.trim() ||
    ''
  );
}

async function readBody(req: Req): Promise<{ text?: string; texts?: string[] } | null> {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body as { text?: string; texts?: string[] };
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as { text?: string; texts?: string[] };
    } catch {
      return null;
    }
  }
  if (typeof req.on === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { text?: string; texts?: string[] };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Envío rápido de textos ya formateados (botones de prueba).
 * No scrapea precios: solo CallMeBot + key del estado remoto.
 */
export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    if (!isFinanceRemoteConfigured()) {
      return json(res, 503, { ok: false, error: 'Supabase no configurado' });
    }

    const body = await readBody(req);
    const texts = [
      ...(typeof body?.text === 'string' && body.text.trim() ? [body.text.trim()] : []),
      ...(Array.isArray(body?.texts)
        ? body.texts.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        : []),
    ];

    if (texts.length === 0) {
      return json(res, 400, { ok: false, error: 'Falta text o texts' });
    }
    if (texts.length > 3) {
      return json(res, 400, { ok: false, error: 'Máximo 3 mensajes por pedido' });
    }

    const state = await fetchFinanceStateRemote(DEFAULT_FINANCE_SYNC_ID);
    if (!state) {
      return json(res, 404, { ok: false, error: 'Sin estado remoto' });
    }

    const reminder = normalizePreferences(state.preferences).reminder;
    const phone = resolveWhatsAppPhone();
    const apiKey = resolveApiKey(reminder);
    if (!phone || !apiKey) {
      return json(res, 400, {
        ok: false,
        error: 'Falta teléfono o API key CallMeBot en preferencias',
      });
    }

    const results: { ok: boolean; detail: string }[] = [];
    for (let i = 0; i < texts.length; i += 1) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      results.push(await sendCallMeBotWhatsAppServer(phone, texts[i], apiKey));
    }

    const ok = results.every((r) => r.ok);
    return json(res, 200, {
      ok,
      sent: results.filter((r) => r.ok).length,
      results,
      note: 'CallMeBot gratis puede demorar minutos en entregar aunque el pedido se acepte.',
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
