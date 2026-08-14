export const prerender = false;

import type { APIRoute } from 'astro';
import { panelJson, requirePanelApi, writeStatus } from '@/lib/panel/api';
import { deactivateClient } from '@/lib/panel/repositories/clientsWrite';
import type { DeactivateClientInput } from '@/lib/panel/clients/validate';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelApi(cookies);
  if (!access.ok) {
    return panelJson({ ok: false, error: access.message }, access.reason === 'unauthenticated' ? 401 : 503);
  }
  let payload: DeactivateClientInput;
  try {
    payload = (await request.json()) as DeactivateClientInput;
  } catch {
    return panelJson({ ok: false, error: 'JSON inválido.' }, 400);
  }
  const result = await deactivateClient(access.supabase, payload);
  if (!result.ok) return panelJson({ ok: false, error: result.error, code: result.code }, writeStatus(result.code));
  return panelJson({ ok: true, client: result.data });
};
