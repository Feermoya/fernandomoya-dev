// src/lib/finance/monitor/auth.ts
function getFinanceMonitorSecret() {
  return process.env.FINANCE_MONITOR_SECRET?.trim() || process.env.FINANCE_CRON_SECRET?.trim() || "";
}
function timingSafeEqualString(a, b) {
  if (a.length !== b.length) {
    let acc = 0;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      acc |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return acc === 0 && a.length === b.length;
  }
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return "";
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}
function authorizeFinanceMonitor(params) {
  const secret = getFinanceMonitorSecret();
  const token = extractBearerToken(params.authorizationHeader);
  if (token && secret && timingSafeEqualString(token, secret)) {
    return { ok: true, via: "secret" };
  }
  if (params.uiSource) {
    return { ok: true, via: "ui" };
  }
  if (!secret) {
    return { ok: false, status: 503, error: "Monitor secret not configured" };
  }
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization" };
  }
  return { ok: false, status: 401, error: "Invalid authorization" };
}

// src/lib/finance/monitor/runMarketMonitor.ts
import { randomUUID } from "node:crypto";

// src/lib/finance/callMeBotServer.ts
var CALLMEBOT_TIMEOUT_MS = 1e4;
async function sendCallMeBotWhatsAppServer(phoneDigits, text, apiKey) {
  const phone = phoneDigits.replace(/\D/g, "");
  const key = apiKey.trim();
  if (!phone || !key) {
    return { ok: false, detail: "Falta tel\xE9fono o API key de CallMeBot." };
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(CALLMEBOT_TIMEOUT_MS)
    });
    const detail = (await res.text()).trim().slice(0, 500);
    const lower = detail.toLowerCase();
    const looksError = lower.includes("error") || lower.includes("invalid") || lower.includes("not allowed") || lower.includes("forbidden");
    const ok = res.ok && detail.length > 0 && !looksError;
    return { ok, detail: detail || `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("abort")) {
      return {
        ok: true,
        detail: "CallMeBot no respondi\xF3 a tiempo; el mensaje puede estar en cola."
      };
    }
    return { ok: false, detail: msg };
  }
}

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

// src/lib/finance/entryTicker.ts
var TICKER_RE = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;
var NON_TICKER_CATEGORY = /^(acciones?|cedears?|mep|usd|ars|etf|crypto|bitcoin|fondo|emergencia|proyecto|otro|inversi[oó]n|d[oó]lar)/i;
function normalizeTicker(value) {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9.-]/g, "").slice(0, 10);
}
function looksLikeFinanceTicker(value) {
  const t = normalizeTicker(value);
  if (!t || t.length > 10) return false;
  if (NON_TICKER_CATEGORY.test(t)) return false;
  return TICKER_RE.test(t);
}
function extractTickerFromNote(note) {
  if (!note?.trim()) return void 0;
  const tokens = note.split(/[\s,;/|]+/);
  for (const raw of tokens) {
    const t = normalizeTicker(raw);
    if (looksLikeFinanceTicker(t)) return t;
  }
  return void 0;
}
function tickerFromCategory(category) {
  if (!category?.trim()) return void 0;
  const norm = normalizeTicker(category);
  if (looksLikeFinanceTicker(norm)) return norm;
  const first = normalizeTicker(category.split(/[\s,;/|]+/)[0]);
  if (looksLikeFinanceTicker(first)) return first;
  return void 0;
}
function getEntryTicker(entry) {
  if (entry.ticker && looksLikeFinanceTicker(entry.ticker)) {
    return normalizeTicker(entry.ticker);
  }
  const fromCategory = tickerFromCategory(entry.category);
  if (fromCategory) return fromCategory;
  const fromNote = extractTickerFromNote(entry.note);
  if (fromNote) return fromNote;
  if (entry.asset === "BTC") return "BTC";
  if (entry.asset === "ETF" || entry.asset === "CEDEAR") {
    const again = tickerFromCategory(entry.category) ?? extractTickerFromNote(entry.note);
    if (again) return again;
  }
  return void 0;
}

// src/lib/finance/portfolio/consolidate.ts
function getTrackedTickersFromPortfolio(entries, holdings = []) {
  const set = /* @__PURE__ */ new Set();
  for (const e of entries) {
    if (e.type !== "investment") continue;
    const t = getEntryTicker(e);
    if (t) set.add(t);
  }
  for (const h of holdings) {
    if (h.ticker) set.add(h.ticker.toUpperCase());
  }
  return [...set].sort();
}

// src/lib/finance/marketAlerts.ts
function marketAlertFingerprint(alert) {
  return `${alert.kind}:${alert.ticker.toUpperCase()}`;
}
var SEVERITY_RANK = {
  opportunity: 0,
  warning: 1,
  positive: 2,
  neutral: 3
};
var DEFAULT_MIN_DAILY_DROP = 3;
var DEFAULT_MIN_GAIN_SINCE_BUY = 8;
var DEFAULT_MIN_LOSS_SINCE_BUY = 5;
function getLastBuyEntryForTicker(entries, ticker) {
  const norm = ticker.toUpperCase();
  let best;
  for (const entry of entries) {
    if (entry.type !== "investment") continue;
    if (getEntryTicker(entry) !== norm) continue;
    if (!best || entry.createdAt > best.createdAt) best = entry;
  }
  return best;
}
function getBuyReferenceForTicker(params) {
  const { entries, holdings = [], ticker, currentCurrency } = params;
  const lastBuy = getLastBuyEntryForTicker(entries, ticker);
  if (lastBuy && typeof lastBuy.buyPrice === "number" && lastBuy.buyPrice > 0 && currenciesMatch(lastBuy.buyCurrency, currentCurrency)) {
    return {
      buyPrice: lastBuy.buyPrice,
      buyCurrency: (lastBuy.buyCurrency ?? "ARS").toUpperCase()
    };
  }
  const norm = ticker.toUpperCase();
  const matching = holdings.filter((h) => h.ticker.toUpperCase() === norm);
  if (matching.length === 0) return null;
  if (currentCurrency) {
    const sameFx = matching.filter(
      (h) => currenciesMatch(h.currency, currentCurrency)
    );
    if (sameFx.length === 0) return null;
    let qty2 = 0;
    let cost2 = 0;
    for (const h of sameFx) {
      qty2 += h.quantity;
      cost2 += h.quantity * h.averagePurchasePrice;
    }
    if (!(qty2 > 0)) return null;
    return {
      buyPrice: cost2 / qty2,
      buyCurrency: currentCurrency.toUpperCase()
    };
  }
  const currencies = [...new Set(matching.map((h) => h.currency.toUpperCase()))];
  if (currencies.length !== 1) return null;
  let qty = 0;
  let cost = 0;
  for (const h of matching) {
    qty += h.quantity;
    cost += h.quantity * h.averagePurchasePrice;
  }
  if (!(qty > 0)) return null;
  return { buyPrice: cost / qty, buyCurrency: currencies[0] };
}
function currenciesMatch(a, b) {
  if (!a || !b) return false;
  return a.toUpperCase() === b.toUpperCase();
}
function buildMarketAlerts(params) {
  const {
    entries,
    prices,
    holdings = [],
    minDailyDropPercent = DEFAULT_MIN_DAILY_DROP,
    minGainSinceBuyPercent = DEFAULT_MIN_GAIN_SINCE_BUY,
    minLossSinceBuyPercent = DEFAULT_MIN_LOSS_SINCE_BUY
  } = params;
  const tickers = getTrackedTickersFromPortfolio(entries, holdings);
  const alerts = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (alert) => {
    const key = marketAlertFingerprint(alert);
    if (seen.has(key)) return;
    seen.add(key);
    alerts.push({ ...alert, id: key });
  };
  for (const ticker of tickers) {
    const priceRow = prices[ticker];
    const currentPrice = priceRow?.price;
    const currentCurrency = priceRow?.currency;
    const changePercent = priceRow?.changePercent;
    const source = priceRow?.source;
    if (typeof changePercent === "number" && Number.isFinite(changePercent)) {
      if (changePercent <= -minDailyDropPercent) {
        push({
          ticker,
          kind: "daily-drop",
          severity: "opportunity",
          title: `${ticker} baj\xF3 ${Math.abs(changePercent).toFixed(1)}% hoy`,
          detail: "Puede ser una oportunidad para revisar.",
          currentPrice,
          currentCurrency,
          changePercent,
          source
        });
      } else if (changePercent >= minDailyDropPercent) {
        push({
          ticker,
          kind: "daily-rise",
          severity: "positive",
          title: `${ticker} subi\xF3 ${changePercent.toFixed(1)}% hoy`,
          detail: "Revis\xE1 si sigue alineado con tu estrategia.",
          currentPrice,
          currentCurrency,
          changePercent,
          source
        });
      }
    }
    const buyRef = getBuyReferenceForTicker({
      entries,
      holdings,
      ticker,
      currentCurrency
    });
    if (buyRef && typeof currentPrice === "number" && currentPrice > 0) {
      const { buyPrice, buyCurrency } = buyRef;
      const deltaFromBuy = (currentPrice - buyPrice) / buyPrice * 100;
      if (deltaFromBuy <= -minLossSinceBuyPercent) {
        push({
          ticker,
          kind: "loss-since-buy",
          severity: "opportunity",
          title: `${ticker} est\xE1 ${Math.abs(deltaFromBuy).toFixed(1)}% abajo de tu compra`,
          detail: "Pod\xE9s revisar si quer\xE9s promediar o esperar.",
          currentPrice,
          currentCurrency,
          buyPrice,
          buyCurrency,
          changePercent: deltaFromBuy,
          source
        });
      } else if (deltaFromBuy >= minGainSinceBuyPercent) {
        push({
          ticker,
          kind: "gain-since-buy",
          severity: "positive",
          title: `${ticker} est\xE1 ${deltaFromBuy.toFixed(1)}% arriba de tu compra`,
          detail: "Buen avance desde tu precio registrado.",
          currentPrice,
          currentCurrency,
          buyPrice,
          buyCurrency,
          changePercent: deltaFromBuy,
          source
        });
      }
    }
  }
  if (alerts.length === 0 && tickers.length > 0) {
    alerts.push({
      id: "neutral:none",
      ticker: tickers[0],
      kind: "neutral",
      severity: "neutral",
      title: "Sin movimientos fuertes",
      detail: "No hay bajas o subas relevantes en tus activos seguidos."
    });
  }
  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]).slice(0, 4);
}

// src/lib/finance/monitor/marketHours.ts
var TZ = "America/Argentina/Buenos_Aires";
var AR_HINT = /^(GGAL|YPFD|PAMP|TXAR|ALUA|BMA|SUPV|COME|CRES|TECO2|EDN|LOMA|TRAN|CEPU|BYMA|VALO|HARG|MIRG|TGSU2|IRSA|CTIO|BHIP|BPAT|CVH)$/i;
function argentinaWallClock(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return { weekday: map[wd] ?? 1, hour, minute };
}
function minutesOfDay(hour, minute) {
  return hour * 60 + minute;
}
function classifyMarketSession(ticker) {
  const t = ticker.trim().toUpperCase();
  if (!t) return "unknown";
  if (isCryptoTicker(t)) return "crypto";
  if (AR_HINT.test(t)) return "ar_equity";
  if (/^[A-Z]{1,5}$/.test(t) && !AR_HINT.test(t)) return "us_equity";
  return "unknown";
}
function shouldFetchTickerNow(ticker, now = /* @__PURE__ */ new Date()) {
  const kind = classifyMarketSession(ticker);
  const { weekday, hour, minute } = argentinaWallClock(now);
  const mins = minutesOfDay(hour, minute);
  const weekend = weekday === 0 || weekday === 6;
  if (kind === "crypto") {
    return { kind, shouldFetch: true, reason: "crypto_24_7" };
  }
  if (weekend) {
    return { kind, shouldFetch: false, reason: "weekend" };
  }
  if (kind === "ar_equity") {
    const open2 = minutesOfDay(10, 15);
    const close2 = minutesOfDay(17, 30);
    const ok2 = mins >= open2 && mins <= close2;
    return { kind, shouldFetch: ok2, reason: ok2 ? "ar_session" : "ar_closed" };
  }
  const open = minutesOfDay(10, 0);
  const close = minutesOfDay(18, 0);
  const ok = mins >= open && mins <= close;
  return {
    kind,
    shouldFetch: ok,
    reason: ok ? kind === "us_equity" ? "us_session" : "unknown_day_session" : "outside_session"
  };
}
function filterTickersForMarketHours(tickers, now = /* @__PURE__ */ new Date()) {
  const fetch2 = [];
  const skipped = [];
  for (const raw of tickers) {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) continue;
    const d = shouldFetchTickerNow(ticker, now);
    if (d.shouldFetch) fetch2.push(ticker);
    else skipped.push({ ticker, reason: d.reason });
  }
  return { fetch: fetch2, skipped };
}

// src/lib/finance/monitor/status.ts
function normalizeMonitorStatus(raw) {
  if (typeof raw !== "object" || raw === null) return {};
  const o = raw;
  const out = {};
  if (typeof o.lastRunAt === "string") out.lastRunAt = o.lastRunAt;
  if (typeof o.lastSuccessfulRunAt === "string") out.lastSuccessfulRunAt = o.lastSuccessfulRunAt;
  if (typeof o.lastErrorAt === "string") out.lastErrorAt = o.lastErrorAt;
  if (typeof o.lastErrorCode === "string") out.lastErrorCode = o.lastErrorCode.slice(0, 80);
  if (typeof o.lastSymbolsRequested === "number" && Number.isFinite(o.lastSymbolsRequested)) {
    out.lastSymbolsRequested = o.lastSymbolsRequested;
  }
  if (typeof o.lastSymbolsResolved === "number" && Number.isFinite(o.lastSymbolsResolved)) {
    out.lastSymbolsResolved = o.lastSymbolsResolved;
  }
  if (typeof o.lastAlertsDetected === "number" && Number.isFinite(o.lastAlertsDetected)) {
    out.lastAlertsDetected = o.lastAlertsDetected;
  }
  if (typeof o.lastAlertsSent === "number" && Number.isFinite(o.lastAlertsSent)) {
    out.lastAlertsSent = o.lastAlertsSent;
  }
  if (typeof o.lastDurationMs === "number" && Number.isFinite(o.lastDurationMs)) {
    out.lastDurationMs = o.lastDurationMs;
  }
  if (typeof o.lastSkipReason === "string") out.lastSkipReason = o.lastSkipReason.slice(0, 80);
  return out;
}

// src/data/site.ts
var site = {
  name: "Fernando Moya",
  title: "Dise\xF1o y desarrollo web para negocios | Fernando Moya",
  description: "Dise\xF1o y desarrollo web en Mendoza para negocios, profesionales y marcas. Sitios pensados para presentarte mejor y facilitar el contacto.",
  url: "https://www.fermoyadev.com.ar",
  locale: "es-AR",
  author: "Fernando Moya",
  email: "fmoya97.fm@gmail.com",
  location: "Mendoza, Argentina",
  social: {
    /** Enlace wa.me sin + en la ruta. */
    whatsapp: "https://wa.me/5492615760276",
    /** Mismo número, solo dígitos (recordatorios Foco / CallMeBot). */
    whatsappPhoneDigits: "5492615760276"
  },
  /** Frase corta: footer, hero secundario. */
  tagline: "Sitios claros, pensados para presentar tu negocio y facilitar el contacto.",
  /**
   * Métricas para count-up en “Sobre mí” (editá valores reales antes de publicar).
   */
  metrics: [
    { value: 8, suffix: "+", label: "A\xF1os\nhaciendo webs" },
    { value: 2, suffix: " sem", label: "Para una\nprimera versi\xF3n" }
  ]
};

// src/lib/finance/preferences.ts
var DEFAULT_QUICK_AMOUNTS = [5e4, 1e5, 2e5, 5e5];
var DEFAULT_REMINDER_DAYS = [5, 15, 25];
function getDefaultPreferences() {
  return {
    quickAmounts: [...DEFAULT_QUICK_AMOUNTS],
    reminder: {
      enabled: true,
      phoneDigits: site.social.whatsappPhoneDigits,
      daysOfMonth: [...DEFAULT_REMINDER_DAYS],
      marketWhatsAppEnabled: true
    }
  };
}
function normalizePreferences(raw) {
  const base = getDefaultPreferences();
  if (!raw) return base;
  const quickAmounts = Array.isArray(raw.quickAmounts) ? raw.quickAmounts.filter((n) => Number.isFinite(n) && n > 0).slice(0, 8) : base.quickAmounts;
  const reminder = raw.reminder ?? base.reminder;
  return {
    quickAmounts: quickAmounts.length > 0 ? quickAmounts : base.quickAmounts,
    reminder: {
      enabled: reminder.enabled !== false,
      phoneDigits: site.social.whatsappPhoneDigits,
      daysOfMonth: normalizeReminderDays(reminder.daysOfMonth),
      messageTemplate: void 0,
      callMeBotApiKey: reminder.callMeBotApiKey?.trim() || void 0,
      lastCronReminderKeys: Array.isArray(reminder.lastCronReminderKeys) ? reminder.lastCronReminderKeys.filter((k) => typeof k === "string").slice(-36) : void 0,
      marketWhatsAppEnabled: reminder.marketWhatsAppEnabled !== false,
      lastMarketAlertKeys: Array.isArray(reminder.lastMarketAlertKeys) ? reminder.lastMarketAlertKeys.filter((k) => typeof k === "string").slice(-64) : void 0,
      lastMarketAlertSentAt: normalizeSentAtMap(reminder.lastMarketAlertSentAt)
    }
  };
}
function normalizeSentAtMap(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return void 0;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k === "string" && typeof v === "string" && k && v) out[k] = v;
  }
  const entries = Object.entries(out).slice(-64);
  return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}
function withPreferences(state) {
  return {
    ...state,
    preferences: normalizePreferences(state.preferences),
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? [],
    portfolioHoldings: state.portfolioHoldings ?? [],
    monitorStatus: state.monitorStatus
  };
}
function normalizeReminderDays(days) {
  if (!Array.isArray(days) || days.length === 0) return [...DEFAULT_REMINDER_DAYS];
  const uniq = [...new Set(days.map((d) => Math.round(d)).filter((d) => d >= 1 && d <= 28))];
  return uniq.length > 0 ? uniq.sort((a, b) => a - b) : [...DEFAULT_REMINDER_DAYS];
}
function markMarketAlertsSent(reminder, fingerprints, activeFingerprints) {
  const kept = (reminder.lastMarketAlertKeys ?? []).filter((key) => activeFingerprints.includes(key));
  const next = new Set(kept);
  for (const fp of fingerprints) next.add(fp);
  return {
    ...reminder,
    lastMarketAlertKeys: [...next].slice(-64)
  };
}

// src/lib/finance/postgrest.ts
function escapePostgrestString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function postgrestQuotedValue(value) {
  return encodeURIComponent(`"${escapePostgrestString(value)}"`);
}
function postgrestInFilter(column, value) {
  return `${column}=in.(${postgrestQuotedValue(value)})`;
}
function financeGameStateSelectUrl(restBase, syncId, columns = "body,updated_at") {
  const filter = postgrestInFilter("id", syncId);
  return `${restBase}/finance_game_state?${filter}&select=${columns}&limit=1`;
}

// src/lib/finance/monthlyInvestmentPlan.ts
function isMonthlyPlanAnchorItem(item) {
  return item.id.startsWith("anchor-");
}

// src/lib/finance/portfolio/validateHolding.ts
var CURRENCIES = /* @__PURE__ */ new Set(["ARS", "USD"]);
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ph-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function parseCurrency(raw) {
  if (typeof raw !== "string") return null;
  const c = raw.trim().normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toUpperCase();
  if (c === "ARS" || c === "USD") return c;
  if (c === "PESOS" || c === "PESO" || c === "$" || c === "AR$") return "ARS";
  if (c === "USS" || c === "US$" || c === "U$S" || c === "DOLARES" || c === "DOLAR" || c === "DOLLARS" || c === "DOLLAR") {
    return "USD";
  }
  return null;
}
function optionalTrim(raw) {
  if (typeof raw !== "string") return void 0;
  const t = raw.trim();
  return t || void 0;
}
function normalizeAndValidateHolding(raw, opts) {
  const errors = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: [{ message: "Holding inv\xE1lido." }] };
  }
  const o = raw;
  const now = opts?.nowIso ?? (/* @__PURE__ */ new Date()).toISOString();
  const ticker = normalizeTicker(typeof o.ticker === "string" ? o.ticker : "");
  if (!ticker || !looksLikeFinanceTicker(ticker)) {
    errors.push({ field: "ticker", message: "Ticker inv\xE1lido." });
  }
  const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ field: "quantity", message: "La cantidad debe ser mayor que cero." });
  }
  const averagePurchasePrice = typeof o.averagePurchasePrice === "number" ? o.averagePurchasePrice : Number(o.averagePurchasePrice);
  if (!Number.isFinite(averagePurchasePrice) || averagePurchasePrice <= 0) {
    errors.push({
      field: "averagePurchasePrice",
      message: "El precio promedio debe ser mayor que cero."
    });
  }
  const currency = parseCurrency(o.currency);
  if (!currency || !CURRENCIES.has(currency)) {
    errors.push({ field: "currency", message: "Moneda inv\xE1lida (ARS o USD)." });
  }
  const sourceRaw = typeof o.source === "string" ? o.source : "manual";
  const source = sourceRaw === "csv" || sourceRaw === "manual" ? sourceRaw : "manual";
  if (errors.length > 0) return { ok: false, errors };
  const createdAt = typeof o.createdAt === "string" && o.createdAt.trim() ? o.createdAt : now;
  const id = opts?.existingId || (typeof o.id === "string" && o.id.trim() ? o.id : newId());
  const holding = {
    id,
    ticker,
    quantity,
    averagePurchasePrice,
    currency,
    source,
    createdAt,
    updatedAt: now
  };
  const displayName = optionalTrim(o.displayName);
  if (displayName) holding.displayName = displayName;
  const broker = optionalTrim(o.broker);
  if (broker) holding.broker = broker;
  const purchaseDate = optionalTrim(o.purchaseDate);
  if (purchaseDate) holding.purchaseDate = purchaseDate;
  const market = optionalTrim(o.market);
  if (market) holding.market = market;
  const notes = optionalTrim(o.notes);
  if (notes) holding.notes = notes;
  return { ok: true, holding };
}
function normalizePortfolioHoldings(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const result = normalizeAndValidateHolding(item);
    if (result.ok) out.push(result.holding);
  }
  return out;
}

// src/lib/finance/storage.ts
var DEFAULT_FINANCE_SYNC_ID = "fernando-foco-financiero-main";
function isMonthString(s) {
  return typeof s === "string" && /^\d{4}-\d{2}$/.test(s);
}
function isFinanceEntry(x) {
  if (typeof x !== "object" || x === null) return false;
  const o = x;
  return typeof o.id === "string" && isMonthString(o.month) && typeof o.type === "string" && typeof o.amount === "number" && typeof o.createdAt === "string";
}
function isFinanceGoal(x) {
  if (typeof x !== "object" || x === null) return false;
  const o = x;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.targetAmount === "number" && typeof o.currentAmount === "number" && typeof o.category === "string" && typeof o.createdAt === "string";
}
function isMonthlyChallenge(x) {
  if (typeof x !== "object" || x === null) return false;
  const o = x;
  return typeof o.id === "string" && isMonthString(o.month) && typeof o.title === "string" && typeof o.targetAmount === "number" && typeof o.completed === "boolean";
}
function isMonthlyInvestmentPlanItem(x) {
  if (typeof x !== "object" || x === null) return false;
  const o = x;
  return typeof o.id === "string" && isMonthString(o.month) && typeof o.label === "string" && Array.isArray(o.matchTerms) && o.matchTerms.every((t) => typeof t === "string") && typeof o.createdAt === "string" && (o.referencePrice === void 0 || typeof o.referencePrice === "number" && Number.isFinite(o.referencePrice)) && (o.targetUnits === void 0 || typeof o.targetUnits === "number" && Number.isFinite(o.targetUnits) && o.targetUnits > 0);
}
function normalizeMonthlyInvestmentPlan(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isMonthlyInvestmentPlanItem).filter((item) => !isMonthlyPlanAnchorItem(item));
}
function withFinanceStateDefaults(state) {
  return {
    ...state,
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? [],
    portfolioHoldings: state.portfolioHoldings ?? [],
    monitorStatus: state.monitorStatus
  };
}
function importFinanceState(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "El JSON no es un objeto v\xE1lido." };
    }
    const o = parsed;
    if (!Array.isArray(o.entries) || !Array.isArray(o.goals) || !Array.isArray(o.challenges)) {
      return {
        ok: false,
        error: "Faltan arrays entries, goals o challenges."
      };
    }
    if (!isMonthString(o.currentMonth)) {
      return { ok: false, error: "currentMonth debe ser YYYY-MM." };
    }
    if (!o.entries.every(isFinanceEntry)) {
      return { ok: false, error: "Hay movimientos con campos inv\xE1lidos." };
    }
    if (!o.goals.every(isFinanceGoal)) {
      return { ok: false, error: "Hay objetivos con campos inv\xE1lidos." };
    }
    if (!o.challenges.every(isMonthlyChallenge)) {
      return { ok: false, error: "Hay retos con campos inv\xE1lidos." };
    }
    const state = {
      entries: o.entries,
      goals: o.goals,
      challenges: o.challenges,
      currentMonth: o.currentMonth,
      monthlyInvestmentPlan: normalizeMonthlyInvestmentPlan(o.monthlyInvestmentPlan),
      portfolioHoldings: normalizePortfolioHoldings(o.portfolioHoldings)
    };
    if (typeof o.wealthTarget === "number" && Number.isFinite(o.wealthTarget)) {
      state.wealthTarget = o.wealthTarget;
    }
    if (o.preferences && typeof o.preferences === "object") {
      state.preferences = normalizePreferences(o.preferences);
    } else {
      state.preferences = getDefaultPreferences();
    }
    if (o.monitorStatus && typeof o.monitorStatus === "object") {
      state.monitorStatus = normalizeMonitorStatus(o.monitorStatus);
    }
    return { ok: true, state: withPreferences(withFinanceStateDefaults(state)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON inv\xE1lido.";
    return { ok: false, error: `No se pudo importar: ${msg}` };
  }
}

// src/lib/finance/remoteFinanceState.ts
var TABLE = "finance_game_state";
function phoneDigitsFromWaUrl(url) {
  const m = url.match(/wa\.me\/(\d+)/i);
  return m?.[1] ?? "";
}
function resolveWhatsAppPhone(_reminderPhone) {
  return site.social.whatsappPhoneDigits || phoneDigitsFromWaUrl(site.social.whatsapp);
}
function supabaseRestBase() {
  const url = (process.env.PUBLIC_FINANCE_SUPABASE_URL ?? process.env.FINANCE_SUPABASE_URL)?.replace(
    /\/$/,
    ""
  );
  if (!url) return null;
  return `${url}/rest/v1`;
}
function supabaseHeaders() {
  const key = process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY ?? process.env.FINANCE_SUPABASE_ANON_KEY;
  if (!key?.trim()) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };
}
function isFinanceRemoteConfigured() {
  return Boolean(supabaseRestBase() && supabaseHeaders());
}
async function fetchFinanceStateRemote(syncId = DEFAULT_FINANCE_SYNC_ID) {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) return null;
  const res = await fetch(financeGameStateSelectUrl(base, syncId, "body"), {
    headers,
    method: "GET",
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Supabase read failed (${res.status})`);
  }
  const rows = await res.json();
  if (!rows?.length) return null;
  const body = rows[0].body;
  const parsed = importFinanceState(typeof body === "string" ? body : JSON.stringify(body));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.state;
}
async function upsertFinanceStateRemote(syncId, state) {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) throw new Error("Supabase not configured");
  const res = await fetch(`${base}/${TABLE}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal,resolution=merge-duplicates"
    },
    body: JSON.stringify([{ id: syncId, body: state }])
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Supabase write failed (${res.status}): ${t.slice(0, 120)}`);
  }
}

