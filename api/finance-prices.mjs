// src/lib/finance/googleFinanceParse.ts
function buildGoogleFinanceUrl(ticker, exchange = "BCBA") {
  const sym = ticker.trim().toUpperCase();
  return `https://www.google.com/finance/beta/quote/${encodeURIComponent(sym)}:${exchange}?hl=es`;
}
function parseARSNumber(value) {
  let cleaned = value.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  cleaned = cleaned.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 5e7) return null;
  return Math.round(n);
}
var ARS_EMBEDDED_RE = /"ARS",\[(\d+(?:\.\d+)?),/;
function parseFromEmbeddedJson(html) {
  const m = html.match(ARS_EMBEDDED_RE);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 5e7) return null;
  return Math.round(n);
}
function parseFromAttributes(html) {
  const attr = html.match(/data-last-price="([^"]+)"/i);
  if (attr?.[1]) {
    const n = parseARSNumber(attr[1]);
    if (n !== null) return n;
  }
  return null;
}
function parseFromVisibleAmounts(html) {
  const matches = html.match(/\$\s*[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?/g);
  if (!matches?.length) return null;
  const parsed = matches.map((m) => parseARSNumber(m)).filter((n) => n !== null && n >= 100 && n <= 5e7);
  if (parsed.length === 0) return null;
  return parsed[0];
}
function parseGoogleFinancePrice(html) {
  const embedded = parseFromEmbeddedJson(html);
  if (embedded !== null) return embedded;
  const attr = parseFromAttributes(html);
  if (attr !== null) return attr;
  return parseFromVisibleAmounts(html);
}
function parseGoogleFinanceDailyChange(html) {
  const pctMatch = html.match(/"changePercent"\s*:\s*(-?\d+(?:\.\d+)?)/i) ?? html.match(/"percentChange"\s*:\s*(-?\d+(?:\.\d+)?)/i);
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
var LOGO_BLOCKLIST = /finance\/favicon|finance_v2_|favicon\.png|FINANCE_HUB|tradersunion|investing\.com|yahoo\.com|marketscreener|fxstreet|msn\.com|bloomberg/i;
var COMPANY_LOGO_CLASS_RE = /\b(?:iESaid|lZYhjf)\b/;
var MAX_DATA_IMAGE_LENGTH = 12e4;
function normalizeDataImageUrl(raw) {
  const decoded = raw.replace(/&amp;/g, "&").trim();
  if (!decoded.startsWith("data:image/")) return null;
  if (decoded.startsWith("javascript:")) return null;
  const allowed = decoded.startsWith("data:image/svg+xml") || decoded.startsWith("data:image/png") || decoded.startsWith("data:image/jpeg") || decoded.startsWith("data:image/jpg") || decoded.startsWith("data:image/webp") || decoded.startsWith("data:image/gif");
  if (!allowed || decoded.length > MAX_DATA_IMAGE_LENGTH) return null;
  return decoded;
}
function normalizeSecureHttpsUrl(raw, base = "https://www.google.com") {
  const decoded = raw.replace(/\\u003d/gi, "=").replace(/\\u0026/gi, "&").replace(/&amp;/g, "&").trim();
  if (!decoded || decoded.startsWith("data:") || decoded.startsWith("javascript:")) return null;
  let url = decoded;
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/")) url = `${base.replace(/\/$/, "")}${url}`;
  if (!url.startsWith("https://")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function parseFromEmbeddedDataImages(html) {
  const prioritized = [];
  const fallback = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/\bsrc="(data:image[^"]+)"/i)?.[1];
    if (!src) continue;
    const normalized = normalizeDataImageUrl(src);
    if (!normalized) continue;
    const className = tag.match(/\bclass="([^"]+)"/i)?.[1] ?? "";
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
function parseGoogleFinanceLogoUrl(html) {
  const embedded = parseFromEmbeddedDataImages(html);
  if (embedded) return embedded;
  const googleUser = html.match(/https:\/\/lh3\.googleusercontent\.com\/[^"'\\s]+/i);
  if (googleUser?.[0]) {
    const url = normalizeSecureHttpsUrl(googleUser[0]);
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }
  const faviconMatches = [
    ...html.matchAll(
      /encrypted-tbn\d*\.gstatic\.com\/faviconV2\?url=([^&"'\\]+)[^"'\\]*/gi
    )
  ];
  for (const match of faviconMatches) {
    const siteUrl = decodeURIComponent(match[1].replace(/\\u003a/gi, ":").replace(/\\u002f/gi, "/"));
    if (LOGO_BLOCKLIST.test(siteUrl)) continue;
    const full = normalizeSecureHttpsUrl(
      `https://${match[0].replace(/\\u003d/gi, "=").replace(/\\u0026/gi, "&").replace(/^encrypted-tbn/i, "https://encrypted-tbn")}`
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
    const url = normalizeSecureHttpsUrl(jsonImage[1].replace(/\\u002f/g, "/"));
    if (url && !LOGO_BLOCKLIST.test(url)) return url;
  }
  return null;
}
function normalizeFinanceTickers(raw) {
  const parts = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const t of parts) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}

// src/lib/finance/tickerPricing.ts
var CRYPTO_TICKERS = /* @__PURE__ */ new Set([
  "BTC",
  "ETH",
  "SOL",
  "ADA",
  "XRP",
  "DOGE",
  "DOT",
  "AVAX",
  "MATIC",
  "LINK",
  "UNI",
  "LTC",
  "BNB",
  "SHIB",
  "TRX",
  "XLM",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "BCH",
  "ETC",
  "FIL",
  "ICP",
  "HBAR",
  "VET",
  "ALGO",
  "AAVE",
  "MKR",
  "CRO",
  "USDT",
  "USDC"
]);
function isCryptoTicker(ticker) {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (t.endsWith("-USD")) return true;
  return CRYPTO_TICKERS.has(t);
}
function toYahooCryptoSymbol(ticker) {
  const t = ticker.trim().toUpperCase();
  if (t.includes("-")) return t;
  return `${t}-USD`;
}
function buildYahooFinanceQuoteUrl(ticker) {
  const sym = toYahooCryptoSymbol(ticker);
  return `https://es.finance.yahoo.com/quote/${encodeURIComponent(sym)}/`;
}
var CRYPTO_LOGO_FALLBACKS = {
  BTC: "https://1000logos.net/wp-content/uploads/2018/05/Bitcoin-Logo.png"
};
function getCryptoLogoFallbackUrl(ticker) {
  const base = ticker.trim().toUpperCase().replace(/-USD$/, "");
  return CRYPTO_LOGO_FALLBACKS[base];
}

// src/lib/finance/yahooFinanceParse.ts
var YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
function buildYahooChartUrl(ticker) {
  const sym = toYahooCryptoSymbol(ticker);
  return `${YAHOO_CHART_BASE}/${encodeURIComponent(sym)}?interval=1d&range=1d`;
}
function computeDailyChange(price, previousClose) {
  if (typeof previousClose !== "number" || !Number.isFinite(previousClose) || previousClose <= 0) {
    return {};
  }
  const changeValue = price - previousClose;
  const changePercent = changeValue / previousClose * 100;
  return { changeValue, changePercent, changePeriod: "1D" };
}
function parseYahooChartPrice(payload) {
  const data = payload;
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  const currency = typeof meta?.currency === "string" && meta.currency ? meta.currency : "USD";
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? meta?.regularMarketPreviousClose;
  return {
    price,
    currency,
    ...computeDailyChange(price, previousClose)
  };
}
var LOGO_BLOCKLIST2 = /finance\/favicon|finance_v2_|favicon\.png|analytics-logo|yahoo-finance-logo/i;
function normalizeSecureHttpsUrl2(raw, base = "https://www.google.com") {
  const decoded = raw.replace(/\\u003d/gi, "=").replace(/\\u0026/gi, "&").replace(/&amp;/g, "&").trim();
  if (!decoded || decoded.startsWith("data:") || decoded.startsWith("javascript:")) return null;
  let url = decoded;
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/")) url = `${base.replace(/\/$/, "")}${url}`;
  if (!url.startsWith("https://")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function parseYahooFinanceLogoUrl(html) {
  const yimg = html.match(/https:\/\/s\.yimg\.com\/[^"'\\s]+\.(?:png|jpg|webp|svg)(?:\?[^"'\\s]*)?/i);
  if (yimg?.[0]) {
    const url = normalizeSecureHttpsUrl2(yimg[0], "https://es.finance.yahoo.com");
    if (url && !LOGO_BLOCKLIST2.test(url)) return url;
  }
  const imgs = [...html.matchAll(/<img[^>]+src="(https:\/\/[^"]+)"/gi)];
  for (const match of imgs) {
    const url = normalizeSecureHttpsUrl2(match[1], "https://es.finance.yahoo.com");
    if (url && !LOGO_BLOCKLIST2.test(url) && /crypto|coin|logo|symbol/i.test(url)) return url;
  }
  return null;
}

// src/lib/finance/financePricesServer.ts
var FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json",
  "Accept-Language": "es-AR,es;q=0.9",
  "User-Agent": "Mozilla/5.0 (compatible; FocoFinanciero/1.0; +https://www.fermoyadev.com.ar)"
};
var FINANCE_PRICES_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
  "Content-Type": "application/json; charset=utf-8"
};
function missingPrice(ticker, exchange, url, fetchedAt, error, currency = "ARS") {
  return {
    ticker,
    exchange,
    price: 0,
    currency,
    source: "missing",
    fetchedAt,
    url,
    error
  };
}
async function fetchGoogleBcbaPrice(ticker, fetchedAt) {
  const url = buildGoogleFinanceUrl(ticker, "BCBA");
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) {
      return missingPrice(ticker, "BCBA", url, fetchedAt, `HTTP ${res.status}`);
    }
    const html = await res.text();
    const price = parseGoogleFinancePrice(html);
    const logoUrl = parseGoogleFinanceLogoUrl(html) ?? void 0;
    const dailyChange = parseGoogleFinanceDailyChange(html);
    if (price === null || price <= 0) {
      return {
        ...missingPrice(ticker, "BCBA", url, fetchedAt, "No se pudo leer el precio"),
        logoUrl
      };
    }
    return {
      ticker,
      exchange: "BCBA",
      price,
      currency: "ARS",
      source: "google-finance",
      fetchedAt,
      url,
      logoUrl,
      changeValue: dailyChange.changeValue,
      changePercent: dailyChange.changePercent,
      changePeriod: dailyChange.changePercent !== void 0 ? "1D" : void 0
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al consultar Google Finance";
    return missingPrice(ticker, "BCBA", url, fetchedAt, msg);
  }
}
async function fetchYahooCryptoPrice(ticker, fetchedAt) {
  const url = buildYahooFinanceQuoteUrl(ticker);
  const chartUrl = buildYahooChartUrl(ticker);
  try {
    const res = await fetch(chartUrl, {
      headers: {
        ...FETCH_HEADERS,
        Accept: "application/json",
        Referer: url
      },
      redirect: "follow"
    });
    if (!res.ok) {
      return missingPrice(ticker, "USD", url, fetchedAt, `HTTP ${res.status}`, "USD");
    }
    const payload = await res.json();
    const parsed = parseYahooChartPrice(payload);
    let logoUrl;
    try {
      const htmlRes = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        logoUrl = parseYahooFinanceLogoUrl(html) ?? void 0;
      }
    } catch {
    }
    logoUrl ??= getCryptoLogoFallbackUrl(ticker);
    if (!parsed) {
      return {
        ...missingPrice(ticker, "USD", url, fetchedAt, "No se pudo leer el precio", "USD"),
        logoUrl
      };
    }
    return {
      ticker,
      exchange: "USD",
      price: parsed.price,
      currency: parsed.currency,
      source: "yahoo-finance",
      fetchedAt,
      url,
      logoUrl,
      changeValue: parsed.changeValue,
      changePercent: parsed.changePercent,
      changePeriod: parsed.changePeriod
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al consultar Yahoo Finance";
    return missingPrice(ticker, "USD", url, fetchedAt, msg, "USD");
  }
}
async function fetchTickerPrice(ticker, fetchedAt) {
  if (isCryptoTicker(ticker)) {
    return fetchYahooCryptoPrice(ticker, fetchedAt);
  }
  const bcba = await fetchGoogleBcbaPrice(ticker, fetchedAt);
  if (bcba.price > 0 && bcba.source !== "missing") return bcba;
  const yahoo = await fetchYahooCryptoPrice(ticker, fetchedAt);
  if (yahoo.price > 0 && yahoo.source !== "missing") return yahoo;
  return bcba.error ? bcba : yahoo;
}
async function buildFinancePricesResponse(rawTickers) {
  const tickers = normalizeFinanceTickers(rawTickers);
  const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (tickers.length === 0) {
    return {
      ok: false,
      prices: {},
      fetchedAt,
      error: "Par\xE1metro tickers vac\xEDo"
    };
  }
  const results = await Promise.all(tickers.map((ticker) => fetchTickerPrice(ticker, fetchedAt)));
  const prices = {};
  for (const row of results) {
    prices[row.ticker] = row;
  }
  const found = results.filter((r) => r.price > 0 && r.source !== "missing").length;
  return {
    ok: found > 0,
    prices,
    fetchedAt,
    error: found === 0 ? "No se pudieron leer precios" : void 0
  };
}

// api/finance-prices.entry.ts
async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    const raw = typeof req.query?.tickers === "string" ? req.query.tickers : "";
    const body = await buildFinancePricesResponse(raw);
    Object.entries(FINANCE_PRICES_CACHE_HEADERS).forEach(([k, v]) => {
      res.setHeader(k, v);
    });
    const status = body.error === "Par\xE1metro tickers vac\xEDo" ? 400 : 200;
    return res.status(status).json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({
      ok: false,
      prices: {},
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
      error: message
    });
  }
}
export {
  handler as default
};
