/** Parser aislado para HTML de Google Finance (BCBA). */

export function buildGoogleFinanceUrl(ticker: string, exchange = 'BCBA'): string {
  const sym = ticker.trim().toUpperCase();
  return `https://www.google.com/finance/beta/quote/${encodeURIComponent(sym)}:${exchange}?hl=es`;
}

export function parseARSNumber(value: string): number | null {
  let cleaned = value.trim().replace(/\$/g, '').replace(/\s/g, '');
  if (!cleaned) return null;

  cleaned = cleaned.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/\./g, '');
  }

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) return null;
  return Math.round(n);
}

const ARS_EMBEDDED_RE = /"ARS",\[(\d+(?:\.\d+)?),/;

function parseFromEmbeddedJson(html: string): number | null {
  const m = html.match(ARS_EMBEDDED_RE);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) return null;
  return Math.round(n);
}

function parseFromAttributes(html: string): number | null {
  const attr = html.match(/data-last-price="([^"]+)"/i);
  if (attr?.[1]) {
    const n = parseARSNumber(attr[1]);
    if (n !== null) return n;
  }
  return null;
}

function parseFromVisibleAmounts(html: string): number | null {
  const matches = html.match(/\$\s*[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?/g);
  if (!matches?.length) return null;

  const parsed = matches
    .map((m) => parseARSNumber(m))
    .filter((n): n is number => n !== null && n >= 100 && n <= 50_000_000);

  if (parsed.length === 0) return null;
  return parsed[0];
}

export function parseGoogleFinancePrice(html: string): number | null {
  const embedded = parseFromEmbeddedJson(html);
  if (embedded !== null) return embedded;

  const attr = parseFromAttributes(html);
  if (attr !== null) return attr;

  return parseFromVisibleAmounts(html);
}

/** Best-effort: variación diaria desde HTML embebido de Google Finance. */
export function parseGoogleFinanceDailyChange(html: string): {
  changeValue?: number;
  changePercent?: number;
} {
  const pctMatch =
    html.match(/"changePercent"\s*:\s*(-?\d+(?:\.\d+)?)/i) ??
    html.match(/"percentChange"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (pctMatch?.[1]) {
    const changePercent = Number(pctMatch[1]);
    if (Number.isFinite(changePercent)) return { changePercent };
  }

  const absMatch = html.match(/"change"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (absMatch?.[1]) {
    const changeValue = Number(absMatch[1]);
    if (Number.isFinite(changeValue)) return { changeValue };
  }

  return {};
}

const LOGO_BLOCKLIST =
  /finance\/favicon|finance_v2_|favicon\.png|FINANCE_HUB|tradersunion|investing\.com|yahoo\.com|marketscreener|fxstreet|msn\.com|bloomberg/i;

/** Clases típicas del logo de empresa en Google Finance beta. */
const COMPANY_LOGO_CLASS_RE = /\b(?:iESaid|lZYhjf)\b/;

const MAX_DATA_IMAGE_LENGTH = 120_000;

export function normalizeDataImageUrl(raw: string): string | null {
  const decoded = raw.replace(/&amp;/g, '&').trim();
  if (!decoded.startsWith('data:image/')) return null;
  if (decoded.startsWith('javascript:')) return null;

  const allowed =
    decoded.startsWith('data:image/svg+xml') ||
    decoded.startsWith('data:image/png') ||
    decoded.startsWith('data:image/jpeg') ||
    decoded.startsWith('data:image/jpg') ||
    decoded.startsWith('data:image/webp') ||
    decoded.startsWith('data:image/gif');

  if (!allowed || decoded.length > MAX_DATA_IMAGE_LENGTH) return null;
  return decoded;
}

export function normalizeSecureHttpsUrl(raw: string, base = 'https://www.google.com'): string | null {
  const decoded = raw
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/g, '&')
    .trim();

  if (!decoded || decoded.startsWith('data:') || decoded.startsWith('javascript:')) return null;

  let url = decoded;
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = `${base.replace(/\/$/, '')}${url}`;
  if (!url.startsWith('https://')) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseFromEmbeddedDataImages(html: string): string | null {
  const prioritized: string[] = [];
  const fallback: string[] = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/\bsrc="(data:image[^"]+)"/i)?.[1];
    if (!src) continue;

    const normalized = normalizeDataImageUrl(src);
    if (!normalized) continue;

    const className = tag.match(/\bclass="([^"]+)"/i)?.[1] ?? '';
    if (COMPANY_LOGO_CLASS_RE.test(className)) {
      prioritized.push(normalized);
    } else {
      fallback.push(normalized);
    }
  }

  if (prioritized.length > 0) return prioritized[0];
  if (fallback.length > 0) return fallback[0];
  return null;
}

/** Logo opcional desde HTML de Google Finance. Si no hay uno confiable, null. */
export function parseGoogleFinanceLogoUrl(html: string): string | null {
  const embedded = parseFromEmbeddedDataImages(html);
  if (embedded) return embedded;

  const googleUser = html.match(/https:\/\/lh3\.googleusercontent\.com\/[^"'\\s]+/i);
  if (googleUser?.[0]) {
    const url = normalizeSecureHttpsUrl(googleUser[0]);
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }

  const faviconMatches = [
    ...html.matchAll(
      /encrypted-tbn\d*\.gstatic\.com\/faviconV2\?url=([^&"'\\]+)[^"'\\]*/gi,
    ),
  ];
  for (const match of faviconMatches) {
    const siteUrl = decodeURIComponent(match[1].replace(/\\u003a/gi, ':').replace(/\\u002f/gi, '/'));
    if (LOGO_BLOCKLIST.test(siteUrl)) continue;
    const full = normalizeSecureHttpsUrl(
      `https://${match[0].replace(/\\u003d/gi, '=').replace(/\\u0026/gi, '&').replace(/^encrypted-tbn/i, 'https://encrypted-tbn')}`,
    );
    if (full && !LOGO_BLOCKLIST.test(full)) return full;
  }

  const imgMatches = [...html.matchAll(/<img[^>]+src="(https:\/\/[^"]+)"/gi)];
  for (const match of imgMatches) {
    const url = normalizeSecureHttpsUrl(match[1]);
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }

  const jsonImage = html.match(/"image":\{"url":"(https:[^"]+)"/i);
  if (jsonImage?.[1]) {
    const url = normalizeSecureHttpsUrl(jsonImage[1].replace(/\\u002f/g, '/'));
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }

  return null;
}

export function normalizeFinanceTickers(raw: string): string[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of parts) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}
