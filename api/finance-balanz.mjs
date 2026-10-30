// src/lib/panel/auth.ts
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
var PANEL_SESSION_COOKIE = "fm_panel_session";
function readServerEnv(name) {
  const fromProcess = typeof process !== "undefined" ? (process.env[name] ?? "").trim() : "";
  if (fromProcess) return fromProcess;
  const viteEnv = import.meta.env;
  const fromImport = String(viteEnv?.[name] ?? "").trim();
  if (fromImport && typeof process !== "undefined") {
    process.env[name] = fromImport;
  }
  return fromImport;
}
function getPanelAccessSecret() {
  return readServerEnv("PANEL_ACCESS_SECRET");
}
function getPanelSessionSecret() {
  const dedicated = readServerEnv("PANEL_SESSION_SECRET");
  if (dedicated) return dedicated;
  const access = getPanelAccessSecret();
  if (!access) return "";
  return createHash("sha256").update(`panel-session:${access}`).digest("hex");
}
function verifyPanelSessionToken(token) {
  if (!token) return false;
  const secret = getPanelSessionSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (raw.v !== 1 || typeof raw.iat !== "number") return false;
    const maxAgeMs = 14 * 24 * 60 * 60 * 1e3;
    if (Date.now() - raw.iat > maxAgeMs) return false;
    return true;
  } catch {
    return false;
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

// src/lib/finance/importers/balanz/types.ts
function balanzKey(o) {
  return `balanz:${o.ticketId}:${o.ticker}:${o.operationType}`;
}

// src/lib/finance/importers/balanz/mapBalanzToFinanceEntry.ts
function mapBalanzToFinanceEntry(o, importedAt) {
  return {
    id: balanzKey(o),
    type: o.operationType === "BUY" ? "investment" : "investment_sale",
    month: o.tradeDate.slice(0, 7),
    createdAt: `${o.tradeDate}T15:00:00.000Z`,
    amount: Math.abs(o.netAmount ?? o.grossAmount),
    amountCurrency: o.currency,
    platform: "Balanz",
    ticker: o.ticker,
    category: o.ticker,
    buyPrice: o.unitPrice,
    buyCurrency: o.currency,
    estimatedUnits: o.quantity,
    note: `${o.operationType === "BUY" ? "Compra" : "Venta"} \xB7 Boleto ${o.ticketId}`,
    importedSource: {
      provider: "balanz",
      externalId: balanzKey(o),
      importedAt,
      tradeDate: o.tradeDate,
      settlementDate: o.settlementDate,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      currency: o.currency,
      operation: o.operationType,
      grossAmount: o.grossAmount,
      netAmount: o.netAmount,
      fees: o.fees
    }
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

// src/lib/finance/importers/balanz/normalizeBalanzOperation.ts
function validOperation(o) {
  return !!o && o.source === "balanz" && /^\d{1,30}$/.test(o.ticketId) && /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(o.ticker) && ["BUY", "SELL"].includes(o.operationType) && ["ARS", "USD"].includes(o.currency) && /^\d{4}-\d{2}-\d{2}$/.test(o.tradeDate) && Number.isFinite(Date.parse(o.tradeDate)) && (/* @__PURE__ */ new Date(`${o.tradeDate}T12:00:00Z`)).toISOString().slice(0, 10) === o.tradeDate && (o.settlementDate === void 0 || /^\d{4}-\d{2}-\d{2}$/.test(o.settlementDate) && Number.isFinite(Date.parse(o.settlementDate)) && o.settlementDate >= o.tradeDate) && [o.quantity, o.unitPrice, o.grossAmount].every((n) => Number.isFinite(n) && n > 0) && Math.abs(o.quantity * o.unitPrice - o.grossAmount) <= Math.max(0.02, o.grossAmount * 1e-8) && (o.netAmount === void 0 || Number.isFinite(o.netAmount) && (o.operationType === "BUY" ? o.netAmount < 0 : o.netAmount > 0)) && typeof o.rawDescription === "string" && o.rawDescription.length <= 1e3;
}

// src/lib/finance/importers/balanz/reconcileBalanzOperations.ts
var close = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
function reconcileBalanzOperations(operations, entries) {
  const results = operations.map((operation) => {
    if (!validOperation(operation)) return { operation, status: "INVALID", reason: "Datos incompletos o inconsistentes." };
    const exact = entries.find((e) => e.importedSource?.externalId === balanzKey(operation) && e.importedSource.provider === "balanz");
    if (exact) return { operation, status: "ALREADY_IMPORTED", matchedEntryId: exact.id, reason: "Este boleto ya fue importado." };
    const candidates = entries.filter((e) => {
      if (e.importedSource || e.type !== "investment" && e.type !== "investment_sale") return false;
      if (getEntryTicker(e) !== operation.ticker) return false;
      if ((e.type === "investment_sale" ? "SELL" : "BUY") !== operation.operationType) return false;
      const date = new Date(e.createdAt);
      const day = Number.isFinite(+date) ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) : "";
      const grouped = (e.amountCurrency ?? "ARS") === operation.currency && e.estimatedUnits !== void 0 && e.estimatedUnits > operation.quantity && e.amount >= operation.grossAmount;
      return e.month === operation.tradeDate.slice(0, 7) && (day === operation.tradeDate || !day || grouped);
    });
    const strong = candidates.filter((e) => {
      if ((e.amountCurrency ?? "ARS") !== operation.currency) return false;
      const amountMatches = [operation.grossAmount, Math.abs(operation.netAmount ?? operation.grossAmount)].some((a) => close(e.amount, a, Math.max(1, a * 0.01)));
      const units = e.estimatedUnits;
      const price = e.buyPrice;
      return amountMatches && units !== void 0 && close(units, operation.quantity, Math.max(1e-8, operation.quantity * 1e-8)) && price !== void 0 && (e.buyCurrency ?? "ARS") === operation.currency && close(price, operation.unitPrice, Math.max(0.01, operation.unitPrice * 5e-3));
    });
    if (strong.length === 1) return { operation, status: "MATCHED_MANUAL", matchedEntryId: strong[0].id, candidates: strong, reason: "Coinciden fecha, ticker, moneda, nominales, monto (hasta 1%) y precio (hasta 0,5%)." };
    if (candidates.length) return { operation, status: "REVIEW", candidates, reason: "Hay registros manuales compatibles. Revis\xE1 si son compras agrupadas o una operaci\xF3n distinta." };
    return { operation, status: "NEW", reason: "No se encontr\xF3 una operaci\xF3n compatible." };
  });
  for (const r of results) if (r.status === "MATCHED_MANUAL" && results.filter((x) => x.matchedEntryId === r.matchedEntryId).length > 1) {
    r.status = "REVIEW";
    r.reason = "Varios boletos coinciden con un registro manual. Requiere revisi\xF3n.";
  }
  return results;
}

// src/lib/finance/importers/balanz/importBatch.ts
function buildBalanzImportBatch(state, operations, selections, now) {
  if (!Array.isArray(operations) || !operations.length || operations.length > 500 || !Array.isArray(selections)) throw new Error("Lote inv\xE1lido.");
  if (new Set(operations.map(balanzKey)).size !== operations.length || new Set(selections.map((s) => s.key)).size !== selections.length) throw new Error("El lote contiene boletos o selecciones repetidos.");
  const reconciliation = reconcileBalanzOperations(operations, state.entries);
  if (selections.some((s) => !operations.some((o) => balanzKey(o) === s.key))) throw new Error("Selecci\xF3n desconocida.");
  const selected = new Map(selections.map((s) => [s.key, s]));
  const accepted = reconciliation.filter((r) => {
    const choice = selected.get(balanzKey(r.operation));
    if (!choice) return false;
    if (r.status === "INVALID") throw new Error("La selecci\xF3n contiene operaciones inv\xE1lidas.");
    if (r.status === "ALREADY_IMPORTED" || r.status === "MATCHED_MANUAL") return false;
    if (r.status === "REVIEW" && choice.distinctReviewed !== true) throw new Error("Hay operaciones que requieren revisi\xF3n.");
    return true;
  });
  const added = accepted.map((r) => mapBalanzToFinanceEntry(r.operation, now));
  if (added.some((e) => state.entries.some((old) => old.id === e.id))) throw new Error("Identificador existente. Revis\xE1 el historial.");
  return {
    state: { ...state, entries: [...state.entries, ...added] },
    added,
    reconciliation,
    omitted: reconciliation.filter((r) => r.status === "ALREADY_IMPORTED" || r.status === "MATCHED_MANUAL").length
  };
}

// scripts/finance-api/finance-balanz.entry.ts
var BOOK = "fernando-foco-financiero-main";
function headerValue(headers, name) {
  if (!headers) return "";
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}
async function readBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
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
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
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
  const send = (code, data) => {
    res.setHeader("Cache-Control", "no-store");
    return res.status(code).json(data);
  };
  try {
    const cookies = headerValue(req.headers, "cookie").split(";").map((s) => s.trim());
    const token = cookies.find((s) => s.startsWith(`${PANEL_SESSION_COOKIE}=`))?.slice(PANEL_SESSION_COOKIE.length + 1);
    if (!verifyPanelSessionToken(token)) {
      return send(401, { ok: false, error: "Ingres\xE1 al panel para importar." });
    }
    if (req.method !== "POST") {
      return send(405, { ok: false, error: "M\xE9todo no permitido." });
    }
    if (headerValue(req.headers, "sec-fetch-site") === "cross-site") {
      return send(403, { ok: false, error: "Origen no permitido." });
    }
    if (process.env.FINANCE_BALANZ_IMPORT_ENABLED !== "true") {
      return send(503, {
        ok: false,
        error: "Importaci\xF3n pendiente de verificaci\xF3n del respaldo y habilitaci\xF3n."
      });
    }
    const payload = await readBody(req);
    if (!payload || typeof payload.expectedUpdatedAt !== "string" || JSON.stringify(payload).length > 8e5) {
      return send(400, { ok: false, error: "Lote o versi\xF3n inv\xE1lidos." });
    }
    const url = (process.env.FINANCE_SUPABASE_URL || process.env.PUBLIC_FINANCE_SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY || process.env.FINANCE_SUPABASE_ANON_KEY || process.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return send(503, { ok: false, error: "Supabase no configurado." });
    }
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    };
    const readUrl = financeGameStateSelectUrl(`${url}/rest/v1`, BOOK);
    const response = await fetch(readUrl, { headers, cache: "no-store" });
    if (!response.ok) {
      return send(502, { ok: false, error: "No se pudo consultar Supabase." });
    }
    const rows = await response.json();
    const row = rows?.[0];
    if (!row || !Array.isArray(row.body?.entries) || typeof row.updated_at !== "string") {
      return send(409, {
        ok: false,
        error: "Historial remoto ausente o inv\xE1lido. No se escribi\xF3 nada."
      });
    }
    if (row.updated_at !== payload.expectedUpdatedAt) {
      return send(409, {
        ok: false,
        error: "El historial cambi\xF3. Actualiz\xE1 la revisi\xF3n antes de importar."
      });
    }
    let batch;
    try {
      batch = buildBalanzImportBatch(
        row.body,
        payload.operations,
        payload.selections,
        (/* @__PURE__ */ new Date()).toISOString()
      );
    } catch (e) {
      return send(400, {
        ok: false,
        error: e instanceof Error ? e.message : "Lote inv\xE1lido."
      });
    }
    if (!batch.added.length) {
      return send(200, { ok: true, row, added: [], omitted: batch.omitted });
    }
    const patchUrl = `${readUrl.replace("&limit=1", "")}&updated_at=eq.${encodeURIComponent(row.updated_at)}`;
    const saved = await fetch(patchUrl, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ body: batch.state })
    });
    if (!saved.ok) {
      return send(502, {
        ok: false,
        error: "Supabase rechaz\xF3 el guardado. No se confirm\xF3 la importaci\xF3n."
      });
    }
    const written = await saved.json();
    if (!written?.length) {
      return send(409, {
        ok: false,
        error: "Otra escritura cambi\xF3 el historial. Volv\xE9 a revisar."
      });
    }
    return send(200, {
      ok: true,
      row: written[0],
      added: batch.added,
      omitted: batch.omitted
    });
  } catch (e) {
    console.error("[finance-balanz]", e);
    return send(500, {
      ok: false,
      error: "No se pudo completar la importaci\xF3n. Consult\xE1 el historial antes de reintentar."
    });
  }
}
export {
  handler as default
};