// src/lib/finance/calculations.ts
var ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

// src/lib/finance/whatsappCopy.ts
function formatPercentEs(value) {
  return Math.abs(value).toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}
function formatMoneyWhatsApp(amount, currency) {
  const cur = (currency ?? "ARS").toUpperCase();
  const hasCents = Math.abs(amount % 1) > 1e-9;
  const num = amount.toLocaleString("es-AR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2
  });
  if (cur === "USD") return `US$ ${num}`;
  return `$ ${num}`;
}
function formatMarketTestEmptyWhatsAppMessage() {
  return [
    "\u2705 *Prueba de mercado*",
    "",
    "No hay movimientos importantes en tus activos."
  ].join("\n");
}
function formatMarketAlertBlock(alert) {
  const pct = typeof alert.changePercent === "number" && Number.isFinite(alert.changePercent) ? formatPercentEs(alert.changePercent) : null;
  const hasBuy = typeof alert.buyPrice === "number" && alert.buyPrice > 0 && typeof alert.currentPrice === "number" && alert.currentPrice > 0;
  const hasCurrent = typeof alert.currentPrice === "number" && alert.currentPrice > 0;
  const buyMoney = hasBuy ? formatMoneyWhatsApp(alert.buyPrice, alert.buyCurrency) : null;
  const currentMoney = hasCurrent ? formatMoneyWhatsApp(alert.currentPrice, alert.currentCurrency) : null;
  if (alert.kind === "loss-since-buy") {
    const title = pct ? `\u{1F534} *${alert.ticker} est\xE1 ${pct}% abajo de tu compra*` : `\u{1F534} *${alert.ticker} est\xE1 abajo de tu compra*`;
    if (buyMoney && currentMoney) {
      return [title, "", `Compra: *${buyMoney}*`, `Precio actual: *${currentMoney}*`].join("\n");
    }
    return title;
  }
  if (alert.kind === "gain-since-buy") {
    const title = pct ? `\u{1F7E2} *${alert.ticker} subi\xF3 ${pct}% desde tu compra*` : `\u{1F7E2} *${alert.ticker} subi\xF3 desde tu compra*`;
    if (buyMoney && currentMoney) {
      return [title, "", `Compra: *${buyMoney}*`, `Precio actual: *${currentMoney}*`].join("\n");
    }
    return title;
  }
  if (alert.kind === "daily-drop") {
    const title = pct ? `\u{1F534} *${alert.ticker} baj\xF3 ${pct}% hoy*` : `\u{1F534} *${alert.ticker} baj\xF3 hoy*`;
    if (currentMoney) {
      return [title, "", `Precio actual: *${currentMoney}*`].join("\n");
    }
    return title;
  }
  if (alert.kind === "daily-rise") {
    const title = pct ? `\u{1F7E2} *${alert.ticker} subi\xF3 ${pct}% hoy*` : `\u{1F7E2} *${alert.ticker} subi\xF3 hoy*`;
    if (currentMoney) {
      return [title, "", `Precio actual: *${currentMoney}*`].join("\n");
    }
    return title;
  }
  return `\u{1F7E1} *${alert.title}*`;
}
function formatMarketWhatsAppMessage(alerts) {
  if (alerts.length === 0) return formatMarketTestEmptyWhatsAppMessage();
  const header = alerts.length === 1 ? "\u{1F514} *Alerta de mercado*" : "\u{1F514} *Alertas de mercado*";
  const blocks = alerts.map(formatMarketAlertBlock);
  return [header, "", ...blocks.flatMap((block, i) => i === 0 ? [block] : ["", block])].join(
    "\n"
  );
}

