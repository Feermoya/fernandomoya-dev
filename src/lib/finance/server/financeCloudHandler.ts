/**
 * Proxy de Foco. El id del libro lo resuelve resolveFinanceIdentity.
 * Un id enviado por el navegador se ignora.
 */

import { financeGameStateSelectUrl } from '@/lib/finance/postgrest';
import {
  financeServiceConfig,
  readRequestHeader,
  resolveFinanceIdentity,
  serviceRoleHeaders,
} from '@/lib/finance/server/financeIdentity';

type HeaderBag = Record<string, string | string[] | undefined>;

type Req = {
  method?: string;
  headers?: HeaderBag;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (...args: unknown[]) => unknown;
};

type Res = {
  status: (code: number) => { json: (body: unknown) => unknown };
  setHeader: (key: string, value: string) => void;
};

function json(res: Res, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  return res.status(status).json(body);
}

async function readBody(req: Req): Promise<unknown> {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  if (typeof req.on === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function stateUrl(restBase: string, stateId: string): string {
  return financeGameStateSelectUrl(restBase, stateId);
}

export default async function handler(req: Req, res: Res) {
  try {
    const access = await resolveFinanceIdentity(readRequestHeader(req.headers, 'authorization'));
    if (!access.ok) {
      return json(res, access.status, { ok: false, error: access.error, code: access.code });
    }

    const config = financeServiceConfig();
    if (!config) {
      return json(res, 503, { ok: false, error: 'Supabase no está configurado en el servidor.' });
    }

    const readUrl = stateUrl(`${config.url}/rest/v1`, access.identity.stateId);
    const headers = serviceRoleHeaders(config.key);

    if (req.method === 'GET' || req.method === 'HEAD') {
      const upstream = await fetch(readUrl, { method: 'GET', headers, cache: 'no-store' });
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(res, 502, {
          ok: false,
          error: `Supabase lectura ${upstream.status}`,
          detail: text.slice(0, 200),
        });
      }
      let rows: { body?: unknown; updated_at?: string }[] = [];
      try {
        rows = JSON.parse(text) as { body?: unknown; updated_at?: string }[];
      } catch {
        return json(res, 502, { ok: false, error: 'Respuesta inválida de Supabase.' });
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return json(res, 409, {
          ok: false,
          code: 'book_missing',
          error: 'Esta cuenta no tiene un libro financiero.',
        });
      }
      return json(res, 200, {
        ok: true,
        row: { body: rows[0].body, updated_at: rows[0].updated_at },
      });
    }

    if (req.method === 'POST') {
      const payload = (await readBody(req)) as {
        state?: unknown;
        expectedUpdatedAt?: string;
      } | null;
      if (!payload || typeof payload.state !== 'object' || payload.state === null) {
        return json(res, 400, { ok: false, error: 'Body inválido: se espera { state }.' });
      }
      if (
        typeof payload.expectedUpdatedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T/.test(payload.expectedUpdatedAt)
      ) {
        return json(res, 409, {
          ok: false,
          error: 'Actualizá la aplicación y consultá el historial antes de guardar.',
        });
      }

      const patchUrl = `${readUrl.replace('&limit=1', '')}&updated_at=eq.${encodeURIComponent(payload.expectedUpdatedAt)}`;
      const upstream = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ body: payload.state }),
        cache: 'no-store',
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(res, 502, {
          ok: false,
          error: `Supabase guardado ${upstream.status}`,
          detail: text.slice(0, 200),
        });
      }
      let rows: { updated_at?: string }[] = [];
      try {
        rows = JSON.parse(text) as { updated_at?: string }[];
      } catch {
        return json(res, 502, { ok: false, error: 'Guardado sin confirmación válida de Supabase.' });
      }
      if (!rows?.length) {
        return json(res, 409, {
          ok: false,
          error: 'El historial cambió en otro dispositivo. Recargá antes de guardar.',
        });
      }
      return json(res, 200, {
        ok: true,
        updated_at: rows[0]?.updated_at || new Date().toISOString(),
      });
    }

    return json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
