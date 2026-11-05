// src/lib/finance/storage.ts
var DEFAULT_FINANCE_SYNC_ID = "fernando-foco-financiero-main";

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

// scripts/finance-api/finance-keepalive.entry.ts
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
    return json(res, 200, {
      ok: true,
      pingedAt,
      ping: { rows: ping.rows }
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