// src/lib/finance/monitor/antiSpam.ts
var MONITOR_FINGERPRINT_COOLDOWN_MS = 2 * 60 * 60 * 1e3;
function isFingerprintInCooldown(reminder, fingerprint, nowMs, cooldownMs = MONITOR_FINGERPRINT_COOLDOWN_MS) {
  const map = reminder.lastMarketAlertSentAt;
  if (!map || typeof map !== "object") return false;
  const raw = map[fingerprint];
  if (typeof raw !== "string") return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  return nowMs - t < cooldownMs;
}
function fingerprintAlreadySent(sentKeys, alert) {
  const set = sentKeys instanceof Set ? sentKeys : new Set(sentKeys);
  const primary = marketAlertFingerprint(alert);
  if (set.has(primary)) return true;
  const ticker = alert.ticker.toUpperCase();
  const legacy = `${alert.kind}:${ticker}`;
  if (set.has(legacy)) return true;
  const cur = (alert.currentCurrency || alert.buyCurrency || "").toUpperCase();
  if (cur && set.has(`${alert.kind}:${ticker}:${cur}`)) return true;
  return false;
}
function markMarketAlertsSentWithCooldown(reminder, fingerprints, activeFingerprints, sentAtIso) {
  const base = markMarketAlertsSent(reminder, fingerprints, activeFingerprints);
  const prev = { ...reminder.lastMarketAlertSentAt ?? {} };
  for (const fp of fingerprints) {
    prev[fp] = sentAtIso;
  }
  const keep = /* @__PURE__ */ new Set([...base.lastMarketAlertKeys ?? [], ...fingerprints]);
  const nextAt = {};
  for (const [k, v] of Object.entries(prev)) {
    if (keep.has(k) || fingerprints.includes(k)) nextAt[k] = v;
  }
  const entries = Object.entries(nextAt).slice(-64);
  return {
    ...base,
    lastMarketAlertSentAt: Object.fromEntries(entries)
  };
}

