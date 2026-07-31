import type { FinanceSymbolSearchResult } from '@/lib/finance/portfolio/types';

export async function searchFinanceSymbolsClient(
  q: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<{ ok: boolean; results: FinanceSymbolSearchResult[]; error?: string }> {
  const query = q.trim();
  if (query.length < 2) return { ok: true, results: [] };

  const params = new URLSearchParams({
    q: query,
    limit: String(opts?.limit ?? 8),
  });

  try {
    const res = await fetch(`/api/finance-symbol-search?${params}`, {
      headers: { Accept: 'application/json' },
      signal: opts?.signal,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      results?: FinanceSymbolSearchResult[];
      error?: string;
    } | null;

    if (!res.ok || !body) {
      return {
        ok: false,
        results: [],
        error: body?.error || 'No se pudo buscar símbolos.',
      };
    }
    return {
      ok: Boolean(body.ok),
      results: Array.isArray(body.results) ? body.results : [],
      error: body.error,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, results: [], error: 'aborted' };
    }
    return {
      ok: false,
      results: [],
      error: e instanceof Error ? e.message : 'Error de red',
    };
  }
}
