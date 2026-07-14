/**
 * Proxy same-origin → Supabase para Foco financiero.
 * El navegador NO habla con *.supabase.co (evita DNS/adblock/CORS).
 *
 * GET  /api/finance-cloud?id=...
 * POST /api/finance-cloud  { id, state }
 */

const TABLE = 'finance_game_state';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function supabaseConfig() {
  const url = (process.env.PUBLIC_FINANCE_SUPABASE_URL || process.env.FINANCE_SUPABASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  const key = (
    process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY ||
    process.env.FINANCE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  return { url, key };
}

function restHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };
}

function selectUrl(base, syncId) {
  const quoted = encodeURIComponent(`"${syncId}"`);
  return `${base}/rest/v1/${TABLE}?id=in.(${quoted})&select=body,updated_at&limit=1`;
}

async function readBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  // Algunos runtimes no parsean el body solos.
  if (typeof req.on === 'function') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
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

export default async function handler(req, res) {
  try {
    const { url, key } = supabaseConfig();
    if (!url || !key) {
      return json(res, 503, {
        ok: false,
        error: 'Supabase no configurado en el hosting.',
      });
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const syncId =
        (typeof req.query?.id === 'string' && req.query.id.trim()) ||
        'fernando-foco-financiero-main';

      const upstream = await fetch(selectUrl(url, syncId), {
        method: 'GET',
        headers: restHeaders(key),
        cache: 'no-store',
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(res, 502, {
          ok: false,
          error: `Supabase lectura ${upstream.status}`,
          detail: text.slice(0, 200),
        });
      }

      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        return json(res, 502, { ok: false, error: 'Respuesta inválida de Supabase.' });
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        return json(res, 200, { ok: true, row: null });
      }

      return json(res, 200, {
        ok: true,
        row: {
          body: rows[0].body,
          updated_at: rows[0].updated_at,
        },
      });
    }

    if (req.method === 'POST') {
      const payload = await readBody(req);
      const syncId =
        typeof payload?.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : 'fernando-foco-financiero-main';
      if (!payload || typeof payload.state !== 'object' || payload.state === null) {
        return json(res, 400, { ok: false, error: 'Body inválido: se espera { id, state }.' });
      }

      const upstream = await fetch(`${url}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: {
          ...restHeaders(key),
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify([{ id: syncId, body: payload.state }]),
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

      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        return json(res, 200, { ok: true, updated_at: new Date().toISOString() });
      }

      return json(res, 200, {
        ok: true,
        updated_at: rows?.[0]?.updated_at || new Date().toISOString(),
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