// src/lib/finance/monitor/runMarketMonitor.ts
var MONITOR_BATCH_SIZE = 30;
var MONITOR_MAX_ALERTS_IN_MESSAGE = 4;
function resolveCallMeBotApiKey(reminder) {
  return reminder?.callMeBotApiKey?.trim() || process.env.CALLMEBOT_API_KEY?.trim() || process.env.FINANCE_CALLMEBOT_API_KEY?.trim() || "";
}
var monitorLock = null;
function actionableMarketAlerts(alerts) {
  return alerts.filter((a) => a.kind !== "neutral");
}
function prioritizeAlerts(alerts) {
  return alerts.slice(0, MONITOR_MAX_ALERTS_IN_MESSAGE);
}
async function fetchPricesInBatches(tickers) {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const merged = {};
  let anyOk = false;
  let lastError;
  for (let i = 0; i < unique.length; i += MONITOR_BATCH_SIZE) {
    const batch = unique.slice(i, i + MONITOR_BATCH_SIZE);
    const res = await buildFinancePricesResponse(batch.join(","));
    if (res.ok) anyOk = true;
    else lastError = res.error;
    Object.assign(merged, res.prices);
  }
  const resolved = Object.values(merged).filter(
    (p) => p && typeof p.price === "number" && p.price > 0 && p.source !== "missing"
  ).length;
  return { prices: merged, resolved, ok: anyOk || unique.length === 0, error: lastError };
}
function buildStatusPatch(prev, summary) {
  const base = normalizeMonitorStatus(prev);
  const next = {
    ...base,
    lastRunAt: summary.checkedAt,
    lastSymbolsRequested: summary.symbolsRequested,
    lastSymbolsResolved: summary.symbolsResolved,
    lastAlertsDetected: summary.alertsDetected,
    lastAlertsSent: summary.alertsSent,
    lastDurationMs: summary.durationMs
  };
  if (summary.ok && !summary.errorCode) {
    next.lastSuccessfulRunAt = summary.checkedAt;
    next.lastErrorAt = void 0;
    next.lastErrorCode = void 0;
    next.lastSkipReason = summary.skipReason;
  } else if (summary.errorCode) {
    next.lastErrorAt = summary.checkedAt;
    next.lastErrorCode = summary.errorCode;
    next.lastSkipReason = summary.skipReason;
  } else if (summary.skipReason) {
    next.lastSkipReason = summary.skipReason;
  }
  return next;
}
async function runFinanceMarketMonitor(options = {}) {
  const started = Date.now();
  const runId = randomUUID();
  const checkedAt = (options.now ?? /* @__PURE__ */ new Date()).toISOString();
  const mode = options.mode === "send" ? "send" : "check";
  const syncId = options.syncId ?? DEFAULT_FINANCE_SYNC_ID;
  const persist = options.persist !== false;
  const force = Boolean(options.force);
  const now = options.now ?? /* @__PURE__ */ new Date();
  const nowMs = now.getTime();
  const fail = (errorCode, skipReason, extra = {}) => ({
    ok: false,
    runId,
    checkedAt,
    mode,
    symbolsRequested: 0,
    symbolsResolved: 0,
    symbolsSkippedHours: 0,
    alertsDetected: 0,
    alertsSent: 0,
    alertsSkipped: 0,
    durationMs: Date.now() - started,
    errorCode,
    skipReason,
    ...extra
  });
  if (monitorLock) {
    return fail("overlap", "execution_overlap");
  }
  monitorLock = runId;
  try {
    if (!isFinanceRemoteConfigured()) {
      return fail("supabase_not_configured", "supabase_not_configured");
    }
    let state;
    try {
      state = await fetchFinanceStateRemote(syncId);
    } catch {
      return fail("supabase_fetch_failed", "supabase_unavailable");
    }
    if (!state) {
      return {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: "no_remote_state"
      };
    }
    const prefs = normalizePreferences(state.preferences);
    let reminder = prefs.reminder;
    if (!force && !reminder.marketWhatsAppEnabled) {
      const summary2 = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: "market_disabled"
      };
      if (persist) {
        const nextState = {
          ...state,
          monitorStatus: buildStatusPatch(state.monitorStatus, summary2),
          preferences: { ...prefs, reminder }
        };
        try {
          await upsertFinanceStateRemote(syncId, nextState);
        } catch {
        }
      }
      return summary2;
    }
    const holdings = state.portfolioHoldings ?? [];
    const allTickers = getTrackedTickersFromPortfolio(state.entries, holdings);
    if (allTickers.length === 0) {
      const summary2 = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: 0,
        symbolsResolved: 0,
        symbolsSkippedHours: 0,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: "no_tickers"
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary2)
          });
        } catch {
        }
      }
      return summary2;
    }
    const hours = options.ignoreMarketHours ? { fetch: allTickers, skipped: [] } : filterTickersForMarketHours(allTickers, now);
    if (hours.fetch.length === 0) {
      const summary2 = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: allTickers.length,
        symbolsResolved: 0,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: 0,
        alertsSent: 0,
        alertsSkipped: 0,
        durationMs: Date.now() - started,
        skipReason: "market_closed"
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary2)
          });
        } catch {
        }
      }
      return summary2;
    }
    const priceBundle = await fetchPricesInBatches(hours.fetch);
    if (!priceBundle.ok && hours.fetch.length > 0) {
      const summary2 = fail("prices_unavailable", "prices_unavailable", {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        ok: true
      });
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, {
              ...summary2,
              errorCode: "prices_unavailable"
            })
          });
        } catch {
        }
      }
      return summary2;
    }
    const alerts = prioritizeAlerts(
      actionableMarketAlerts(
        buildMarketAlerts({
          entries: state.entries,
          prices: priceBundle.prices,
          holdings
        })
      )
    );
    const activeFingerprints = alerts.map(marketAlertFingerprint);
    const sentSet = new Set(reminder.lastMarketAlertKeys ?? []);
    const fresh = force ? alerts : alerts.filter((alert) => {
      const fp = marketAlertFingerprint(alert);
      if (fingerprintAlreadySent(sentSet, alert)) return false;
      if (isFingerprintInCooldown(reminder, fp, nowMs)) return false;
      return true;
    });
    const alertsSkipped = Math.max(0, alerts.length - fresh.length);
    if (mode === "check") {
      const summary2 = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        wouldSend: fresh.length,
        skipReason: fresh.length === 0 ? alerts.length ? "already_sent" : "no_alerts" : void 0
      };
      if (persist) {
        const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary2),
            preferences: { ...prefs, reminder: pruned }
          });
        } catch {
        }
      }
      return summary2;
    }
    const phone = resolveWhatsAppPhone();
    const apiKey = resolveCallMeBotApiKey(reminder);
    if (!phone) {
      return fail("no_phone", "no_phone", {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSkipped,
        ok: true
      });
    }
    if (!apiKey) {
      return fail("no_api_key", "no_api_key", {
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSkipped,
        ok: true
      });
    }
    if (fresh.length === 0) {
      const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
      const summary2 = {
        ok: true,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        skipReason: alerts.length ? "already_sent" : "no_alerts"
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary2),
            preferences: { ...prefs, reminder: pruned }
          });
        } catch {
        }
      }
      return summary2;
    }
    const message = formatMarketWhatsAppMessage(fresh);
    const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
    if (!send.ok) {
      const summary2 = {
        ok: false,
        runId,
        checkedAt,
        mode,
        symbolsRequested: hours.fetch.length,
        symbolsResolved: priceBundle.resolved,
        symbolsSkippedHours: hours.skipped.length,
        alertsDetected: alerts.length,
        alertsSent: 0,
        alertsSkipped,
        durationMs: Date.now() - started,
        errorCode: "whatsapp_failed",
        skipReason: "whatsapp_failed"
      };
      if (persist) {
        try {
          await upsertFinanceStateRemote(syncId, {
            ...state,
            monitorStatus: buildStatusPatch(state.monitorStatus, summary2)
          });
        } catch {
        }
      }
      return summary2;
    }
    const freshKeys = fresh.map(marketAlertFingerprint);
    reminder = markMarketAlertsSentWithCooldown(
      reminder,
      freshKeys,
      activeFingerprints,
      checkedAt
    );
    const summary = {
      ok: true,
      runId,
      checkedAt,
      mode,
      symbolsRequested: hours.fetch.length,
      symbolsResolved: priceBundle.resolved,
      symbolsSkippedHours: hours.skipped.length,
      alertsDetected: alerts.length,
      alertsSent: fresh.length,
      alertsSkipped,
      durationMs: Date.now() - started
    };
    if (persist) {
      try {
        await upsertFinanceStateRemote(syncId, {
          ...state,
          monitorStatus: buildStatusPatch(state.monitorStatus, summary),
          preferences: { ...prefs, reminder }
        });
      } catch {
        return {
          ...summary,
          ok: false,
          errorCode: "persist_failed",
          skipReason: "persist_failed"
        };
      }
    }
    return summary;
  } finally {
    if (monitorLock === runId) monitorLock = null;
  }
}

