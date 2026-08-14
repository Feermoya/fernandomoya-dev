import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearMepCacheForTests,
  expectedArsExact,
  getMepQuote,
  parseDolaritoMep,
  pickMepSellValue,
  suggestedReceivedArs,
} from '@/lib/panel/exchange/mep';

describe('MEP helpers', () => {
  beforeEach(() => {
    clearMepCacheForTests();
    delete process.env.DOLARITO_AUTH_CLIENT;
  });

  it('elige venta cuando hay compra y venta', () => {
    expect(pickMepSellValue({ buy: 1500, sell: 1512.48 })).toBe(1512.48);
  });

  it('redondea monto sugerido a enteros', () => {
    expect(suggestedReceivedArs(45, 1512.48)).toBe(68062);
    expect(expectedArsExact(45, 1512.48)).toBe(68061.6);
  });

  it('parsea nodo mep de Dolarito con sell', () => {
    const parsed = parseDolaritoMep({
      mep: { buy: 1500, sell: 1512.48, timestamp: 1723651200 },
    });
    expect(parsed?.value).toBe(1512.48);
  });

  it('obtiene MEP desde dolarapi (fallback) y cachea', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            moneda: 'USD',
            casa: 'bolsa',
            compra: 1509.6,
            venta: 1521.6,
            fechaActualizacion: '2026-08-14T20:58:00.000Z',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ venta: 9999 }), { status: 200 }),
      );

    const first = await getMepQuote({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.quote.value).toBe(1521.6);
      expect(first.fromCache).toBe(false);
      expect(first.quote.source).toBe('dolarapi-bolsa');
    }

    const second = await getMepQuote({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.fromCache).toBe(true);
      expect(second.quote.value).toBe(1521.6);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fallback manual: error si la API falla', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await getMepQuote({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.ok).toBe(false);
  });
});
