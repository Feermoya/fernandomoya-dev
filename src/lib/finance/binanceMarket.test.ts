import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBinanceCryptoPrice, searchBinanceCrypto } from './binanceMarket';

afterEach(() => vi.unstubAllGlobals());

describe('Binance Spot integration', () => {
  it('reads ETHUSDT as a USD reference, preserving source and timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ symbol: 'ETHUSDT', price: '2243.125' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const row = await fetchBinanceCryptoPrice('ETH-USD', '2026-11-06T00:00:00Z');
    expect(fetchMock.mock.calls[0][0]).toContain('symbol=ETHUSDT');
    expect(row?.price).toBe(2243.125);
    expect(row?.source).toBe('binance');
    expect(row?.currency).toBe('USD');
    expect(row?.exchange).toContain('USDT');
  });

  it('refuses a missing or invalid price instead of inventing one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ symbol: 'ETHUSDT', price: '0' }),
    }));
    expect(await fetchBinanceCryptoPrice('ETH-USD', '2026-11-06T00:00:00Z')).toBeNull();
  });

  it('finds Ethereum by name and PEPE by symbol in active USDT Spot pairs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({
        symbols: [
          { baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING', isSpotTradingAllowed: true },
          { baseAsset: 'PEPE', quoteAsset: 'USDT', status: 'TRADING', isSpotTradingAllowed: true },
          { baseAsset: 'BOGUS', quoteAsset: 'BTC', status: 'TRADING', isSpotTradingAllowed: true },
          { baseAsset: 'OFF', quoteAsset: 'USDT', status: 'BREAK', isSpotTradingAllowed: true },
        ],
      }),
    }));
    expect((await searchBinanceCrypto('Ethereum'))[0]).toEqual({ symbol: 'ETH', name: 'Ethereum' });
    expect((await searchBinanceCrypto('PEPE'))[0]).toEqual({ symbol: 'PEPE', name: 'Pepe' });
    expect(await searchBinanceCrypto('BOGUS')).toEqual([]);
  });
});
