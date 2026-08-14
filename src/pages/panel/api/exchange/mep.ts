export const prerender = false;

import type { APIRoute } from 'astro';
import { requirePanelDataAccess } from '@/lib/panel/session';
import { getMepQuote, mepAgeMinutes } from '@/lib/panel/exchange/mep';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  });
}

/** GET /panel/api/exchange/mep — cotización MEP cacheada (sesión requerida). */
export const GET: APIRoute = async ({ cookies, url }) => {
  const access = requirePanelDataAccess(cookies);
  if (!access.ok) {
    const status = access.reason === 'unauthenticated' ? 401 : 503;
    return json({ ok: false, error: access.message }, status);
  }

  const force = url.searchParams.get('refresh') === '1';
  const result = await getMepQuote({ forceRefresh: force });
  if (!result.ok) {
    return json({ ok: false, error: result.error }, 502);
  }

  return json({
    ok: true,
    value: result.quote.value,
    updatedAt: result.quote.updatedAt,
    source: result.quote.source,
    fetchedAt: result.quote.fetchedAt,
    ageMinutes: mepAgeMinutes(result.quote),
    fromCache: result.fromCache,
  });
};
