export const prerender = false;

import type { APIRoute } from 'astro';
import { panelJson, requirePanelApi, writeStatus } from '@/lib/panel/api';
import { updateService } from '@/lib/panel/repositories/servicesWrite';
import type { UpdateServiceInput } from '@/lib/panel/services/validate';

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelApi(cookies);
  if (!access.ok) {
    return panelJson({ ok: false, error: access.message }, access.reason === 'unauthenticated' ? 401 : 503);
  }
  let payload: UpdateServiceInput;
  try {
    payload = (await request.json()) as UpdateServiceInput;
  } catch {
    return panelJson({ ok: false, error: 'JSON inválido.' }, 400);
  }
  const result = await updateService(access.supabase, payload);
  if (!result.ok) return panelJson({ ok: false, error: result.error, code: result.code }, writeStatus(result.code));
  return panelJson({ ok: true, service: result.data });
};
