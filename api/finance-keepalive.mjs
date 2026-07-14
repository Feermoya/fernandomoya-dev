/**
 * Keep-alive de Supabase para Foco financiero (plan Free).
 * - Lo llama Vercel Cron cada día (sin tocar GitHub).
 * - También al abrir/recargar /foco-financiero la app hace ping directo.
 *
 * Usa las mismas env que ya tiene el sitio en Vercel:
 * PUBLIC_FINANCE_SUPABASE_URL + PUBLIC_FINANCE_SUPABASE_ANON_KEY
 */

const SYNC_ID = 'fernando-foco-financiero-main';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const url = (process.env.PUBLIC_FINANCE_SUPABASE_URL || process.env.FINANCE_SUPABASE_URL || '')
      .trim()
      .replace(/\/$/, '');
    const key = (
      process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY ||
      process.env.FINANCE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!url || !key) {
      return json(res, 503, {
        ok: false,
        error: 'Supabase no configurado en el hosting (PUBLIC_FINANCE_SUPABASE_URL / ANON_KEY).',
      });
    }

    const quoted = encodeURIComponent(`"${SYNC_ID}"`);
    const restUrl = `${url}/rest/v1/finance_game_state?id=in.(${quoted})&select=id,updated_at&limit=1`;

    const upstream = await fetch(restUrl, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return json(res, 502, {
        ok: false,
        error: `Supabase respondió ${upstream.status}`,
        detail: text.slice(0, 200),
      });
    }

    let rows = 0;
    try {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      rows = 0;
    }

    return json(res, 200, {
      ok: true,
      pingedAt: new Date().toISOString(),
      rows,
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : 'Error interno',
    });
  }
}
