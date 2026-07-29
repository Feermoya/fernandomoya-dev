// src/lib/finance/monthlyInvestmentPlan.ts
function isMonthlyPlanAnchorItem(item) {
  return item.id.startsWith("anchor-");
}

// src/data/site.ts
var site = {
  name: "Fernando Moya",
  title: "Dise\xF1o y desarrollo web para negocios | Fernando Moya",
  description: "Dise\xF1o y desarrollo sitios web claros, r\xE1pidos y profesionales para negocios, marcas y profesionales. Trabajo desde Mendoza para proyectos en espa\xF1ol.",
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
var INVESTMENT_REMINDER_DAYS_PER_WINDOW = 3;
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
      lastMarketAlertKeys: Array.isArray(reminder.lastMarketAlertKeys) ? reminder.lastMarketAlertKeys.filter((k) => typeof k === "string").slice(-64) : void 0
    }
  };
}
function withPreferences(state) {
  return {
    ...state,
    preferences: normalizePreferences(state.preferences),
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? []
  };
}
function normalizeReminderDays(days) {
  if (!Array.isArray(days) || days.length === 0) return [...DEFAULT_REMINDER_DAYS];
  const uniq = [...new Set(days.map((d) => Math.round(d)).filter((d) => d >= 1 && d <= 28))];
  return uniq.length > 0 ? uniq.sort((a, b) => a - b) : [...DEFAULT_REMINDER_DAYS];
}
function cronReminderRunKey(monthKey, day) {
  const window2 = Math.max(1, Math.ceil(day / INVESTMENT_REMINDER_DAYS_PER_WINDOW));
  return `${monthKey}-w${window2}`;
}
function markCronReminderSent(reminder, runKey) {
  const keys = [...reminder.lastCronReminderKeys ?? []];
  if (!keys.includes(runKey)) keys.push(runKey);
  return {
    ...reminder,
    lastCronReminderKeys: keys.slice(-36)
  };
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
    monthlyInvestmentPlan: state.monthlyInvestmentPlan ?? []
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
      monthlyInvestmentPlan: normalizeMonthlyInvestmentPlan(o.monthlyInvestmentPlan)
    };
    if (typeof o.wealthTarget === "number" && Number.isFinite(o.wealthTarget)) {
      state.wealthTarget = o.wealthTarget;
    }
    if (o.preferences && typeof o.preferences === "object") {
      state.preferences = normalizePreferences(o.preferences);
    } else {
      state.preferences = getDefaultPreferences();
    }
    return { ok: true, state: withPreferences(withFinanceStateDefaults(state)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON inv\xE1lido.";
    return { ok: false, error: `No se pudo importar: ${msg}` };
  }
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
async function pingFinanceRemote(syncId = DEFAULT_FINANCE_SYNC_ID) {
  const base = supabaseRestBase();
  const headers = supabaseHeaders();
  if (!base || !headers) {
    return { ok: false, rows: 0, error: "Supabase no configurado en el hosting." };
  }
  const res = await fetch(financeGameStateSelectUrl(base, syncId, "id,updated_at"), {
    method: "GET",
    headers,
    cache: "no-store"
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, rows: 0, error: `Supabase respondi\xF3 ${res.status}`, detail: text.slice(0, 200) };
  }
  let rows = 0;
  try {
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    rows = 0;
  }
  return { ok: true, rows };
}

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
  return fetchGoogleBcbaPrice(ticker, fetchedAt);
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

// src/lib/finance/calculations.ts
var ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});
function formatARS(value) {
  return ars.format(Number.isFinite(value) ? value : 0);
}
function getEntriesByMonth(entries, month) {
  return entries.filter((e) => e.month === month);
}
function getMonthlyInvested(entries, month) {
  return sumByType(entries, month, "investment");
}
function getTotalInvested(entries) {
  return entries.filter((e) => e.type === "investment").reduce((s, e) => s + e.amount, 0);
}
function getEmergencyFundTotal(entries, goals) {
  const fromGoals = goals.filter((g) => g.category === "emergency").reduce((s, g) => s + g.currentAmount, 0);
  const fromEntries = entries.filter((e) => e.type === "saving" && e.asset === "EMERGENCY_FUND").reduce((s, e) => s + e.amount, 0);
  return Math.max(fromGoals, fromEntries);
}
function sumByType(entries, month, type) {
  return getEntriesByMonth(entries, month).filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);
}

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
function monthLabelForMessage(monthLabel) {
  return monthLabel.trim().toLocaleLowerCase("es-AR");
}
function formatInvestmentWhatsAppMessage(params) {
  const { kind, monthLabel, invested, amountMissing, level, nextLevel, nextTitle } = params;
  const month = monthLabelForMessage(monthLabel);
  const monthlyAmount = formatARS(invested);
  const amountToNext = formatARS(amountMissing);
  const nextLevelLabel = `${nextLevel} \xB7 ${nextTitle}`;
  if (kind === "low") {
    return [
      "\u{1F7E1} *Inversi\xF3n mensual*",
      "",
      `Llev\xE1s *${monthlyAmount}* en ${month}.`,
      `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`,
      "",
      "Sum\xE1 una inversi\xF3n cuando puedas."
    ].join("\n");
  }
  if (kind === "near_level") {
    if (level <= 0) {
      return [
        "\u{1F3AF} *Est\xE1s cerca de empezar*",
        "",
        `Llev\xE1s *${monthlyAmount}* en ${month}.`,
        `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`
      ].join("\n");
    }
    return [
      "\u{1F3AF} *Est\xE1s cerca del pr\xF3ximo nivel*",
      "",
      `Llev\xE1s *${monthlyAmount}* en ${month}.`,
      `Te faltan solo *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`
    ].join("\n");
  }
  return [
    "\u{1F4CA} *Progreso de inversi\xF3n*",
    "",
    `Llev\xE1s *${monthlyAmount}* en ${month}.`,
    `Est\xE1s en el nivel *${level}*.`,
    "",
    `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`
  ].join("\n");
}
function formatInvestmentTestWhatsAppMessage(monthlyAmount) {
  return [
    "\u2705 *Prueba de inversi\xF3n*",
    "",
    `Este mes llev\xE1s *${formatARS(monthlyAmount)}*.`,
    "No hay alertas pendientes."
  ].join("\n");
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

// src/lib/finance/levels.ts
var LEVEL_THRESHOLDS = {
  L1: 15e4,
  L2: 3e5,
  L3: 45e4,
  L4: 65e4,
  L6: 85e4,
  EMERGENCY: 3e6,
  STREAK3: 4e5,
  STREAK6: 25e4
};
var TH = LEVEL_THRESHOLDS;
function addMonths(ym, delta) {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function pipeForMonth(state, month) {
  return getMonthlyInvested(state.entries, month);
}
function monthDistinctInvestmentAssets(state, month) {
  const set = /* @__PURE__ */ new Set();
  for (const e of state.entries) {
    if (e.month !== month) continue;
    if (e.type !== "investment") continue;
    const key = (e.asset ?? "OTHER").toString();
    set.add(key);
  }
  return set.size;
}
function monthInvestmentOps(state, month) {
  return state.entries.filter((e) => e.month === month && e.type === "investment").length;
}
function endingMonths(month, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addMonths(month, -i));
  }
  return out;
}
function streakMinPipe(state, endMonth, months, minPipe) {
  const keys = endingMonths(endMonth, months);
  return keys.every((m) => pipeForMonth(state, m) >= minPipe);
}
function satisfiesLevel(level, state, month) {
  const pipe = pipeForMonth(state, month);
  switch (level) {
    case 1:
      return pipe >= TH.L1;
    case 2:
      return pipe >= TH.L2;
    case 3:
      return pipe >= TH.L3;
    case 4:
      return pipe >= TH.L4;
    case 5:
      return pipe >= TH.L4 && monthDistinctInvestmentAssets(state, month) >= 2;
    case 6:
      return pipe >= TH.L6 && monthInvestmentOps(state, month) >= 2;
    case 7:
      return streakMinPipe(state, month, 3, TH.STREAK3);
    case 8:
      return getEmergencyFundTotal(state.entries, state.goals) >= TH.EMERGENCY;
    case 9:
      return streakMinPipe(state, month, 6, TH.STREAK6);
    case 10: {
      const t = state.wealthTarget;
      if (t === void 0 || !Number.isFinite(t) || t <= 0) return false;
      return getTotalInvested(state.entries) >= t;
    }
    default:
      return false;
  }
}
function highestAchievedLevel(state, month) {
  for (let L = 10; L >= 1; L--) {
    if (satisfiesLevel(L, state, month)) return L;
  }
  return 0;
}
var LEVEL_TITLES = {
  0: "Sin nivel",
  1: "Semilla",
  2: "Ritmo",
  3: "Disciplina",
  4: "Constructor",
  5: "Diversificaci\xF3n",
  6: "Dominio",
  7: "Constancia",
  8: "Colch\xF3n",
  9: "M\xE1quina",
  10: "Libertad"
};
function getGapToNextInvestmentMilestone(state, month) {
  const achieved = highestAchievedLevel(state, month);
  const pipe = pipeForMonth(state, month);
  if (achieved >= 10) return null;
  const nextL = Math.min(achieved + 1, 10);
  const nextTitle = LEVEL_TITLES[nextL] ?? `Nivel ${nextL}`;
  if (achieved === 0) {
    const missing = Math.max(0, TH.L1 - pipe);
    return { amountMissing: missing, nextLevel: 1, nextTitle: LEVEL_TITLES[1] };
  }
  if (achieved === 1) {
    return { amountMissing: Math.max(0, TH.L2 - pipe), nextLevel: 2, nextTitle: LEVEL_TITLES[2] };
  }
  if (achieved === 2) {
    return { amountMissing: Math.max(0, TH.L3 - pipe), nextLevel: 3, nextTitle: LEVEL_TITLES[3] };
  }
  if (achieved === 3) {
    return { amountMissing: Math.max(0, TH.L4 - pipe), nextLevel: 4, nextTitle: LEVEL_TITLES[4] };
  }
  if (achieved === 4) {
    if (pipe < TH.L4) {
      return { amountMissing: Math.max(0, TH.L4 - pipe), nextLevel: 4, nextTitle: LEVEL_TITLES[4] };
    }
    if (monthDistinctInvestmentAssets(state, month) < 2) {
      return {
        amountMissing: 0,
        nextLevel: 5,
        nextTitle: LEVEL_TITLES[5],
        hint: "Diversific\xE1: registr\xE1 al menos 2 activos distintos este mes."
      };
    }
    return {
      amountMissing: Math.max(0, TH.L6 - pipe),
      nextLevel: 6,
      nextTitle: LEVEL_TITLES[6],
      hint: monthInvestmentOps(state, month) < 2 ? "Hac\xE9 al menos 2 operaciones de inversi\xF3n en el mes." : void 0
    };
  }
  if (achieved === 5) {
    const missing = Math.max(0, TH.L6 - pipe);
    if (monthInvestmentOps(state, month) < 2) {
      return { amountMissing: missing, nextLevel: 6, nextTitle: LEVEL_TITLES[6], hint: "Dos operaciones en el mes." };
    }
    return { amountMissing: missing, nextLevel: 6, nextTitle: LEVEL_TITLES[6] };
  }
  return { amountMissing: 0, nextLevel: nextL, nextTitle, hint: "Segu\xED la ruta: racha o emergencia." };
}
function evaluateInvestmentWhatsAppNudge(state, month) {
  const invested = pipeForMonth(state, month);
  const level = highestAchievedLevel(state, month);
  if (invested >= TH.L3) {
    return { shouldNotify: false, reason: "sufficient", invested, level };
  }
  const gap = getGapToNextInvestmentMilestone(state, month);
  if (!gap || gap.amountMissing <= 0) {
    return { shouldNotify: false, reason: "no_volume_gap", invested, level };
  }
  const monthLabel = monthLabelEs(month);
  const nextTitle = gap.nextTitle;
  const build = (kind) => formatInvestmentWhatsAppMessage({
    kind,
    monthLabel,
    invested,
    amountMissing: gap.amountMissing,
    level,
    nextLevel: gap.nextLevel,
    nextTitle
  });
  if (invested < TH.L1) {
    return {
      shouldNotify: true,
      invested,
      level,
      nextLevel: gap.nextLevel,
      kind: "low",
      message: build("low")
    };
  }
  const thresholds = [0, TH.L1, TH.L2, TH.L3, TH.L4];
  const nextThreshold = gap.nextLevel <= 4 ? thresholds[gap.nextLevel] ?? TH.L3 : TH.L3;
  const prevThreshold = gap.nextLevel <= 4 ? thresholds[gap.nextLevel - 1] ?? 0 : TH.L2;
  const span = Math.max(1, nextThreshold - prevThreshold);
  const near = gap.amountMissing / span <= 0.2 || gap.amountMissing <= 75e3;
  if (near) {
    return {
      shouldNotify: true,
      invested,
      level,
      nextLevel: gap.nextLevel,
      kind: "near_level",
      message: build("near_level")
    };
  }
  return {
    shouldNotify: true,
    invested,
    level,
    nextLevel: gap.nextLevel,
    kind: "push",
    message: build("push")
  };
}
function monthLabelEs(ym) {
  const [ys, ms] = ym.split("-").map(Number);
  if (!Number.isFinite(ys) || !Number.isFinite(ms)) return ym;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return cap(new Date(ys, ms - 1, 1).toLocaleDateString("es-AR", { month: "long" }));
}
var LEVEL_RULES = [
  { level: 1, name: "Semilla", condition: `Inversi\xF3n del mes \u2265 ${formatARS(TH.L1)}` },
  { level: 2, name: "Ritmo", condition: `Inversi\xF3n del mes \u2265 ${formatARS(TH.L2)}` },
  { level: 3, name: "Disciplina", condition: `Inversi\xF3n del mes \u2265 ${formatARS(TH.L3)}` },
  { level: 4, name: "Constructor", condition: `Inversi\xF3n del mes \u2265 ${formatARS(TH.L4)}` },
  {
    level: 5,
    name: "Diversificaci\xF3n",
    condition: `\u2265 ${formatARS(TH.L4)} en el mes y al menos 2 activos distintos`
  },
  {
    level: 6,
    name: "Dominio",
    condition: `Inversi\xF3n del mes \u2265 ${formatARS(TH.L6)} y m\xE1s de una operaci\xF3n`
  },
  {
    level: 7,
    name: "Constancia",
    condition: `Tres meses seguidos con inversi\xF3n \u2265 ${formatARS(TH.STREAK3)}`
  },
  {
    level: 8,
    name: "Colch\xF3n",
    condition: `Fondo de emergencia \u2265 ${formatARS(TH.EMERGENCY)}`
  },
  {
    level: 9,
    name: "M\xE1quina",
    condition: `Seis meses seguidos con inversi\xF3n \u2265 ${formatARS(TH.STREAK6)}`
  },
  {
    level: 10,
    name: "Libertad",
    condition: "Suma de inversiones registradas \u2265 meta configurada"
  }
];

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
function getTrackedTickersFromEntries(entries) {
  const byTicker = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (entry.type !== "investment") continue;
    const ticker = getEntryTicker(entry);
    if (!ticker) continue;
    const prev = byTicker.get(ticker);
    if (!prev || entry.createdAt > prev) {
      byTicker.set(ticker, entry.createdAt);
    }
  }
  return [...byTicker.entries()].sort((a, b) => a[1] < b[1] ? 1 : -1).map(([ticker]) => ticker);
}
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
function currenciesMatch(a, b) {
  if (!a || !b) return false;
  return a.toUpperCase() === b.toUpperCase();
}
function buildMarketAlerts(params) {
  const {
    entries,
    prices,
    minDailyDropPercent = DEFAULT_MIN_DAILY_DROP,
    minGainSinceBuyPercent = DEFAULT_MIN_GAIN_SINCE_BUY,
    minLossSinceBuyPercent = DEFAULT_MIN_LOSS_SINCE_BUY
  } = params;
  const tickers = getTrackedTickersFromEntries(entries);
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
    const lastBuy = getLastBuyEntryForTicker(entries, ticker);
    const buyPrice = lastBuy?.buyPrice;
    const buyCurrency = lastBuy?.buyCurrency;
    if (lastBuy && typeof buyPrice === "number" && buyPrice > 0 && typeof currentPrice === "number" && currentPrice > 0 && currenciesMatch(buyCurrency, currentCurrency)) {
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

// src/lib/finance/timezone.ts
var TZ = "America/Argentina/Buenos_Aires";
function getArgentinaDateParts(date = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return { year, month, day, monthKey };
}

// src/lib/finance/whatsappJobs.ts
function actionableMarketAlerts(alerts) {
  return alerts.filter((a) => a.kind !== "neutral");
}
function resolveCallMeBotApiKey(reminder) {
  return reminder?.callMeBotApiKey?.trim() || process.env.CALLMEBOT_API_KEY?.trim() || process.env.FINANCE_CALLMEBOT_API_KEY?.trim() || "";
}
async function runInvestmentReminderJob(state, phone, apiKey, options = {}) {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const { day, monthKey } = getArgentinaDateParts();
  const runKey = cronReminderRunKey(monthKey, day);
  const force = Boolean(options.force);
  const persist = options.persist !== false;
  if (!force && !reminder.enabled) {
    return { result: { ok: true, action: "skipped", skipReason: "reminders_disabled" } };
  }
  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  if (!force && !nudge.shouldNotify) {
    return {
      result: {
        ok: true,
        action: "skipped",
        skipReason: "investment_sufficient",
        invested: nudge.invested,
        detail: nudge.reason
      }
    };
  }
  if (!force && reminder.lastCronReminderKeys?.includes(runKey)) {
    return {
      result: {
        ok: true,
        action: "skipped",
        skipReason: "already_sent",
        invested: nudge.invested,
        detail: runKey
      }
    };
  }
  const message = nudge.shouldNotify ? nudge.message : formatInvestmentTestWhatsAppMessage(nudge.invested);
  const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
  if (!send.ok) {
    return {
      result: {
        ok: false,
        action: "error",
        invested: nudge.invested,
        detail: send.detail,
        error: "CallMeBot rejected the investment reminder"
      }
    };
  }
  return {
    result: {
      ok: true,
      action: "sent",
      invested: nudge.invested,
      detail: send.detail,
      fingerprints: [runKey]
    },
    nextReminder: persist && !force ? markCronReminderSent(reminder, runKey) : void 0
  };
}
async function runMarketAlertJob(state, phone, apiKey, options = {}) {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const force = Boolean(options.force);
  const persist = options.persist !== false;
  if (!force && !reminder.marketWhatsAppEnabled) {
    return { result: { ok: true, action: "skipped", skipReason: "market_disabled" } };
  }
  const tickers = getTrackedTickersFromEntries(state.entries);
  if (tickers.length === 0) {
    return { result: { ok: true, action: "skipped", skipReason: "no_tickers" } };
  }
  const pricesResponse = await buildFinancePricesResponse(tickers.join(","));
  if (!pricesResponse.ok) {
    return {
      result: {
        ok: true,
        action: "skipped",
        skipReason: "prices_unavailable",
        detail: pricesResponse.error
      }
    };
  }
  const alerts = actionableMarketAlerts(
    buildMarketAlerts({ entries: state.entries, prices: pricesResponse.prices })
  );
  const activeFingerprints = alerts.map(marketAlertFingerprint);
  const sentSet = new Set(reminder.lastMarketAlertKeys ?? []);
  const fresh = force ? alerts : alerts.filter((alert) => !sentSet.has(marketAlertFingerprint(alert)));
  if (fresh.length === 0) {
    if (force) {
      const message2 = formatMarketTestEmptyWhatsAppMessage();
      const send2 = await sendCallMeBotWhatsAppServer(phone, message2, apiKey);
      if (!send2.ok) {
        return {
          result: {
            ok: false,
            action: "error",
            detail: send2.detail,
            error: "CallMeBot rejected the market alert"
          }
        };
      }
      return { result: { ok: true, action: "sent", detail: send2.detail } };
    }
    const pruned = markMarketAlertsSent(reminder, [], activeFingerprints);
    const changed = JSON.stringify(pruned.lastMarketAlertKeys ?? []) !== JSON.stringify(reminder.lastMarketAlertKeys ?? []);
    return {
      result: { ok: true, action: "skipped", skipReason: alerts.length ? "already_sent" : "no_alerts" },
      nextReminder: changed ? pruned : void 0
    };
  }
  const message = formatMarketWhatsAppMessage(fresh);
  const send = await sendCallMeBotWhatsAppServer(phone, message, apiKey);
  if (!send.ok) {
    return {
      result: {
        ok: false,
        action: "error",
        detail: send.detail,
        fingerprints: fresh.map(marketAlertFingerprint),
        error: "CallMeBot rejected the market alert"
      }
    };
  }
  const freshKeys = fresh.map(marketAlertFingerprint);
  return {
    result: {
      ok: true,
      action: "sent",
      detail: send.detail,
      fingerprints: freshKeys
    },
    nextReminder: persist && !force ? markMarketAlertsSent(reminder, freshKeys, activeFingerprints) : void 0
  };
}
async function runFinanceWhatsAppJobs(syncId = DEFAULT_FINANCE_SYNC_ID, options = {}) {
  if (!isFinanceRemoteConfigured()) {
    const skipped = {
      ok: true,
      action: "skipped",
      skipReason: "supabase_not_configured"
    };
    return { ok: true, reminder: skipped, market: skipped };
  }
  let state;
  try {
    state = await fetchFinanceStateRemote(syncId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    const err = { ok: false, action: "error", error: msg };
    return { ok: false, reminder: err, market: err };
  }
  if (!state) {
    const skipped = { ok: true, action: "skipped", skipReason: "no_remote_state" };
    return { ok: true, reminder: skipped, market: skipped };
  }
  const prefs = normalizePreferences(state.preferences);
  let reminder = prefs.reminder;
  const phone = resolveWhatsAppPhone();
  const apiKey = resolveCallMeBotApiKey(reminder);
  const only = options.only ?? "both";
  const runInvestment = only === "both" || only === "investment";
  const runMarket = only === "both" || only === "market";
  if (!phone) {
    const skipped = { ok: true, action: "skipped", skipReason: "no_phone" };
    return { ok: true, reminder: skipped, market: skipped };
  }
  if (!apiKey) {
    const skipped = { ok: true, action: "skipped", skipReason: "no_api_key" };
    return { ok: true, reminder: skipped, market: skipped };
  }
  const skippedIdle = { ok: true, action: "skipped", skipReason: "reminders_disabled" };
  const investment = runInvestment ? await runInvestmentReminderJob(state, phone, apiKey, options) : { result: skippedIdle };
  if (investment.nextReminder) reminder = investment.nextReminder;
  const marketState = {
    ...state,
    preferences: { ...prefs, reminder }
  };
  const market = runMarket ? await runMarketAlertJob(marketState, phone, apiKey, options) : { result: { ok: true, action: "skipped", skipReason: "market_disabled" } };
  if (market.nextReminder) reminder = market.nextReminder;
  const shouldPersist = options.persist !== false && Boolean(investment.nextReminder || market.nextReminder);
  if (shouldPersist) {
    const nextState = {
      ...state,
      preferences: { ...prefs, reminder }
    };
    try {
      await upsertFinanceStateRemote(syncId, nextState);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upsert failed";
      const persistError = (job) => job.action === "sent" ? { ...job, ok: false, action: "error", error: `Sent but failed to save state: ${msg}` } : job;
      return {
        ok: false,
        reminder: persistError(investment.result),
        market: persistError(market.result)
      };
    }
  }
  return {
    ok: investment.result.ok && market.result.ok,
    reminder: investment.result,
    market: market.result
  };
}

// api/finance-keepalive.entry.ts
function headerValue(headers, name) {
  if (!headers) return "";
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}
function queryValue(req, name) {
  const fromQuery = req.query?.[name];
  if (typeof fromQuery === "string") return fromQuery;
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === "string") return fromQuery[0];
  if (typeof req.url === "string") {
    try {
      const u = new URL(req.url, "http://localhost");
      return u.searchParams.get(name) ?? "";
    } catch {
      return "";
    }
  }
  return "";
}
function isVercelCron(req) {
  return headerValue(req.headers, "x-vercel-cron") === "1";
}
function parseWhatsAppKind(raw) {
  if (raw === "investment" || raw === "market") return raw;
  return "both";
}
function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}
async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }
    const pingedAt = (/* @__PURE__ */ new Date()).toISOString();
    const ping = await pingFinanceRemote(DEFAULT_FINANCE_SYNC_ID);
    if (!ping.ok) {
      return json(res, 503, {
        ok: false,
        pingedAt,
        ping
      });
    }
    const cron = isVercelCron(req);
    const isTest = queryValue(req, "whatsapp") === "test";
    if (!cron && !isTest) {
      return json(res, 200, {
        ok: true,
        pingedAt,
        ping: { rows: ping.rows },
        whatsapp: { ran: false, reason: "not_cron" }
      });
    }
    const kind = parseWhatsAppKind(queryValue(req, "kind"));
    const whatsapp = await runFinanceWhatsAppJobs(DEFAULT_FINANCE_SYNC_ID, {
      force: isTest,
      persist: !isTest,
      only: isTest ? kind : "both"
    });
    return json(res, 200, {
      ok: ping.ok && whatsapp.ok,
      pingedAt,
      ping: { rows: ping.rows },
      whatsapp: { ran: true, mode: isTest ? "test" : "cron", kind, ...whatsapp }
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
