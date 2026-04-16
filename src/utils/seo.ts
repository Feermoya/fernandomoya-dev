import { site } from '@/data/site';

export function pageTitle(segment?: string) {
  if (!segment) return site.title;
  return `${segment} · ${site.name}`;
}

export function absoluteUrl(pathname: string) {
  const base = site.url.replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
