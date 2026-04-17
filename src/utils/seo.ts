import { site } from '@/data/site';

export function pageTitle(segment?: string) {
  if (!segment) return site.title;
  return `${segment} · ${site.name}`;
}

export function absoluteUrl(pathname: string) {
  /** Alineado con `site` de `astro.config.mjs` (Vercel: VERCEL_URL / PUBLIC_SITE_URL). */
  const base = String(import.meta.env.SITE || site.url).replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
