import { searchBinanceCrypto } from '../../src/lib/finance/binanceMarket';
import {
  buildFinancePricesResponse,
  FINANCE_PRICES_CACHE_HEADERS,
} from '../../src/lib/finance/financePricesServer';

type Req = { method?: string; query?: { tickers?: string; cryptoSearch?: string } };
type Res = {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (key: string, value: string) => void;
};

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (typeof req.query?.cryptoSearch === 'string') {
      const results = await searchBinanceCrypto(req.query.cryptoSearch, 9);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ ok: true, results });
    }

    const raw = typeof req.query?.tickers === 'string' ? req.query.tickers : '';
    const body = await buildFinancePricesResponse(raw);

    Object.entries(FINANCE_PRICES_CACHE_HEADERS).forEach(([k, v]) => {
      res.setHeader(k, v);
    });

    const status = body.error === 'Parámetro tickers vacío' ? 400 : 200;
    return res.status(status).json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).json({
      ok: false,
      prices: {},
      fetchedAt: new Date().toISOString(),
      error: message,
    });
  }
}
