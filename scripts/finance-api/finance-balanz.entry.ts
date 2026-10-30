import { PANEL_SESSION_COOKIE, verifyPanelSessionToken } from '../../src/lib/panel/auth';
import { financeGameStateSelectUrl } from '../../src/lib/finance/postgrest';
import { buildBalanzImportBatch } from '../../src/lib/finance/importers/balanz/importBatch';

const BOOK = 'fernando-foco-financiero-main';

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (...args: unknown[]) => unknown;
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

export default async function handler(req: Req, res: Res) {
  const send = (code: number, data: unknown) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(code).json(data);
  };

  try {
    const cookies = headerValue(req.headers, 'cookie').split(';').map((s) => s.trim());
    const token = cookies
      .find((s) => s.startsWith(`${PANEL_SESSION_COOKIE}=`))
      ?.slice(PANEL_SESSION_COOKIE.length + 1);
    if (!verifyPanelSessionToken(token)) {
      return send(401, { ok: false, error: 'Ingresá al panel para importar.' });
    }
    if (req.method !== 'POST') {
      return send(405, { ok: false, error: 'Método no permitido.' });
    }
    if (headerValue(req.headers, 'sec-fetch-site') === 'cross-site') {
      return send(403, { ok: false, error: 'Origen no permitido.' });
    }
    if (process.env.FINANCE_BALANZ_IMPORT_ENABLED !== 'true') {
      return send(503, {
        ok: false,
        error: 'Importación pendiente de verificación del respaldo y habilitación.',
      });
    }

    const payload = (await readBody(req)) as {
      expectedUpdatedAt?: string;
      operations?: unknown;
      selections?: unknown;
    } | null;
    if (
      !payload ||
      typeof payload.expectedUpdatedAt !== 'string' ||
      JSON.stringify(payload).length > 800000
    ) {
      return send(400, { ok: false, error: 'Lote o versión inválidos.' });
    }

    const url = (
      process.env.FINANCE_SUPABASE_URL ||
      process.env.PUBLIC_FINANCE_SUPABASE_URL ||
      ''
    ).replace(/\/$/, '');
    const key =
      process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.FINANCE_SUPABASE_ANON_KEY ||
      process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return send(503, { ok: false, error: 'Supabase no configurado.' });
    }

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
    const readUrl = financeGameStateSelectUrl(`${url}/rest/v1`, BOOK);
    const response = await fetch(readUrl, { headers, cache: 'no-store' });
    if (!response.ok) {
      return send(502, { ok: false, error: 'No se pudo consultar Supabase.' });
    }

    const rows = (await response.json()) as Array<{ body?: { entries?: unknown }; updated_at?: string }> | null;
    const row = rows?.[0];
    if (!row || !Array.isArray(row.body?.entries) || typeof row.updated_at !== 'string') {
      return send(409, {
        ok: false,
        error: 'Historial remoto ausente o inválido. No se escribió nada.',
      });
    }
    if (row.updated_at !== payload.expectedUpdatedAt) {
      return send(409, {
        ok: false,
        error: 'El historial cambió. Actualizá la revisión antes de importar.',
      });
    }

    let batch;
    try {
      batch = buildBalanzImportBatch(
        row.body as Parameters<typeof buildBalanzImportBatch>[0],
        payload.operations as Parameters<typeof buildBalanzImportBatch>[1],
        payload.selections as Parameters<typeof buildBalanzImportBatch>[2],
        new Date().toISOString(),
      );
    } catch (e) {
      return send(400, {
        ok: false,
        error: e instanceof Error ? e.message : 'Lote inválido.',
      });
    }

    if (!batch.added.length) {
      return send(200, { ok: true, row, added: [], omitted: batch.omitted });
    }

    const patchUrl = `${readUrl.replace('&limit=1', '')}&updated_at=eq.${encodeURIComponent(row.updated_at)}`;
    const saved = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ body: batch.state }),
    });
    if (!saved.ok) {
      return send(502, {
        ok: false,
        error: 'Supabase rechazó el guardado. No se confirmó la importación.',
      });
    }
    const written = (await saved.json()) as unknown[];
    if (!written?.length) {
      return send(409, {
        ok: false,
        error: 'Otra escritura cambió el historial. Volvé a revisar.',
      });
    }
    return send(200, {
      ok: true,
      row: written[0],
      added: batch.added,
      omitted: batch.omitted,
    });
  } catch (e) {
    console.error('[finance-balanz]', e);
    return send(500, {
      ok: false,
      error: 'No se pudo completar la importación. Consultá el historial antes de reintentar.',
    });
  }
}
