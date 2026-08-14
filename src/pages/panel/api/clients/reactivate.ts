export const prerender = false;

import type { APIRoute } from 'astro';
import { panelJson, requirePanelApi, writeStatus } from '@/lib/panel/api';
import { reactivateClient } from '@/lib/panel/repositories/clientsWrite';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelApi(cookies);
  if (!access.ok) {
    return panelJson(
      { ok: false, error: access.message },
      access.reason === 'unauthenticated' ? 401 : 503,
    );
  }
  let payload: { id?: string };
  try {
    payload = (await request.json()) as { id?: string };
  } catch {
    return panelJson({ ok: false, error: 'JSON inválido.' }, 400);
  }
  const result = await reactivateClient(access.supabase, String(payload.id ?? ''));
  if (!result.ok) {
    return panelJson({ ok: false, error: result.error, code: result.code }, writeStatus(result.code));
  }
  return panelJson({ ok: true, client: result.data });
};
