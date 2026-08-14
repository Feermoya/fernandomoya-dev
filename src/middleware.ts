import { defineMiddleware } from 'astro:middleware';
import {
  isPanelAuthConfigured,
  isPanelPath,
  isPanelPublicAuthPath,
  PANEL_PATHS,
  PANEL_SESSION_COOKIE,
  verifyPanelSessionToken,
} from '@/lib/panel/auth';

/**
 * Protege `/panel/*` en el servidor con cookie firmada.
 * No interviene en portfolio ni en `/foco-financiero`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!isPanelPath(pathname)) {
    return next();
  }

  const isPublic = isPanelPublicAuthPath(pathname);

  if (!isPanelAuthConfigured()) {
    if (pathname === PANEL_PATHS.login || pathname === PANEL_PATHS.loginAction) {
      return next();
    }
    return context.redirect(`${PANEL_PATHS.login}?error=config`);
  }

  const token = context.cookies.get(PANEL_SESSION_COOKIE)?.value;
  const hasSession = verifyPanelSessionToken(token);

  if (!hasSession) {
    if (isPublic) return next();
    return context.redirect(PANEL_PATHS.login);
  }

  // Ya autenticado: login → panel
  if (pathname === PANEL_PATHS.login) {
    return context.redirect(PANEL_PATHS.root);
  }

  return next();
});
