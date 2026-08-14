import type { AstroCookies } from 'astro';
import { requirePanelDataAccess } from '@/lib/panel/session';

export function panelJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function requirePanelApi(cookies: AstroCookies) {
  return requirePanelDataAccess(cookies);
}

export function writeStatus(code?: string): number {
  if (code === 'not_found') return 404;
  if (code === 'validation') return 400;
  if (code === 'already_paid') return 409;
  return 500;
}
