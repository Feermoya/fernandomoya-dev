import {
  buildFinancePricesResponse,
  FINANCE_PRICES_CACHE_HEADERS,
} from '../src/lib/finance/financePricesServer.ts';

export default async function handler(
  req: { method?: string; query?: { tickers?: string } },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader: (key: string, value: string) => void;
  },
) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const raw = typeof req.query?.tickers === 'string' ? req.query.tickers : '';
  const body = await buildFinancePricesResponse(raw);

  Object.entries(FINANCE_PRICES_CACHE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const status = body.error === 'Parámetro tickers vacío' ? 400 : 200;
  return res.status(status).json(body);
}
