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

// src/lib/finance/accountAccess.ts
function financeStateIdFromAppMetadata(appMetadata) {
  if (!appMetadata || typeof appMetadata !== "object") return "";
  const value = appMetadata.finance_state_id;
  return typeof value === "string" ? value.trim() : "";
}

// src/lib/finance/server/financeIdentity.ts
function readRequestHeader(headers, name) {
  if (!headers) return "";
  const lower = name.toLowerCase();
  const raw = headers[lower] ?? headers[name];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}
function readBearerToken(authorization) {
  if (!authorization) return "";
  const match = authorization.match(/^Bearer\s+(\S+)/i);
  return match?.[1]?.trim() ?? "";
}
function readServerEnv(name) {
  if (typeof window !== "undefined") return "";
  const fromProcess = (process.env[name] ?? "").trim();
  if (fromProcess) return fromProcess;
  const viteEnv = import.meta.env;
  const fromImport = String(viteEnv?.[name] ?? "").trim();
  if (fromImport) process.env[name] = fromImport;
  return fromImport;
}
function financeServiceConfig() {
  if (typeof window !== "undefined") return null;
  const url = (readServerEnv("SUPABASE_URL") || readServerEnv("PUBLIC_FINANCE_SUPABASE_URL") || readServerEnv("FINANCE_SUPABASE_URL")).replace(/\/$/, "");
  const key = readServerEnv("SUPABASE_SERVICE_ROLE_KEY") || readServerEnv("FINANCE_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return { url, key };
}
function serviceRoleHeaders(key, extra) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...extra
  };
}
async function resolveFinanceIdentity(authorizationHeader) {
  const token = readBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: "Ten\xE9s que iniciar sesi\xF3n.", code: "unauthorized" };
  }
  const config = financeServiceConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      error: "Supabase no est\xE1 configurado en el servidor.",
      code: "supabase_not_configured"
    };
  }
  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  if (userResponse.status === 401 || userResponse.status === 403) {
    return { ok: false, status: 401, error: "La sesi\xF3n no es v\xE1lida.", code: "unauthorized" };
  }
  if (!userResponse.ok) {
    return {
      ok: false,
      status: 502,
      error: "No se pudo verificar la sesi\xF3n.",
      code: "auth_unavailable"
    };
  }
  const user = await userResponse.json();
  if (!user.id || typeof user.id !== "string") {
    return { ok: false, status: 401, error: "La sesi\xF3n no es v\xE1lida.", code: "unauthorized" };
  }
  const linkedStateId = financeStateIdFromAppMetadata(user.app_metadata);
  if (linkedStateId) {
    return {
      ok: true,
      identity: { userId: user.id, email: user.email || "", stateId: linkedStateId }
    };
  }
  const profileUrl = `${config.url}/rest/v1/finance_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=state_id,email&limit=1`;
  const profileResponse = await fetch(profileUrl, {
    method: "GET",
    headers: serviceRoleHeaders(config.key),
    cache: "no-store"
  });
  if (!profileResponse.ok) {
    return {
      ok: false,
      status: 502,
      error: "No se pudo consultar la cuenta.",
      code: "auth_unavailable"
    };
  }
  const profiles = await profileResponse.json();
  const stateId = profiles?.[0]?.state_id?.trim();
  if (!stateId) {
    return {
      ok: false,
      status: 403,
      error: "Esta cuenta todav\xEDa no tiene un libro vinculado.",
      code: "profile_missing"
    };
  }
  return {
    ok: true,
    identity: {
      userId: user.id,
      email: profiles[0]?.email || user.email || "",
      stateId
    }
  };
}

// src/lib/finance/server/financeCloudHandler.ts
function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Authorization");
  return res.status(status).json(body);
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
function stateUrl(restBase, stateId) {
  return financeGameStateSelectUrl(restBase, stateId);
}
async function handler(req, res) {
  try {
    const access = await resolveFinanceIdentity(readRequestHeader(req.headers, "authorization"));
    if (!access.ok) {
      return json(res, access.status, { ok: false, error: access.error, code: access.code });
    }
    const config = financeServiceConfig();
    if (!config) {
      return json(res, 503, { ok: false, error: "Supabase no est\xE1 configurado en el servidor." });
    }
    const readUrl = stateUrl(`${config.url}/rest/v1`, access.identity.stateId);
    const headers = serviceRoleHeaders(config.key);
    if (req.method === "GET" || req.method === "HEAD") {
      const upstream = await fetch(readUrl, { method: "GET", headers, cache: "no-store" });
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(res, 502, {
          ok: false,
          error: `Supabase lectura ${upstream.status}`,
          detail: text.slice(0, 200)
        });
      }
      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        return json(res, 502, { ok: false, error: "Respuesta inv\xE1lida de Supabase." });
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return json(res, 409, {
          ok: false,
          code: "book_missing",
          error: "Esta cuenta no tiene un libro financiero."
        });
      }
      return json(res, 200, {
        ok: true,
        row: { body: rows[0].body, updated_at: rows[0].updated_at }
      });
    }
    if (req.method === "POST") {
      const payload = await readBody(req);
      if (!payload || typeof payload.state !== "object" || payload.state === null) {
        return json(res, 400, { ok: false, error: "Body inv\xE1lido: se espera { state }." });
      }
      if (typeof payload.expectedUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(payload.expectedUpdatedAt)) {
        return json(res, 409, {
          ok: false,
          error: "Actualiz\xE1 la aplicaci\xF3n y consult\xE1 el historial antes de guardar."
        });
      }
      const patchUrl = `${readUrl.replace("&limit=1", "")}&updated_at=eq.${encodeURIComponent(payload.expectedUpdatedAt)}`;
      const upstream = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({ body: payload.state }),
        cache: "no-store"
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(res, 502, {
          ok: false,
          error: `Supabase guardado ${upstream.status}`,
          detail: text.slice(0, 200)
        });
      }
      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        return json(res, 502, { ok: false, error: "Guardado sin confirmaci\xF3n v\xE1lida de Supabase." });
      }
      if (!rows?.length) {
        return json(res, 409, {
          ok: false,
          error: "El historial cambi\xF3 en otro dispositivo. Recarg\xE1 antes de guardar."
        });
      }
      return json(res, 200, {
        ok: true,
        updated_at: rows[0]?.updated_at || (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return json(res, 405, { ok: false, error: "Method not allowed" });
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
