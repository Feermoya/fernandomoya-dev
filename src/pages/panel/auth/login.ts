export const prerender = false;

import type { APIRoute } from 'astro';
import {
  createPanelSessionToken,
  isPanelAuthConfigured,
  PANEL_PATHS,
  PANEL_SESSION_COOKIE,
  panelSessionCookieOptions,
  safePostLoginPath,
  verifyPanelPin,
} from '@/lib/panel/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  if (!isPanelAuthConfigured()) {
    return redirect(`${PANEL_PATHS.login}?error=config`);
  }

  const form = await request.formData();
  const pin = String(form.get('pin') ?? '');
  const next = safePostLoginPath(String(form.get('next') ?? ''));

  if (!verifyPanelPin(pin)) {
    const err = next
      ? `${PANEL_PATHS.login}?error=pin&next=${encodeURIComponent(next)}`
      : `${PANEL_PATHS.login}?error=pin`;
    return redirect(err);
  }

  const secure = url.protocol === 'https:';
  cookies.set(PANEL_SESSION_COOKIE, createPanelSessionToken(), panelSessionCookieOptions(secure));

  return redirect(next ?? PANEL_PATHS.root);
};
