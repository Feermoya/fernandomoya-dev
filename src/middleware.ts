import { defineMiddleware } from 'astro:middleware';
import {
  isPanelAuthConfigured,
  isPanelPublicAuthPath,
  isSessionProtectedPath,
  panelLoginUrl,
  PANEL_PATHS,
  PANEL_SESSION_COOKIE,
  safePostLoginPath,
  verifyPanelSessionToken,
} from '@/lib/panel/auth';

/**
 * Protege `/panel/*`, `/foco-financiero` y `/admin` con la misma cookie/PIN.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!isSessionProtectedPath(pathname)) {
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
    const nextPath = `${pathname}${context.url.search || ''}`;
    return context.redirect(panelLoginUrl(nextPath));
  }

  // Ya autenticado: login → destino (next) o panel
  if (pathname === PANEL_PATHS.login) {
    const dest =
      safePostLoginPath(context.url.searchParams.get('next')) ?? PANEL_PATHS.root;
    return context.redirect(dest);
  }

  return next();
});
