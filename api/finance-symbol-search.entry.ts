import { searchFinanceSymbols } from '../src/lib/finance/portfolio/symbolSearch';

type Req = { method?: string; query?: { q?: string; limit?: string } };
type Res = {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (key: string, value: string) => void;
};

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(405).json({ ok: false, error: 'Method not allowed', results: [] });
    }

    const q = typeof req.query?.q === 'string' ? req.query.q : '';
    const limitRaw = typeof req.query?.limit === 'string' ? Number(req.query.limit) : 8;
    const limit = Number.isFinite(limitRaw) ? limitRaw : 8;

    const body = await searchFinanceSymbols(q, { limit });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(body.ok ? 200 : 502).json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).json({ ok: false, results: [], error: message });
  }
}
