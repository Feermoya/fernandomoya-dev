export const prerender = false;

import type { APIRoute } from 'astro';
import {
  createPanelSessionToken,
  isPanelAuthConfigured,
  PANEL_PATHS,
  PANEL_SESSION_COOKIE,
  panelSessionCookieOptions,
  verifyPanelPin,
} from '@/lib/panel/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  if (!isPanelAuthConfigured()) {
    return redirect(`${PANEL_PATHS.login}?error=config`);
  }

  const form = await request.formData();
  const pin = String(form.get('pin') ?? '');

  if (!verifyPanelPin(pin)) {
    return redirect(`${PANEL_PATHS.login}?error=pin`);
  }

  const secure = url.protocol === 'https:';
  cookies.set(PANEL_SESSION_COOKIE, createPanelSessionToken(), panelSessionCookieOptions(secure));

  return redirect(PANEL_PATHS.root);
};
