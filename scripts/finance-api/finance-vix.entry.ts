import { CBOE_VIX_HISTORY_URL, parseCboeVixCsv, vixZone } from '../../src/lib/finance/vix';

type Req = { method?: string };
type Res = { status: (code: number) => Res; setHeader: (name: string, value: string) => void; json: (data: unknown) => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no admitido' });
  }
  try {
    const response = await fetch(CBOE_VIX_HISTORY_URL, {
      headers: { Accept: 'text/csv' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Fuente no disponible');
    const result = parseCboeVixCsv(await response.text());
    if (!result || result.stale) {
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      return res.status(503).json({ ok: false, error: 'El dato oficial no está actualizado.' });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=14400');
    return res.status(200).json({
      ok: true, indicator: 'VIX', ...result, zone: vixZone(result.value),
      source: 'Cboe', sourceUrl: CBOE_VIX_HISTORY_URL,
      frequency: 'daily-close', retrievedAt: new Date().toISOString(),
    });
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ ok: false, error: 'VIX de Cboe no disponible. No se muestran valores estimados.' });
  }
}
