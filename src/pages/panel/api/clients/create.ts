export const prerender = false;

import type { APIRoute } from 'astro';
import { panelJson, requirePanelApi, writeStatus } from '@/lib/panel/api';
import { createClient } from '@/lib/panel/repositories/clientsWrite';
import type { CreateClientInput } from '@/lib/panel/clients/validate';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelApi(cookies);
  if (!access.ok) {
    return panelJson({ ok: false, error: access.message }, access.reason === 'unauthenticated' ? 401 : 503);
  }
  let payload: CreateClientInput;
  try {
    payload = (await request.json()) as CreateClientInput;
  } catch {
    return panelJson({ ok: false, error: 'JSON inválido.' }, 400);
  }
  const result = await createClient(access.supabase, payload);
  if (!result.ok) return panelJson({ ok: false, error: result.error, code: result.code }, writeStatus(result.code));
  return panelJson({ ok: true, client: result.data });
};
