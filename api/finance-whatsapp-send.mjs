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

// api/finance-whatsapp-send.entry.ts
function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}
function resolveApiKey(reminder) {
  return reminder?.callMeBotApiKey?.trim() || process.env.CALLMEBOT_API_KEY?.trim() || process.env.FINANCE_CALLMEBOT_API_KEY?.trim() || "";
}
async function readBody(req) {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  if (typeof req.on === "function") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}
async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }
    if (!isFinanceRemoteConfigured()) {
      return json(res, 503, { ok: false, error: "Supabase no configurado" });
    }
    const body = await readBody(req);
    const texts = [
      ...typeof body?.text === "string" && body.text.trim() ? [body.text.trim()] : [],
      ...Array.isArray(body?.texts) ? body.texts.filter((t) => typeof t === "string" && t.trim().length > 0) : []
    ];
    if (texts.length === 0) {
      return json(res, 400, { ok: false, error: "Falta text o texts" });
    }
    if (texts.length > 3) {
      return json(res, 400, { ok: false, error: "M\xE1ximo 3 mensajes por pedido" });
    }
    const state = await fetchFinanceStateRemote(DEFAULT_FINANCE_SYNC_ID);
    if (!state) {
      return json(res, 404, { ok: false, error: "Sin estado remoto" });
    }
    const reminder = normalizePreferences(state.preferences).reminder;
    const phone = resolveWhatsAppPhone();
    const apiKey = resolveApiKey(reminder);
    if (!phone || !apiKey) {
      return json(res, 400, {
        ok: false,
        error: "Falta tel\xE9fono o API key CallMeBot en preferencias"
      });
    }
    const results = [];
    for (let i = 0; i < texts.length; i += 1) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      results.push(await sendCallMeBotWhatsAppServer(phone, texts[i], apiKey));
    }
    const ok = results.every((r) => r.ok);
    return json(res, 200, {
      ok,
      sent: results.filter((r) => r.ok).length,
      results,
      note: "CallMeBot gratis puede demorar minutos en entregar aunque el pedido se acepte."
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