// api/finance-market-monitor.entry.ts
function headerValue(headers, name) {
  if (!headers) return "";
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}
function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}
async function readBody(req) {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.on === "function") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}
function parseMode(raw) {
  return raw === "send" ? "send" : "check";
}
async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }
    const body = await readBody(req);
    const uiSource = body.source === "ui";
    const auth = authorizeFinanceMonitor({
      authorizationHeader: headerValue(req.headers, "authorization"),
      uiSource
    });
    if (!auth.ok) {
      return json(res, auth.status, { ok: false, error: auth.error });
    }
    const mode = auth.via === "secret" ? parseMode(body.mode ?? "send") : parseMode(body.mode ?? "check");
    const summary = await runFinanceMarketMonitor({
      mode,
      force: Boolean(body.force) && auth.via === "ui",
      ignoreMarketHours: Boolean(body.ignoreMarketHours) && auth.via === "ui",
      persist: true
    });
    const httpStatus = summary.errorCode === "overlap" ? 409 : summary.errorCode === "supabase_not_configured" || summary.errorCode === "supabase_fetch_failed" ? 503 : 200;
    return json(res, httpStatus, {
      ok: summary.ok,
      runId: summary.runId,
      checkedAt: summary.checkedAt,
      mode: summary.mode,
      via: auth.via,
      symbolsRequested: summary.symbolsRequested,
      symbolsResolved: summary.symbolsResolved,
      symbolsSkippedHours: summary.symbolsSkippedHours,
      alertsDetected: summary.alertsDetected,
      alertsSent: summary.alertsSent,
      alertsSkipped: summary.alertsSkipped,
      durationMs: summary.durationMs,
      wouldSend: summary.wouldSend,
      skipReason: summary.skipReason,
      errorCode: summary.errorCode
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : "Error interno"
    });
  }
}
export {
  handler as default
};
