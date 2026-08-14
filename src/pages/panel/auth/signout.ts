export const prerender = false;

import type { APIRoute } from 'astro';
import { PANEL_PATHS, PANEL_SESSION_COOKIE, panelSessionCookieOptions } from '@/lib/panel/auth';

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const secure = url.protocol === 'https:';
  cookies.delete(PANEL_SESSION_COOKIE, panelSessionCookieOptions(secure));
  return redirect(PANEL_PATHS.login);
};

export const POST: APIRoute = async ({ cookies, redirect, url }) => {
  const secure = url.protocol === 'https:';
  cookies.delete(PANEL_SESSION_COOKIE, panelSessionCookieOptions(secure));
  return redirect(PANEL_PATHS.login);
};
