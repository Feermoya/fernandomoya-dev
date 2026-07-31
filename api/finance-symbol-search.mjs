// src/lib/finance/portfolio/symbolSearch.ts
var FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; FocoFinanciero/1.0; +https://www.fermoyadev.com.ar)"
};
function mapQuote(q) {
  const symbol = (q.symbol ?? "").trim().toUpperCase();
  if (!symbol) return null;
  const name = (q.longname || q.shortname || symbol).trim();
  return {
    symbol,
    name,
    exchange: q.exchDisp || q.exchange,
    type: q.typeDisp || q.quoteType,
    currency: q.currency,
    market: q.exchange
  };
}
async function searchFinanceSymbols(query, opts) {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, results: [] };
  }
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 8);
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", q);
  url.searchParams.set("quotesCount", String(limit));
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("listsCount", "0");
  url.searchParams.set("enableFuzzyQuery", "false");
  try {
    const res = await fetch(url.toString(), {
      headers: FETCH_HEADERS,
      signal: opts?.signal,
      redirect: "follow"
    });
    if (!res.ok) {
      return {
        ok: false,
        results: [],
        error: res.status === 429 ? "Demasiadas consultas. Prob\xE1 en unos segundos." : `HTTP ${res.status}`
      };
    }
    const data = await res.json();
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const quote of data.quotes ?? []) {
      const mapped = mapQuote(quote);
      if (!mapped || seen.has(mapped.symbol)) continue;
      seen.add(mapped.symbol);
      results.push(mapped);
      if (results.length >= limit) break;
    }
    return { ok: true, results };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, results: [], error: "aborted" };
    }
    return {
      ok: false,
      results: [],
      error: e instanceof Error ? e.message : "Error de b\xFAsqueda"
    };
  }
}

// api/finance-symbol-search.entry.ts
async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(405).json({ ok: false, error: "Method not allowed", results: [] });
    }
    const q = typeof req.query?.q === "string" ? req.query.q : "";
    const limitRaw = typeof req.query?.limit === "string" ? Number(req.query.limit) : 8;
    const limit = Number.isFinite(limitRaw) ? limitRaw : 8;
    const body = await searchFinanceSymbols(q, { limit });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    return res.status(body.ok ? 200 : 502).json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ ok: false, results: [], error: message });
  }
}
export {
  handler as default
};
