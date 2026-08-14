export const prerender = false;

import type { APIRoute } from 'astro';
import { requirePanelDataAccess } from '@/lib/panel/session';
import { registerPaymentForCharge } from '@/lib/panel/repositories/payments';
import type { RegisterPaymentFormInput } from '@/lib/panel/payments/register';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = requirePanelDataAccess(cookies);
  if (!access.ok) {
    const status = access.reason === 'unauthenticated' ? 401 : 503;
    return json({ ok: false, error: access.message }, status);
  }

  let payload: RegisterPaymentFormInput;
  try {
    payload = (await request.json()) as RegisterPaymentFormInput;
  } catch {
    return json({ ok: false, error: 'JSON inválido.' }, 400);
  }

  const result = await registerPaymentForCharge(access.supabase, payload);
  if (!result.ok) {
    const status =
      result.code === 'not_found'
        ? 404
        : result.code === 'already_paid'
          ? 409
          : result.code === 'validation'
            ? 400
            : 500;
    return json({ ok: false, error: result.error, code: result.code }, status);
  }

  return json({ ok: true, payment: result.payment });
};
