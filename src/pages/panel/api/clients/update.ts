export const prerender = false;

import type { APIRoute } from 'astro';
import { panelJson, requirePanelApi, writeStatus } from '@/lib/panel/api';
import { updateClient } from '@/lib/panel/repositories/clientsWrite';
import type { UpdateClientInput } from '@/lib/panel/clients/validate';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelApi(cookies);
  if (!access.ok) {
    return panelJson({ ok: false, error: access.message }, access.reason === 'unauthenticated' ? 401 : 503);
  }
  let payload: UpdateClientInput;
  try {
    payload = (await request.json()) as UpdateClientInput;
  } catch {
    return panelJson({ ok: false, error: 'JSON inválido.' }, 400);
  }
  const result = await updateClient(access.supabase, payload);
  if (!result.ok) return panelJson({ ok: false, error: result.error, code: result.code }, writeStatus(result.code));
  return panelJson({ ok: true, client: result.data });
};
